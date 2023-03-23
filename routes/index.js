const express = require("express");
const router = express.Router();
const calls = require("./calls");
const status = require("./status");
const user = require("./user");
const directMessage = require("./directMessages");
const group = require("./group");
const reactions = require("./reactions");
const google = require("../authProviders/google");

router.use("/api/v1/user", user);
router.use("/api/v1/calls", calls);
router.use("/api/v1/status", status);
router.use("/api/v1/chats", directMessage);
router.use("/api/v1/groups", group);
router.use("/api/v1/reactions", reactions);
router.use("/api/v1/google", google);

module.exports = router;