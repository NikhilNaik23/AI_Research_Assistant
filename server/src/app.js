const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { CLIENT_ORIGIN } = require("./config/env");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const documentRoutes = require("./routes/documentRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const researchRoutes = require("./routes/researchRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "research-assistant-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/documents", documentRoutes);
app.use("/api/projects/:projectId/conversations", conversationRoutes);
app.use("/api/projects/:projectId/research", researchRoutes);
app.use("/api/projects/:projectId/reports", reportRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
