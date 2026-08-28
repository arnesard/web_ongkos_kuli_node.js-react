const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");

const performance = require("../controllers/management/performanceController");
const balanceCash = require("../controllers/management/balanceCashController");
const approve = require("../controllers/management/approveController");

router.use(verifyToken);

router.get("/performance-kuli", performance.performanceKuli);
router.get("/balance-cash", balanceCash.balanceCash);
router.get("/approve-bongkarmuat", approve.list);
router.post("/approve-bongkarmuat/:no_doc", approve.process);

module.exports = router;
