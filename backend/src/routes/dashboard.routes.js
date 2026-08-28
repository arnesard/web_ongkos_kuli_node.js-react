const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const dashboardController = require("../controllers/dashboard/dashboardController");

router.get("/", verifyToken, dashboardController.index);

module.exports = router;
