const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");

const bonSementara = require("../controllers/entry-reguler/bonSementaraController");
const muatFg = require("../controllers/entry-reguler/muatFgController");
const bongkarRm = require("../controllers/entry-reguler/bongkarRmController");

router.use(verifyToken);

// --- Bon Sementara ---
router.get("/bon-sementara", bonSementara.list);
router.post("/bon-sementara", bonSementara.create);
router.put("/bon-sementara/:id", bonSementara.update);
router.delete("/bon-sementara/:id", bonSementara.remove);
router.post("/bon-sementara/input-aktual", bonSementara.inputAktual);

// --- Muat FG ---
router.get("/muat-fg", muatFg.list);
router.post("/muat-fg", muatFg.create);
router.put("/muat-fg/:id", muatFg.update);
router.delete("/muat-fg/:id", muatFg.remove);

// --- Bongkar RM ---
router.get("/bongkar-rm", bongkarRm.list);
router.post("/bongkar-rm", bongkarRm.create);
router.put("/bongkar-rm/:id", bongkarRm.update);
router.delete("/bongkar-rm/:id", bongkarRm.remove);

module.exports = router;
