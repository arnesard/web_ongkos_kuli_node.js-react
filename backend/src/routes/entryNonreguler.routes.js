const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");

const uangMakan = require("../controllers/entry-nonreguler/uangMakanController");
const susunTire = require("../controllers/entry-nonreguler/susunTireController");
const pemindahanBarang = require("../controllers/entry-nonreguler/pemindahanBarangController");

router.use(verifyToken);

// --- Uang Makan ---
router.get("/uang-makan/export", uangMakan.exportCsv); // taruh sebelum /:id biar "export" gak ketangkep sebagai id
router.get("/uang-makan", uangMakan.list);
router.post("/uang-makan", uangMakan.create);
router.put("/uang-makan/:id", uangMakan.update);
router.delete("/uang-makan/:id", uangMakan.remove);

// --- Susun Tire ---
router.get("/susun-tire/last-kode", susunTire.getLastKode);
router.get("/susun-tire/export", susunTire.exportCsv);
router.get("/susun-tire", susunTire.list);
router.post("/susun-tire", susunTire.create);
router.put("/susun-tire/:id", susunTire.update);
router.delete("/susun-tire/:id", susunTire.remove);

// --- Pemindahan Barang ---
router.get("/pemindahan-barang/export", pemindahanBarang.exportCsv);
router.get("/pemindahan-barang", pemindahanBarang.list);
router.post("/pemindahan-barang", pemindahanBarang.create);
router.put("/pemindahan-barang/:id", pemindahanBarang.update);
router.delete("/pemindahan-barang/:id", pemindahanBarang.remove);

module.exports = router;
