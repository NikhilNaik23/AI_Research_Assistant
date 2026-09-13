const { searchWeb } = require("../utils/webSearch");
const { retrieveRelevantChunks } = require("../utils/vectorStore");
const { chatJSON } = require("../utils/ollama");
const { RESEARCHER_SYSTEM_PROMPT } = require("./prompts");
const { TOP_K_WEB_RESULTS, TOP_K_RAG_CHUNKS } = require("../config/env");

// Agent 2 - Researcher. Gathers from the web and/or project documents (RAG),
// dedupes, ranks, and turns raw material into structured notes.

function dedupeByUrl(results) {
  const seen = new Set();
  return results.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

async function gather({ projectId, queries, useWebSearch = true, useProjectDocs = true, project = null }) {
  const webResults = [];
  const ragResults = [];

  const searchTasks = queries.map(async (query) => {
    const localWeb = [];
    const localRag = [];

    if (useWebSearch) {
      try {
        const results = await searchWeb(query, TOP_K_WEB_RESULTS, project);
        localWeb.push(...results);
      } catch (err) {
        console.warn(`[researcher] web search failed for "${query}":`, err.message);
      }
    }

    if (useProjectDocs && projectId) {
      try {
        const chunks = await retrieveRelevantChunks(projectId, query, TOP_K_RAG_CHUNKS);
        localRag.push(...chunks);
      } catch (err) {
        console.warn(`[researcher] RAG retrieval failed for "${query}":`, err.message);
      }
    }

    return { localWeb, localRag };
  });

  const perQueryResults = await Promise.all(searchTasks);
  for (const item of perQueryResults) {
    webResults.push(...item.localWeb);
    ragResults.push(...item.localRag);
  }

  const topSources = dedupeByUrl(webResults).slice(0, TOP_K_WEB_RESULTS);

  if (topSources.length === 0 && ragResults.length === 0) {
    return { topSources: [], notes: [] };
  }

  const materialForModel = {
    webSources: topSources.map((s, i) => ({
      rank: i + 1,
      title: s.title,
      url: s.url,
      snippet: s.snippet,
    })),
    documentExcerpts: ragResults.map((r) => ({ source: r.source, text: r.text })),
  };

  const { notes } = await chatJSON([
    { role: "system", content: RESEARCHER_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Research queries: ${JSON.stringify(queries)}\n\nAvailable material:\n${JSON.stringify(materialForModel)}`,
    },
  ], { numPredict: 12000 });

  return {
    topSources,
    notes: notes || [],
  };
}

module.exports = { gather };
