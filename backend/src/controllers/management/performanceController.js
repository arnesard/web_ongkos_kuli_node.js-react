const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

function monthRange(bulan) {
  const [y, m] = bulan.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return [fmt(start), fmt(end)];
}

// GET /api/management/performance-kuli?bulan=YYYY-MM&start_tgl=&end_tgl=&nama_kuli=&warehouse=
// Samain dengan ManagementController::performanceKuli (share biaya trip/susun rata ke tiap kuli)
async function performanceKuli(req, res) {
  const { warehouse, isSuperUser, isHOD, isHighLevel } = warehouseScope(req.user);
  const { nama_kuli, warehouse: selectedWarehouse } = req.query;
  const bulan = req.query.bulan || new Date().toISOString().slice(0, 7);
  const [start, end] =
    req.query.start_tgl && req.query.end_tgl ? [req.query.start_tgl, req.query.end_tgl] : monthRange(bulan);

  const scopeWarehouse = isHighLevel ? selectedWarehouse : warehouse;

  try {
    // 1. Data kuli
    let kuliSql = "SELECT nik, nama_kuli FROM data_kuli_tbl WHERE 1=1";
    const kuliParams = [];
    if (scopeWarehouse) {
      kuliSql += " AND warehouse = ?";
      kuliParams.push(scopeWarehouse);
    }
    if (nama_kuli) {
      kuliSql += " AND nama_kuli LIKE ?";
      kuliParams.push(`%${nama_kuli}%`);
    }
    const [kulis] = await pool.query(kuliSql, kuliParams);

    // 2. Muat (join kendaraan) & Bongkar (join barang) — pendapatan dibagi rata per trip+ket
    const muatSql = `SELECT t.no_trip, t.id_kuli, k.biaya_truk, t.ket, t.qty_truk
      FROM data_transaksi_tbl t JOIN data_kendaraan_tbl k ON t.jenis_truk = k.nama_kendaraan
      WHERE t.tgl BETWEEN ? AND ? ${scopeWarehouse ? "AND t.warehouse = ?" : ""}`;
    const muatParams = scopeWarehouse ? [start, end, scopeWarehouse] : [start, end];
    const [muatRows] = await pool.query(muatSql, muatParams);

    const bongkarSql = `SELECT t.no_trip, t.id_kuli, k.ongkos, t.ket, t.qty_truk
      FROM data_transaksi_tbl t JOIN data_barang_tbl k ON t.jenis_truk = k.jenis
      WHERE t.tgl BETWEEN ? AND ? ${scopeWarehouse ? "AND t.warehouse = ?" : ""}`;
    const bongkarParams = scopeWarehouse ? [start, end, scopeWarehouse] : [start, end];
    const [bongkarRows] = await pool.query(bongkarSql, bongkarParams);

    const isJMW = scopeWarehouse === "JMW";
    const tripRows = isJMW ? bongkarRows : muatRows;
    const biayaKey = isJMW ? "ongkos" : "biaya_truk";

    const pendapatanMuat = {};
    const byTrip = {};
    tripRows.forEach((r) => {
      const key = r.no_trip + "|" + (r.ket ?? "");
      (byTrip[key] = byTrip[key] || []).push(r);
    });
    Object.values(byTrip).forEach((records) => {
      const sample = records[0];
      const qty = Number(String(sample.qty_truk ?? 0).replace(",", "."));
      const biaya = Number(String(sample[biayaKey] ?? 0).replace(",", "."));
      const total = biaya * qty;
      const share = records.length > 0 ? total / records.length : 0;
      records.forEach((r) => {
        pendapatanMuat[r.id_kuli] = (pendapatanMuat[r.id_kuli] || 0) + share;
      });
    });

    // 3. Uang makan
    const [umRow] = await pool.query("SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ?", [
      new Date().getFullYear(),
    ]);
    const hargaUM = umRow[0]?.harga_uang_makan || 0;

    const umSql = `SELECT id_kuli FROM data_transaksi_uangmakankuli_tbl WHERE tgl BETWEEN ? AND ? ${scopeWarehouse ? "AND warehouse = ?" : ""}`;
    const umParams = scopeWarehouse ? [start, end, scopeWarehouse] : [start, end];
    const [umRows] = await pool.query(umSql, umParams);
    const uangMakanMap = {};
    umRows.forEach((r) => (uangMakanMap[r.id_kuli] = (uangMakanMap[r.id_kuli] || 0) + hargaUM));

    // 4. Susun lantai
    const susunSql = `SELECT s.kode_transaksi, s.id_kuli, k.biaya_truk
      FROM data_transaksi_susunlantai_tbl s JOIN data_kendaraan_tbl k ON s.jenis_truk = k.nama_kendaraan
      WHERE s.tgl BETWEEN ? AND ? ${scopeWarehouse ? "AND s.warehouse = ?" : ""}`;
    const susunParams = scopeWarehouse ? [start, end, scopeWarehouse] : [start, end];
    const [susunRows] = await pool.query(susunSql, susunParams);
    const pendapatanSusun = {};
    const byKode = {};
    susunRows.forEach((r) => {
      byKode[r.kode_transaksi] = byKode[r.kode_transaksi] || [];
      byKode[r.kode_transaksi].push(r);
    });
    Object.values(byKode).forEach((records) => {
      const biaya = records[0]?.biaya_truk || 0;
      const share = records.length > 0 ? biaya / records.length : 0;
      records.forEach((r) => {
        pendapatanSusun[r.id_kuli] = (pendapatanSusun[r.id_kuli] || 0) + share;
      });
    });

    // 5. Hari aktif per kuli
    const data = [];
    for (const k of kulis) {
      const [hadirRows] = await pool.query(
        `SELECT COUNT(DISTINCT DATE(tgl)) AS hadir FROM data_transaksi_tbl WHERE id_kuli = ? AND tgl BETWEEN ? AND ? ${scopeWarehouse ? "AND warehouse = ?" : ""}`,
        scopeWarehouse ? [k.nik, start, end, scopeWarehouse] : [k.nik, start, end]
      );
      const pm = pendapatanMuat[k.nik] || 0;
      const um = uangMakanMap[k.nik] || 0;
      const ps = pendapatanSusun[k.nik] || 0;
      data.push({
        id_kuli: k.nik,
        nama_kuli: k.nama_kuli,
        hadir_hari: hadirRows[0]?.hadir || 0,
        pendapatan_muat: pm,
        uang_makan: um,
        pendapatan_susun: ps,
        total_pendapatan: pm + um + ps,
      });
    }
    data.sort((a, b) => b.total_pendapatan - a.total_pendapatan);

    return ok(res, { data, bulan, start, end });
  } catch (err) {
    console.error("[performanceKuli]", err);
    return fail(res, "Gagal menghitung performance kuli.", 500);
  }
}

module.exports = { performanceKuli };
