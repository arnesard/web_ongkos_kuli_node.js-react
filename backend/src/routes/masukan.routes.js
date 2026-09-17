const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const masukan = require("../controllers/masukan/masukanController");

router.use(verifyToken);

router.get("/", masukan.list);
router.post("/", masukan.create);
router.delete("/:id", masukan.remove);

module.exports = router;
