const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const lookup = require("../controllers/helpers/lookupController");

router.use(verifyToken);

router.get("/customer", lookup.customer);
router.get("/kuli-list", lookup.kuliList);
router.get("/get-last-kode", lookup.getLastKode);
router.get("/get-trip-data", lookup.getTripData);

module.exports = router;
