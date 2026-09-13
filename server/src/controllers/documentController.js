const Document = require("../models/Document");
const Chunk = require("../models/Chunk");
const Project = require("../models/Project");
const asyncHandler = require("../utils/asyncHandler");
const { extractText } = require("../utils/textExtract");
const { chunkText } = require("../utils/chunker");
const { embed } = require("../utils/ollama");

async function assertProjectOwnership(projectId, userId) {
  const project = await Project.findOne({ _id: projectId, owner: userId });
  if (!project) {
    const err = new Error("Project not found");
    err.statusCode = 404;
    throw err;
  }
  return project;
}

// Processes a document async: extract -> chunk -> embed -> store.
// Kept as a background job so the upload request returns immediately.
async function processDocument(documentId) {
  const doc = await Document.findById(documentId);
  try {
    const text = await extractText(doc._buffer, doc.mimeType, doc.filename);
    const chunks = chunkText(text);

    let i = 0;
    for (const chunkStr of chunks) {
      const embedding = await embed(chunkStr);
      await Chunk.create({
        project: doc.project,
        document: doc._id,
        text: chunkStr,
        embedding,
        chunkIndex: i++,
      });
    }

    doc.status = "ready";
    doc.chunkCount = chunks.length;
    await doc.save();
  } catch (err) {
    doc.status = "failed";
    doc.error = err.message;
    await doc.save();
  }
}

const uploadDocument = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  await assertProjectOwnership(projectId, req.user._id);

  if (!req.file) return res.status(400).json({ message: "No file uploaded (field name: file)" });

  const doc = await Document.create({
    project: projectId,
    uploadedBy: req.user._id,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    status: "processing",
  });

  // Buffer is only needed transiently for extraction; not persisted on the doc.
  doc._buffer = req.file.buffer;

  // Fire-and-forget background processing; client polls GET /documents for status.
  processDocument(doc._id).catch((e) => console.error("[document processing]", e));

  res.status(202).json({ message: "Upload received, processing started", document: doc });
});

const listDocuments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  await assertProjectOwnership(projectId, req.user._id);
  const docs = await Document.find({ project: projectId }).sort("-createdAt");
  res.json(docs);
});

const deleteDocument = asyncHandler(async (req, res) => {
  const { projectId, docId } = req.params;
  await assertProjectOwnership(projectId, req.user._id);
  await Chunk.deleteMany({ document: docId });
  await Document.findOneAndDelete({ _id: docId, project: projectId });
  res.json({ message: "Deleted" });
});

module.exports = { uploadDocument, listDocuments, deleteDocument };
