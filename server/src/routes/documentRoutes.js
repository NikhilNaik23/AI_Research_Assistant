const router = require("express").Router({ mergeParams: true });
const multer = require("multer");
const { protect } = require("../middleware/auth");
const { uploadDocument, listDocuments, deleteDocument } = require("../controllers/documentController");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(protect);
router.post("/", upload.single("file"), uploadDocument);
router.get("/", listDocuments);
router.delete("/:docId", deleteDocument);

module.exports = router;
