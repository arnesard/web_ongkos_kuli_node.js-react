const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");

const performance = require("../controllers/management/performanceController");
const balanceCash = require("../controllers/management/balanceCashController");
const approve = require("../controllers/management/approveController");
const report = require("../controllers/management/reportController");

router.use(verifyToken);

router.get("/performance-kuli", performance.performanceKuli);
router.get("/balance-cash", balanceCash.balanceCash);
router.get("/approve-bongkarmuat", approve.list);
router.post("/approve-bongkarmuat/:no_doc", approve.process);
router.get("/transaksi-bs/:no_doc_b64", report.bsReport);
router.get("/transaksi-lpbs/:no_doc_b64", report.lpbsReport);

module.exports = router;
