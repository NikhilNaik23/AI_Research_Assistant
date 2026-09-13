const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New Conversation" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", ConversationSchema);
