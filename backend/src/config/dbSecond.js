const mysql = require("mysql2/promise");
require("dotenv").config();

// Pool ini nunjuk ke DATABASE KEDUA — sama persis dengan connection
// 'mysql_second' di config/database.php punya Laravel (data trip/shipment
// hasil replikasi Oracle, dipakai model App\Models\DataTrip / tabel
// gt_ora_shipment_trans). Ini SUMBER BEDA dari database utama (src/config/db.js).
//
// Kolom yang dipakai dari gt_ora_shipment_trans (lihat OngkosController::getTripData
// & public/js/getDataTrip.js di project Laravel):
//   no_trip, no_container, no_truk, cust_type, customer, region, qty_truk,
//   volume, weight, tire_qty, tube_qty, flap_qty, rimband_qty, valve_qty, other_qty

const poolSecond = mysql.createPool({
  host: process.env.DB_SECOND_HOST || "127.0.0.1",
  port: Number(process.env.DB_SECOND_PORT) || 3306,
  database: process.env.DB_SECOND_DATABASE || "database_orang",
  user: process.env.DB_SECOND_USERNAME || "root",
  password: process.env.DB_SECOND_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

module.exports = poolSecond;
