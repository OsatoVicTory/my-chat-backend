const express = require("express");
const router = express.Router();
const { authUser } = require("../middlewares/authMiddleWare");
const userController = require("../controllers/userController");
// const forgotpasswordController = require("../controller/forgotpasswordController");
// const passwordresetController = require("../controller/resetpasswordController");
// const mailServices = require("../controller/mailsController");

//if user tries to log in but has not been verified by mail
//send verification mail to user, else we would have returned from the functions call;
router.get("/fix", authUser, userController.fix);
router.post("/login", userController.logInUser);

router.post("/signup", userController.signUpUser);

router.get("/verify-account/:token", userController.verifyAccount);

router.get("/user-logged-in", authUser, userController.userLoggedIn);

//user is logged in but want to change his password
//dont remove authUser
// router.post("/reset-password", authUser, passwordresetController.resetPassword);

router.post("/update-account", authUser, userController.updateAccount);

router.get("/logout", userController.logOutUser);

router.post("/update-contacts", authUser, userController.updateContacts);

router.post("/who-views-status", authUser, userController.updateWhoViewsMyStatus);

router.get('/last-check/:type', authUser, userController.lastCheck);

router.get("/clear-call-logs", authUser, userController.clearCallLogs);

router.get("/contacts", authUser, userController.getContactsImages);

router.post("/share-link", authUser, userController.shareLink);

router.post("/forward-message", authUser, userController.forwardMessage);

router.get("/search-users/:search", authUser, userController.searchUsers);

module.exports = router;