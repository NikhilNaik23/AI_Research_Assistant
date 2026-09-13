const router = require("express").Router({ mergeParams: true });
const { protect } = require("../middleware/auth");
const { startResearch, streamResearch, getTask, listTasks } = require("../controllers/researchController");

router.get("/:taskId/stream", protect, streamResearch);
router.use(protect);
router.post("/", startResearch);
router.get("/", listTasks);
router.get("/:taskId", getTask);

module.exports = router;
