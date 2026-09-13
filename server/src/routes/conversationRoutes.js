const router = require("express").Router({ mergeParams: true });
const { protect } = require("../middleware/auth");
const {
  createConversation, listConversations, getMessages, askAI,
} = require("../controllers/conversationController");

router.use(protect);
router.post("/", createConversation);
router.get("/", listConversations);
router.get("/:conversationId/messages", getMessages);
router.post("/:conversationId/ask", askAI); // SSE streaming response

module.exports = router;
