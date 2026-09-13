const Report = require("../models/Report");
const Project = require("../models/Project");
const asyncHandler = require("../utils/asyncHandler");
const { renderReportToPdf } = require("../utils/pdfExport");
const { translateMarkdown } = require("../utils/translation");

async function findOwnedReport(reportId, userId) {
  const report = await Report.findById(reportId).populate("project");
  if (!report || String(report.project.owner) !== String(userId)) return null;
  return report;
}

const listReports = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findOne({ _id: projectId, owner: req.user._id });
  if (!project) return res.status(404).json({ message: "Project not found" });

  const reports = await Report.find({ project: projectId }).sort("-createdAt");
  res.json(reports);
});

const getReport = asyncHandler(async (req, res) => {
  const report = await findOwnedReport(req.params.reportId, req.user._id);
  if (!report) return res.status(404).json({ message: "Report not found" });
  res.json(report);
});

const exportMarkdown = asyncHandler(async (req, res) => {
  const report = await findOwnedReport(req.params.reportId, req.user._id);
  if (!report) return res.status(404).json({ message: "Report not found" });

  res.setHeader("Content-Type", "text/markdown");
  res.setHeader("Content-Disposition", `attachment; filename="${report.topic.replace(/\s+/g, "_")}.md"`);
  res.send(report.markdown);
});

const exportPdf = asyncHandler(async (req, res) => {
  const report = await findOwnedReport(req.params.reportId, req.user._id);
  if (!report) return res.status(404).json({ message: "Report not found" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${report.topic.replace(/\s+/g, "_")}.pdf"`);
  renderReportToPdf(report, res);
});

const translateReport = asyncHandler(async (req, res) => {
  const report = await findOwnedReport(req.params.reportId, req.user._id);
  if (!report) return res.status(404).json({ message: "Report not found" });

  const { targetLanguage, sourceLanguage = "auto", provider } = req.body || {};
  if (!targetLanguage || !String(targetLanguage).trim()) {
    return res.status(400).json({ message: "targetLanguage is required" });
  }

  try {
    const translatedMarkdown = await translateMarkdown(report.markdown, targetLanguage, sourceLanguage, provider);
    return res.json({
      reportId: report._id,
      originalLanguage: sourceLanguage,
      targetLanguage,
      markdown: translatedMarkdown,
      provider,
    });
  } catch (err) {
    return res.status(502).json({
      message: "Translation service unavailable",
      detail: err.message,
    });
  }
});

module.exports = { listReports, getReport, exportMarkdown, exportPdf, translateReport };
