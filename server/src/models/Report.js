const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    researchTask: { type: mongoose.Schema.Types.ObjectId, ref: "ResearchTask", required: true },
    topic: { type: String, required: true },
    markdown: { type: String, required: true },
    sections: { type: mongoose.Schema.Types.Mixed, default: {} },
    sources: { type: [mongoose.Schema.Types.Mixed], default: [] },
    reviewNotes: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
