const express = require("express");
const router = express.Router();
const { authUser } = require("../middlewares/authMiddleWare");
const reactionsController = require("../controllers/reactionsController");

router.get("/:type/:messageId", authUser, reactionsController.getReactions);

//type is either gc or dm
router.post("/:type/:messageId", authUser, reactionsController.sendReaction);

router.delete("/:type/:messageId", authUser, reactionsController.removeReaction);


module.exports = router;