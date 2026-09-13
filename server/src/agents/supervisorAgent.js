const { chatJSON } = require("../utils/ollama");
const { SUPERVISOR_PLAN_PROMPT, SUPERVISOR_DECIDE_PROMPT } = require("./prompts");

function normalizeGoal(goal = "") {
  return String(goal || "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFallbackPlan(goal) {
  const cleanGoal = normalizeGoal(goal);
  const loweredGoal = cleanGoal.toLowerCase();

  const hasDinosaur = /dinosaur|paleontology|fossil|prehistoric/.test(loweredGoal);
  const hasMentalHealth = /mental health|health|wellbeing|well-being|psychology|depression|anxiety/.test(loweredGoal);
  const hasScience = /physics|chemistry|biology|mathematics|formula|computer science|algorithm|ai|machine learning/.test(loweredGoal);

  let queries = [cleanGoal];
  let outline = [
    "Introduction and context",
    "Definitions, origins, and core concepts",
    "Evidence, history, methods, and main developments",
    "Impacts, examples, and applications",
    "Challenges, risks, and future work",
    "Conclusion",
  ];
  let questions = [
    "What is the topic and why does it matter?",
    "What major evidence and historical developments explain it?",
    "What is the current state of research or practice?",
    "What are the main impacts, risks, and future directions?",
  ];
  let reportFocus = "A research report grounded in topic context, evidence, developments, and future directions.";
  let reasoning = "Generated automatically from the research goal because the topic needs a subject-aware outline.";

  if (hasDinosaur) {
    queries = [
      `${cleanGoal} origin and early dinosaur lineages`,
      `${cleanGoal} fossil geography, eras, and continents`,
      `${cleanGoal} extinction theories and major dinosaur groups`,
      `${cleanGoal} surviving birds and modern evidence`,
    ];
    outline = [
      "Origins and early dinosaur lineages",
      "Geological eras and dinosaur diversity",
      "Fossil geography by continent and country",
      "Extinction theories and ecosystem collapse",
      "Surviving bird lineages and modern evidence",
      "Conclusion and future research direction",
    ];
    questions = [
      "How did dinosaurs originate and what were the earliest lineages?",
      "Which dinosaur groups lived in which eras and regions?",
      "How did dinosaurs become extinct or disappear from the fossil record?",
      "What evidence links birds to dinosaur ancestry?",
    ];
    reportFocus = "Dinosaurs, origin, evolutionary path, fossil geography, diversity by era, extinction, and surviving avian lineages.";
    reasoning = "The request is paleontology-focused and needs topic-specific regional and lineage questions.";
  } else if (hasMentalHealth) {
    queries = [
      `${cleanGoal} history and definitions`,
      `${cleanGoal} causes, symptoms, and age-group impacts`,
      `${cleanGoal} interventions and prevention`,
      `${cleanGoal} field impacts and future research`,
    ];
    outline = [
      "Historical context and definitions",
      "Causes, symptoms, and population impact",
      "Interventions and prevention",
      "Field-specific impact and demographics",
      "Future research and conclusion",
    ];
    questions = [
      "How has the topic developed over time?",
      "Which age groups and settings are most affected?",
      "What interventions or prevention models are used?",
      "What future research gaps remain?",
    ];
    reportFocus = "Mental-health topic context, causes, population impact, intervention evidence, and prevention directions.";
    reasoning = "The request is health-focused and needs an evidence map for context, impact, intervention, and future work.";
  } else if (hasScience) {
    queries = [
      `${cleanGoal} definitions and main theories`,
      `${cleanGoal} experiments, evidence, and applications`,
      `${cleanGoal} problems, evidence gaps, and formulas`,
      `${cleanGoal} future research and limitations`,
    ];
    outline = [
      "Definitions and conceptual background",
      "Theory, formulas, and key evidence",
      "Methods, applications, and field impact",
      "Open questions, limitations, and future directions",
      "Conclusion",
    ];
    questions = [
      "What is the core concept and how is it defined?",
      "Which formulas, models, or experiments support the topic?",
      "How is the topic applied across fields or systems?",
      "What open questions and future research directions remain?",
    ];
    reportFocus = "Subject-specific evidence, theory, evidence structures, applications, and future research directions.";
    reasoning = "The request is science or technical-topic focused and should generate the section chain from the subject itself.";
  }

  return {
    queries,
    reportFocus,
    reasoning,
    outline,
    questions,
  };
}

// Agent 1 - Supervisor. Orchestrator only: it never researches or writes,
// it just plans the workflow and decides whether to iterate.
async function planWorkflow(goal) {
  try {
    const plan = await chatJSON([
      { role: "system", content: SUPERVISOR_PLAN_PROMPT },
      { role: "user", content: `Research goal: "${goal}"` },
    ]);

    if (!Array.isArray(plan.queries) || plan.queries.length === 0) {
      return buildFallbackPlan(goal);
    }

    if (!Array.isArray(plan.outline)) {
      plan.outline = buildFallbackPlan(goal).outline;
    }
    if (!Array.isArray(plan.questions)) {
      plan.questions = buildFallbackPlan(goal).questions;
    }
    if (!plan.reportFocus) {
      plan.reportFocus = buildFallbackPlan(goal).reportFocus;
    }
    if (!plan.reasoning) {
      plan.reasoning = buildFallbackPlan(goal).reasoning;
    }

    return plan;
  } catch (err) {
    return buildFallbackPlan(goal);
  }
}

async function decideNextStep(goal, reviewerOutput, iterationsRemaining) {
  if (iterationsRemaining <= 0) {
    return { continue: false, followUpQueries: [], reasoning: "Max iterations reached." };
  }

  const decision = await chatJSON([
    { role: "system", content: SUPERVISOR_DECIDE_PROMPT },
    {
      role: "user",
      content: `Research goal: "${goal}"\nReviewer output:\n${JSON.stringify(reviewerOutput)}`,
    },
  ]);

  return decision;
}

module.exports = { planWorkflow, decideNextStep };
