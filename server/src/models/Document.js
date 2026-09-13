const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
    chunkCount: { type: Number, default: 0 },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
