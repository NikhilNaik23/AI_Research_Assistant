const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Project = require("../models/Project");
const asyncHandler = require("../utils/asyncHandler");
const { retrieveRelevantChunks } = require("../utils/vectorStore");
const { searchWeb } = require("../utils/webSearch");
const { chatStream } = require("../utils/ollama");
const { TOP_K_RAG_CHUNKS, TOP_K_WEB_RESULTS } = require("../config/env");

async function assertProjectOwnership(projectId, userId) {
  const project = await Project.findOne({ _id: projectId, owner: userId });
  if (!project) {
    const err = new Error("Project not found");
    err.statusCode = 404;
    throw err;
  }
}

const createConversation = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  await assertProjectOwnership(projectId, req.user._id);
  const conversation = await Conversation.create({
    project: projectId,
    owner: req.user._id,
    title: req.body.title || "New Conversation",
  });
  res.status(201).json(conversation);
});

const listConversations = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  await assertProjectOwnership(projectId, req.user._id);
  const conversations = await Conversation.find({ project: projectId }).sort("-createdAt");
  await Promise.all(conversations.map(async (conversation) => {
    if (conversation.title !== "New Conversation") return;
    const firstUserMessage = await Message.findOne({ conversation: conversation._id, role: "user" }).sort("createdAt");
    if (firstUserMessage) {
      conversation.title = firstUserMessage.content.trim().replace(/\s+/g, " ").slice(0, 80);
      await conversation.save();
    }
  }));
  res.json(conversations);
});

const getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.conversationId,
    project: req.params.projectId,
    owner: req.user._id,
  });
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  const messages = await Message.find({ conversation: conversation._id }).sort("createdAt");
  res.json(messages);
});

// "Ask AI" endpoint: RAG over project docs + optional web search + streamed
// LLM answer over SSE. Mirrors the Ask AI / Use Files / Web Search flow.
const askAI = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { message, useFiles = false, useWebSearch = true } = req.body;
  if (!message) return res.status(400).json({ message: "message is required" });

  const conversation = await Conversation.findOne({ _id: conversationId, owner: req.user._id });
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });

  const project = await Project.findOne({ _id: conversation.project, owner: req.user._id });
  if (!project) return res.status(404).json({ message: "Project not found" });

  const previousMessages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();
  previousMessages.reverse();

  const hasUserMessage = await Message.exists({ conversation: conversationId, role: "user" });
  await Message.create({ conversation: conversationId, role: "user", content: message });
  if (!hasUserMessage && conversation.title === "New Conversation") {
    conversation.title = message.trim().replace(/\s+/g, " ").slice(0, 80);
    await conversation.save();
  }

  const sources = [];
  let contextBlocks = [];

  if (useFiles) {
    const chunks = await retrieveRelevantChunks(conversation.project, message, TOP_K_RAG_CHUNKS);
    chunks.forEach((c) => sources.push({ title: c.source, origin: "document" }));
    contextBlocks.push(...chunks.map((c) => `[Document: ${c.source}]\n${c.text}`));
  }

  if (useWebSearch) {
    const webResults = await searchWeb(`${message} recent case studies evidence`, TOP_K_WEB_RESULTS, project);
    webResults.forEach((r) => sources.push({ title: r.title, url: r.url, origin: "web" }));
    contextBlocks.push(...webResults.map((r) => `[Web: ${r.title} (${r.url})]\n${r.snippet}`));
  }

  const projectContext = [
    `Project title: ${project.title}`,
    project.description ? `Project description: ${project.description}` : "Project description: Not provided.",
  ].join("\n");
  const history = previousMessages
    .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content}`)
    .join("\n\n")
    .slice(0, 12000);
  const systemPrompt = `You are a helpful research assistant working inside a project.
Use the project title and description to understand the subject and keep answers relevant to it.
Use only the messages in this conversation to maintain continuity and answer follow-up questions.
Do not use or imply knowledge from other conversations in the project.
Format answers for quick reading: use Markdown headings for sections, bold key terms, and __underline important takeaways__. Do not wrap answers in triple quotes or code fences.
Use the provided document/web context when relevant. If the available context does not support an answer, say so plainly rather than guessing.

Project context:
${projectContext}

Previous conversation:
${history || "No previous messages."}

Retrieved context:
${contextBlocks.join("\n\n").slice(0, 10000)}`;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let fullAnswer = "";
  try {
    fullAnswer = await chatStream(
      [
        { role: "system", content: systemPrompt },
        ...previousMessages.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: message },
      ],
      (token) => res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`)
    );
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    return res.end();
  }

  const assistantMessage = await Message.create({
    conversation: conversationId,
    role: "assistant",
    content: fullAnswer,
    sources,
  });

  res.write(`event: done\ndata: ${JSON.stringify({ message: assistantMessage, sources })}\n\n`);
  res.end();
});

module.exports = { createConversation, listConversations, getMessages, askAI };
