const mysql = require("mysql2/promise");
require("dotenv").config();

// Pool ini nunjuk ke database MySQL YANG SAMA dengan yang dipakai project
// Laravel (ongkos_kuli) — connection 'mysql' di config/database.php.
// Semua nama tabel & kolom di controller Node.js ini SENGAJA disamakan
// persis dengan Eloquent Model Laravel (lihat app/Models/*.php):
//
//   data_kuli_tbl                      (nik, nama_kuli, status, warehouse)
//   data_uang_makan_tbl                (tahun, harga_uang_makan)
//   data_barang_tbl                    (jenis, ongkos)
//   data_kendaraan_tbl                 (nama_kendaraan, biaya_truk, potongan_kuli)
//   data_user_tbl                      (nip, nama, level, user, email, warehouse, password)
//   data_bonsementara_tbl              (tgl, no_doc, uraian_kegiatan, nilai, act_nilai, status, warehouse)
//   data_transaksi_tbl                 (tgl, market, customer, kota, jam_bongkar, no_trip, qty_truk,
//                                        jenis_truk, pa, nopol, driver, jam_masuk, ket, id_kuli, warehouse)
//   data_transaksi_uangmakankuli_tbl   (tgl, id_kuli, warehouse)
//   data_transaksi_susunlantai_tbl     (tgl, kode_transaksi, id_kuli, pcs, jenis_truk, item, warehouse, kubikasi)
//   data_transaksi_pemindahanbarang_tbl(tgl, lokasi_awal, lokasi_tujuan, jenis_truk, ritase, nopol, driver,
//                                        biaya_retribusi, biaya_security, biaya_parkir, biaya_uangjalan, warehouse)
//   data_kota_tbl                      (customer, nama_kota, market)

const pool = mysql.createPool({
  host: process.env.DB_HOST || "10.129.78.240",
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_DATABASE || "ongkos_kuli",
  user: process.env.DB_USERNAME || "devbpw",
  password: process.env.DB_PASSWORD || "GTdevbpw@13579!",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // biar kolom DATE/DATETIME balik sebagai string "YYYY-MM-DD"
});

module.exports = pool;
