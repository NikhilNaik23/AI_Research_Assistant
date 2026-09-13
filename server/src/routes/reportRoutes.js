const router = require("express").Router({ mergeParams: true });
const { protect } = require("../middleware/auth");
const { listReports, getReport, exportMarkdown, exportPdf, translateReport } = require("../controllers/reportController");

router.use(protect);
router.get("/", listReports);
router.get("/:reportId", getReport);
router.get("/:reportId/export/markdown", exportMarkdown);
router.get("/:reportId/export/pdf", exportPdf);
router.post("/:reportId/translate", translateReport);

module.exports = router;
