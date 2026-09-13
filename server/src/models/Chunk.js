const mongoose = require("mongoose");

// Stores a chunk of text plus its embedding vector for brute-force
// cosine-similarity RAG retrieval. Fine for small/medium corpora;
// swap for a real vector DB (e.g. Qdrant/Milvus) at scale.
const ChunkSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    chunkIndex: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chunk", ChunkSchema);
