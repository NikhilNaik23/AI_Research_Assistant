const ResearchTask = require("../models/ResearchTask");
const Project = require("../models/Project");
const asyncHandler = require("../utils/asyncHandler");
const orchestrator = require("../agents/orchestrator");
const sse = require("../utils/sse");
const { MAX_RESEARCH_ITERATIONS } = require("../config/env");

async function assertProjectOwnership(projectId, userId) {
  const project = await Project.findOne({ _id: projectId, owner: userId });
  if (!project) {
    const err = new Error("Project not found");
    err.statusCode = 404;
    throw err;
  }
}

// Kicks off the Supervisor -> Researcher -> Writer -> Reviewer pipeline.
// Returns immediately with a taskId; progress streams over SSE at
// GET /api/research/:taskId/stream
const startResearch = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { goal, useWebSearch = true, useProjectDocs = true, maxIterations } = req.body;
  if (!goal) return res.status(400).json({ message: "goal is required" });

  await assertProjectOwnership(projectId, req.user._id);

  const task = await ResearchTask.create({
    project: projectId,
    owner: req.user._id,
    goal,
    useWebSearch,
    useProjectDocs,
    maxIterations: maxIterations || MAX_RESEARCH_ITERATIONS,
  });

  orchestrator.runPipeline(task._id).catch((e) => console.error("[pipeline]", e));

  res.status(202).json({ message: "Research started", taskId: task._id });
});

const streamResearch = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const task = await ResearchTask.findOne({ _id: taskId, project: projectId, owner: req.user._id });
  if (!task) return res.status(404).json({ message: "Task not found" });
  sse.subscribe(taskId, res);
});

const getTask = asyncHandler(async (req, res) => {
  const task = await ResearchTask.findOne({ _id: req.params.taskId, owner: req.user._id }).populate("finalReport");
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json(task);
});

const listTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  await assertProjectOwnership(projectId, req.user._id);
  const tasks = await ResearchTask.find({ project: projectId }).sort("-createdAt");
  tasks
    .filter((task) => ["queued", "planning", "researching", "writing", "reviewing"].includes(task.status))
    .forEach((task) => orchestrator.runPipeline(task._id).catch((err) => console.error("[pipeline recovery]", err)));
  res.json(tasks);
});

module.exports = { startResearch, streamResearch, getTask, listTasks };
