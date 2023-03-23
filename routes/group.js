const express = require("express");
const router = express.Router();
const { authUser } = require("../middlewares/authMiddleWare");
const messagesController = require("../controllers/groupMessages");
const groupController = require("../controllers/groupChatController");

router.post("/create-group", authUser, groupController.createGroup);

router.post("/update-description/:id", authUser, groupController.updateDescription);

router.get("/make-admin/:id/:userId", authUser, groupController.makeAdmin);

router.post("/add-user/:id", authUser, groupController.addUserToGroup);

router.get("/join-group-link/:id", authUser, groupController.joinGroupLink);

router.get("/exit-group", authUser, groupController.exitGroup);

router.get("/all-GC", authUser, messagesController.getAllUserGroupMessages);

router.get("/specific-GC/:targetGroupRefId/:userLastView", authUser, messagesController.getSpecificGroupMessages);

router.get("/read-GC/:targetRefId", authUser, messagesController.readGroupMessages);

router.get("/left-group-page/:targetGroupRefId", authUser, messagesController.leftGroupPage);

router.post("/send-group-message", authUser, messagesController.sendGroupMessage);

router.post("/for-me", authUser, messagesController.deleteGroupMessagesForMe);

router.delete("/one-for-all/:id", authUser, messagesController.deleteOneGroupMessageForAll);

router.delete("/clear-GCs-for-me/:targetGroupRefId", authUser, messagesController.deleteAllGroupMessagesForMe);

router.get("/readers/:id", authUser, messagesController.getAllGroupMessageReaders);

router.get("/fetch-group-account/:id", authUser, messagesController.fetchGroupAccount);

router.get("/fetch-group-images-and-participants/:id", authUser, messagesController.fetchGroupImagesAndParticipants);

module.exports = router;