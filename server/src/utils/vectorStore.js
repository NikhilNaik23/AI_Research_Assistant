const Chunk = require("../models/Chunk");
const { embed } = require("./ollama");

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Brute-force cosine-similarity retrieval over a project's chunks.
// Good enough for an MVP-scale corpus; swap for a real vector DB later.
async function retrieveRelevantChunks(projectId, query, topK = 6) {
  const queryEmbedding = await embed(query);
  const chunks = await Chunk.find({ project: projectId }).populate("document", "filename");

  const scored = chunks.map((c) => ({
    chunk: c,
    score: cosineSimilarity(queryEmbedding, c.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(({ chunk, score }) => ({
    text: chunk.text,
    source: chunk.document?.filename || "project document",
    score,
  }));
}

module.exports = { retrieveRelevantChunks, cosineSimilarity };
