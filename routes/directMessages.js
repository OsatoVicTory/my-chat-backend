const express = require("express");
const router = express.Router();
const { authUser } = require("../middlewares/authMiddleWare");
const messagesController = require("../controllers/directMessages");


router.get("/all-DMs", authUser, messagesController.getAllUserDirectMessages);

router.get("/get-user-details/:id", authUser, messagesController.getUserDetails);

router.get("/specific-DM/:id", authUser, messagesController.getSpecificDirectMessages);

router.get("/read-DM/:id", authUser, messagesController.readDirectMessages);

router.post("/send-DM", authUser, messagesController.sendDirectMessage);

router.post("/delete-DM-for-me", authUser, messagesController.deleteSpecificDirectMessagesForMe);

router.delete("/delete-all-DM-for-me/:id", authUser, messagesController.deleteAllDirectMessagesForMe);

router.delete("/delete-one-DM-for-all/:messageId", authUser, messagesController.deleteOneDirectMessageForAll);

router.get("/fetch-user-account/:id", authUser, messagesController.fetchUserAccount);

router.get("/fetch-chats-images/:id", authUser, messagesController.fetchChatsImages);

module.exports = router;