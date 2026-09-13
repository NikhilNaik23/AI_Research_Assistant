const ResearchTask = require("../models/ResearchTask");
const Report = require("../models/Report");
const Project = require("../models/Project");
const sse = require("../utils/sse");
const supervisor = require("./supervisorAgent");
const researcher = require("./researcherAgent");
const writer = require("./writerAgent");
const reviewer = require("./reviewerAgent");
const { MAX_RESEARCH_ITERATIONS } = require("../config/env");
const activeTasks = new Set();

function appendReferences(markdown, sources) {
  if (!sources.length || /(^|\n)#{1,3}\s+references\s*$/im.test(markdown)) return markdown;
  const references = sources
    .map((source, index) => `${index + 1}. [${source.title || source.url}](${source.url})`)
    .join("\n");
  return `${markdown.trim()}\n\n## References\n\n${references}`;
}

async function log(task, event, data = {}) {
  task.log.push({ ts: new Date(), event, data });
  await task.save();
  sse.emit(String(task._id), event, data);
}

async function setStatus(task, status) {
  task.status = status;
  await task.save();
  sse.emit(String(task._id), "status", { status });
}

// Runs the full Supervisor -> Researcher -> Writer -> Reviewer pipeline for
// a ResearchTask document, iterating when the Reviewer flags gaps.
// Intended to be called fire-and-forget from the controller; all progress
// is persisted on the task and streamed over SSE so the client can follow along.
async function runPipeline(taskId) {
  const task = await ResearchTask.findById(taskId);
  if (!task) throw new Error("ResearchTask not found");
  const taskKey = String(task._id);
  if (activeTasks.has(taskKey)) return null;
  activeTasks.add(taskKey);

  try {
    const project = await Project.findById(task.project).lean();

    // ---- Supervisor: plan ----
    await setStatus(task, "planning");
    const plan = await supervisor.planWorkflow(task.goal);
    task.plan = plan;
    await task.save();
    await log(task, "plan_ready", plan);

    let queries = Array.isArray(plan.queries) ? plan.queries : [task.goal];
    const outline = Array.isArray(plan.outline) ? plan.outline : [];
    const questions = Array.isArray(plan.questions) ? plan.questions : [];
    let draft = null;
    let lastNotes = [];
    let lastSources = [];
    let lastReview = null;

    const maxIterations = task.maxIterations || MAX_RESEARCH_ITERATIONS;

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      task.currentIteration = iteration;
      await task.save();
      await log(task, "iteration_start", { iteration, queries });

      // ---- Researcher ----
      await setStatus(task, "researching");
      const { topSources, notes } = await researcher.gather({
        projectId: task.project,
        queries,
        useWebSearch: task.useWebSearch,
        useProjectDocs: task.useProjectDocs,
        project,
      });
      lastNotes = notes;
      lastSources = topSources;
      await log(task, "research_done", { sourceCount: topSources.length, noteCount: notes.length, topSources, notes });

      if (topSources.length === 0 && notes.length === 0) {
        await setStatus(task, "failed");
        await log(task, "error", { message: "No research sources were available for the requested goal." });
        task.status = "failed";
        task.error = "No research sources were available for the requested goal.";
        await task.save();

        const fallbackReport = await Report.create({
          project: task.project,
          researchTask: task._id,
          topic: task.goal,
          markdown: `# Research Report\n\nNo research sources were available for the requested goal.\n\n## Goal\n\n${task.goal || "Research task"}\n\nThe search path and document retrieval returned no usable evidence. Add web sources or upload project documents before retrying.`,
          sections: {
            introduction: "The research run did not find any usable source material.",
            background: "No web or document evidence was available to build a grounded report.",
            methodology: "No sources were gathered, so the task could not continue with evidence synthesis.",
            advantages: "",
            disadvantages: "",
            applications: "",
            futureWork: "Use web search or project documents to gather relevant evidence.",
            conclusion: "The current run ended without a source-backed report because no evidence was available.",
          },
          sources: [],
          reviewNotes: { approved: true, issues: [], summary: "No notes were produced because no sources were found." },
        });

        task.finalReport = fallbackReport._id;
        task.status = "failed";
        await task.save();
        sse.emit(String(task._id), "completed", { reportId: fallbackReport._id });
        return fallbackReport;
      }

      // ---- Writer ----
      await setStatus(task, "writing");
      draft = await writer.write({
        goal: task.goal,
        notes,
        sources: topSources,
        previousDraft: draft,
        reviewerFeedback: lastReview,
        outline,
        questions,
      });
      await log(task, "draft_ready", { iteration });

      // ---- Reviewer ----
      await setStatus(task, "reviewing");
      const reviewResult = await reviewer.review({ goal: task.goal, report: draft, notes });
      lastReview = reviewResult;
      await log(task, "review_done", reviewResult);

      task.iterations.push({ iteration, queries, noteCount: notes.length, review: reviewResult });
      await task.save();

      const iterationsRemaining = maxIterations - iteration;
      const decision = await supervisor.decideNextStep(task.goal, reviewResult, iterationsRemaining);
      await log(task, "supervisor_decision", decision);

      if (!decision.continue) break;
      queries = decision.followUpQueries?.length ? decision.followUpQueries : reviewResult.followUpQueries;
      if (!queries || queries.length === 0) break;
    }

    // ---- Persist final report ----
    const report = await Report.create({
      project: task.project,
      researchTask: task._id,
      topic: task.goal,
      markdown: appendReferences(draft?.markdown || "No report generated.", lastSources),
      sections: draft?.sections || {},
      sources: lastSources,
      reviewNotes: lastReview,
    });

    task.finalReport = report._id;
    await setStatus(task, "completed");
    await log(task, "completed", { reportId: report._id });

    return report;
  } catch (err) {
    task.status = "failed";
    task.error = err.message;
    await task.save();
    sse.emit(String(task._id), "error", { message: err.message });
    throw err;
  } finally {
    activeTasks.delete(taskKey);
  }
}

module.exports = { runPipeline };
