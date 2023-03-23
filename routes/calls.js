const express = require("express");
const router = express.Router();
const { authUser } = require("../middlewares/authMiddleWare");
const callsController = require("../controllers/callsController");

router.get("/all-calls", authUser, callsController.getAllUserCalls);

router.get("/specific-call/:id", authUser, callsController.getSpecificCall);

router.post("/create-call", authUser, callsController.createCall);

module.exports = router;