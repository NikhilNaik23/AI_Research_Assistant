const Project = require("../models/Project");
const asyncHandler = require("../utils/asyncHandler");

const createProject = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ message: "title is required" });

  const project = await Project.create({ owner: req.user._id, title, description });
  res.status(201).json(project);
});

const listProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ owner: req.user._id }).sort("-createdAt");
  res.json(projects);
});

const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json(project);
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { $set: req.body },
    { new: true }
  );
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json(project);
});

const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json({ message: "Deleted" });
});

module.exports = { createProject, listProjects, getProject, updateProject, deleteProject };
