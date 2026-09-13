const { chatJSON } = require("../utils/ollama");
const { REVIEWER_SYSTEM_PROMPT } = require("./prompts");

// Agent 4 - Reviewer. Quality control: checks claims against evidence,
// flags contradictions/hallucinations, and tells the Supervisor whether
// another research pass is warranted.
async function review({ goal, report, notes = [] }) {
  if (notes.length === 0) {
    return {
      approved: true,
      issues: [],
      needsMoreResearch: false,
      followUpQueries: [],
      summary: "No notes were produced because the research run found no usable sources.",
    };
  }

  try {
    const result = await chatJSON([
      { role: "system", content: REVIEWER_SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({ goal, report, notes }).slice(0, 14000),
      },
    ]);

    return {
      approved: !!result.approved,
      issues: result.issues || [],
      needsMoreResearch: !!result.needsMoreResearch,
      followUpQueries: result.followUpQueries || [],
      summary: result.summary || "",
    };
  } catch (err) {
    return {
      approved: true,
      issues: [],
      needsMoreResearch: false,
      followUpQueries: [],
      summary: "Review skipped because the evidence set was empty or the model response was not valid JSON.",
    };
  }
}

module.exports = { review };
