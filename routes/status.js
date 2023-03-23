const express = require("express");
const router = express.Router();
const { authUser } = require("../middlewares/authMiddleWare");
const statusController = require("../controllers/statusController");

router.get("/", authUser, statusController.getAllStatusUpdates);

router.post("/", authUser, statusController.createStatusUpdate);

router.get("/:id", authUser, statusController.viewStatusUpdate);

router.delete("/:id", authUser, statusController.deleteStatusUpdate);

module.exports = router;