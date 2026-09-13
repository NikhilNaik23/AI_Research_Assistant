const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  createProject, listProjects, getProject, updateProject, deleteProject,
} = require("../controllers/projectController");

router.use(protect);
router.post("/", createProject);
router.get("/", listProjects);
router.get("/:id", getProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);

module.exports = router;
