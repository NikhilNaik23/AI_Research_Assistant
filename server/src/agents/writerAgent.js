const { chatJSON } = require("../utils/ollama");
const { WRITER_SYSTEM_PROMPT } = require("./prompts");

// Agent 3 - Writer. Synthesizes the Researcher's notes into a structured
// report. Never invents sources - only uses what the Researcher provided.
async function write({
  goal,
  notes = [],
  sources = [],
  previousDraft = null,
  reviewerFeedback = null,
  outline = [],
  questions = [],
}) {
  if (notes.length === 0 && sources.length === 0) {
    return {
      markdown: `# Research Report\n\nNo research sources were available for the requested goal.\n\n## Goal\n\n${goal || "Research task"}\n\nThe search path and document retrieval returned no usable evidence. Add web sources or upload project documents before retrying.`,
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
    };
  }

  const userContent = {
    goal,
    notes,
    sources: sources.map((source, index) => ({
      citation: index + 1,
      title: source.title,
      url: source.url,
    })),
    previousDraft,
    reviewerFeedback,
    outline,
    questions,
  };

  try {
    const result = await chatJSON([
      { role: "system", content: WRITER_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(userContent).slice(0, 14000) },
    ], { numPredict: 12000 });

    return result; // { markdown, sections }
  } catch (err) {
    return {
      markdown: `# Research Report\n\nThe model could not build a report from the available evidence.\n\n## Goal\n\n${goal || "Research task"}\n\nPlease add usable web sources or document excerpts and retry.`,
      sections: {
        introduction: "The model did not return a valid structured report.",
        background: "",
        methodology: "",
        advantages: "",
        disadvantages: "",
        applications: "",
        futureWork: "",
        conclusion: "The report ended in a safe fallback state because the evidence stream was incomplete.",
      },
    };
  }
}

module.exports = { write };
