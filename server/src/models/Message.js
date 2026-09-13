const mongoose = require("mongoose");

const SourceSchema = new mongoose.Schema(
  {
    title: String,
    url: String,
    origin: { type: String, enum: ["web", "document"], default: "web" },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    sources: { type: [SourceSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
