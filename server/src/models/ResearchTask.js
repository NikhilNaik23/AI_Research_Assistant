const mongoose = require("mongoose");

// Tracks one run of the Supervisor -> Researcher -> Writer -> Reviewer pipeline.
const ResearchTaskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    goal: { type: String, required: true },
    useWebSearch: { type: Boolean, default: true },
    useProjectDocs: { type: Boolean, default: true },

    status: {
      type: String,
      enum: ["queued", "planning", "researching", "writing", "reviewing", "completed", "failed"],
      default: "queued",
    },
    currentIteration: { type: Number, default: 0 },
    maxIterations: { type: Number, default: 2 },

    plan: { type: mongoose.Schema.Types.Mixed, default: null },
    iterations: { type: [mongoose.Schema.Types.Mixed], default: [] }, // per-iteration notes/review snapshots
    finalReport: { type: mongoose.Schema.Types.ObjectId, ref: "Report", default: null },

    error: { type: String, default: null },
    log: { type: [{ ts: Date, event: String, data: mongoose.Schema.Types.Mixed }], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResearchTask", ResearchTaskSchema);
