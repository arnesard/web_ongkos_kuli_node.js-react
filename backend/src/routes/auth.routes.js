const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth/authController");
const { verifyToken } = require("../middleware/auth");

router.post("/login", authController.login);
router.post("/logout", verifyToken, authController.logout);
router.get("/me", verifyToken, authController.me);

module.exports = router;
