var express = require("express");
var router = express.Router();
let messageController = require("../controllers/messages");
const { checkLogin } = require("../utils/authHandler");

// GET / - Get last message from each conversation
router.get("/", checkLogin, async function (req, res, next) {
  try {
    let conversations = await messageController.getLastMessages(req.user._id);
    res.send(conversations);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// GET /:userID - Get all messages between current user and specific user
router.get("/:userID", checkLogin, async function (req, res, next) {
  try {
    let messages = await messageController.getConversation(
      req.user._id,
      req.params.userID
    );
    res.send(messages);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// POST / - Create a new message
router.post("/", checkLogin, async function (req, res, next) {
  try {
    const { to, messageContent } = req.body;

    if (!to || !messageContent) {
      return res.status(400).send({ message: "to and messageContent are required" });
    }

    let message = await messageController.createMessage(
      req.user._id,
      to,
      messageContent
    );
    res.send(message);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

module.exports = router;
