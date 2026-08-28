const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");

const kuli = require("../controllers/master/kuliController");
const um = require("../controllers/master/umController");
const barang = require("../controllers/master/barangController");
const kendaraan = require("../controllers/master/kendaraanController");
const user = require("../controllers/master/userController");

router.use(verifyToken);

// --- Kuli --- (samain dengan /daftar-kuli, /kuli/store, /kuli/:id, dll di web.php)
router.get("/kuli", kuli.list);
router.post("/kuli", kuli.create);
router.put("/kuli/:id", kuli.update);
router.delete("/kuli/:id", kuli.remove);

// --- Harga Uang Makan ---
router.get("/um", um.list);
router.post("/um", um.create);
router.put("/um/:id", um.update);
router.delete("/um/:id", um.remove);

// --- Jenis Barang ---
router.get("/barang", barang.list);
router.post("/barang", barang.create);
router.put("/barang/:id", barang.update);
router.delete("/barang/:id", barang.remove);

// --- Kendaraan ---
router.get("/kendaraan", kendaraan.list);
router.post("/kendaraan", kendaraan.create);
router.put("/kendaraan/:id", kendaraan.update);
router.delete("/kendaraan/:id", kendaraan.remove);

// --- User ---
router.get("/user", user.list);
router.post("/user", user.create);
router.put("/user/:id", user.update);
router.delete("/user/:id", user.remove);

module.exports = router;
