const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth.routes"));
router.use("/master", require("./master.routes"));
router.use("/entry-reguler", require("./entryReguler.routes"));
router.use("/entry-nonreguler", require("./entryNonreguler.routes"));
router.use("/management", require("./management.routes"));
router.use("/dashboard", require("./dashboard.routes"));
router.use("/helpers", require("./helpers.routes"));

module.exports = router;
