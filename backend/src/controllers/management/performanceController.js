const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

// ==========================================================================
// Disamakan dengan ManagementController::performanceKuli + ::cetakNotaKuli
//
// CATATAN PARITAS: di Laravel, kalau user level HOD/Superuser BELUM milih
// warehouse (filter tombol APW/BPW/dst di UI), semua query di-`where('warehouse',
// null)` — yang di SQL artinya `WHERE warehouse = NULL`, otomatis TIDAK PERNAH
// match apa pun. Efeknya: HOD/Superuser WAJIB pilih warehouse dulu, kalau belum
// datanya kosong semua. Itu sengaja direplikasi di sini (bukan fallback ke
// "semua warehouse" seperti versi sebelumnya).
//
// PERBAIKAN (beda dari Laravel): Laravel nentuin pakai data_barang_tbl (JMW)
// atau data_kendaraan_tbl berdasarkan warehouse SESI USER YANG LOGIN
// ($warehouse session, bukan $selectedWarehouse filter) — jadi kalau
// HOD/Superuser filter ke JMW, Laravel-nya SALAH tetap pakai data_kendaraan_tbl.
// Di sini dibenerin: dicek dari warehouse yang LAGI DILIHAT (scopeWarehouse).
// ==========================================================================

function monthRange(bulan) {
  const [y, m] = bulan.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return [fmt(start), fmt(end)];
}

// GET /api/management/performance-kuli?bulan=YYYY-MM&start_tgl=&end_tgl=&nama_kuli=&warehouse=
async function performanceKuli(req, res) {
  const { warehouse, isHighLevel } = warehouseScope(req.user);
  const { nama_kuli, warehouse: selectedWarehouse } = req.query;
  const bulan = req.query.bulan || new Date().toISOString().slice(0, 7);
  const [start, end] =
    req.query.start_tgl && req.query.end_tgl ? [req.query.start_tgl, req.query.end_tgl] : monthRange(bulan);

  // HOD/Superuser wajib pilih warehouse dulu (lihat catatan paritas di atas)
  const scopeWarehouse = isHighLevel ? selectedWarehouse || null : warehouse;
  if (isHighLevel && !selectedWarehouse) {
    return ok(res, { data: [], daysInMonth: 0, bulan, start, end, requiresWarehouse: true });
  }

  try {
    let kuliSql = "SELECT nik, nama_kuli FROM data_kuli_tbl WHERE warehouse = ?";
    const kuliParams = [scopeWarehouse];
    if (nama_kuli) {
      kuliSql += " AND nama_kuli LIKE ?";
      kuliParams.push(`%${nama_kuli}%`);
    }
    const [kulis] = await pool.query(kuliSql, kuliParams);

    const muatSql = `SELECT t.no_trip, t.id_kuli, k.biaya_truk, t.ket, t.qty_truk
      FROM data_transaksi_tbl t JOIN data_kendaraan_tbl k ON t.jenis_truk = k.nama_kendaraan
      WHERE t.tgl BETWEEN ? AND ? AND t.warehouse = ?`;
    const [muatRows] = await pool.query(muatSql, [start, end, scopeWarehouse]);

    const bongkarSql = `SELECT t.no_trip, t.id_kuli, k.ongkos, t.ket, t.qty_truk
      FROM data_transaksi_tbl t JOIN data_barang_tbl k ON t.jenis_truk = k.jenis
      WHERE t.tgl BETWEEN ? AND ? AND t.warehouse = ?`;
    const [bongkarRows] = await pool.query(bongkarSql, [start, end, scopeWarehouse]);

    const isJMW = String(scopeWarehouse).toUpperCase() === "JMW";
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

    const [umRow] = await pool.query("SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ?", [
      new Date().getFullYear(),
    ]);
    const hargaUM = umRow[0]?.harga_uang_makan || 0;

    const [umRows] = await pool.query(
      "SELECT id_kuli FROM data_transaksi_uangmakankuli_tbl WHERE tgl BETWEEN ? AND ? AND warehouse = ?",
      [start, end, scopeWarehouse]
    );
    const uangMakanMap = {};
    umRows.forEach((r) => (uangMakanMap[r.id_kuli] = (uangMakanMap[r.id_kuli] || 0) + hargaUM));

    const susunSql = `SELECT s.kode_transaksi, s.id_kuli, k.biaya_truk
      FROM data_transaksi_susunlantai_tbl s JOIN data_kendaraan_tbl k ON s.jenis_truk = k.nama_kendaraan
      WHERE s.tgl BETWEEN ? AND ? AND s.warehouse = ?`;
    const [susunRows] = await pool.query(susunSql, [start, end, scopeWarehouse]);
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

    // Hari aktif keseluruhan warehouse dalam periode (dipakai sebagai penyebut "HARI KERJA")
    const [daysRow] = await pool.query(
      "SELECT COUNT(DISTINCT DATE(tgl)) AS cnt FROM data_transaksi_tbl WHERE tgl BETWEEN ? AND ? AND warehouse = ?",
      [start, end, scopeWarehouse]
    );
    const daysInMonth = daysRow[0]?.cnt || 0;

    const data = [];
    for (const k of kulis) {
      const [hadirRows] = await pool.query(
        "SELECT COUNT(DISTINCT DATE(tgl)) AS hadir FROM data_transaksi_tbl WHERE id_kuli = ? AND tgl BETWEEN ? AND ? AND warehouse = ?",
        [k.nik, start, end, scopeWarehouse]
      );
      const pm = pendapatanMuat[k.nik] || 0;
      const um = uangMakanMap[k.nik] || 0;
      const ps = pendapatanSusun[k.nik] || 0;
      data.push({
        id_kuli: k.nik,
        nama_kuli: k.nama_kuli,
        hadir_hari: hadirRows[0]?.hadir || 0,
        total_pendapatan: pm + um + ps,
      });
    }
    data.sort((a, b) => b.total_pendapatan - a.total_pendapatan);

    return ok(res, { data, daysInMonth, bulan, start, end });
  } catch (err) {
    console.error("[performanceKuli]", err);
    return fail(res, "Gagal menghitung performance kuli.", 500);
  }
}

// GET /api/management/performance-kuli/cetak-nota?start_tgl=&end_tgl=&nama_kuli=&warehouse=
// Rincian breakdown pendapatan SATU kuli (buat modal + cetak struk "Nota Kuli")
// Samain 1:1 dengan ManagementController::cetakNotaKuli
async function cetakNotaKuli(req, res) {
  const { start_tgl, end_tgl, nama_kuli, warehouse: selectedWarehouse } = req.query;
  if (!start_tgl || !end_tgl || !nama_kuli) {
    return fail(res, "Data filter tidak lengkap.", 400);
  }

  try {
    let kuliSql = "SELECT nik, warehouse FROM data_kuli_tbl WHERE nama_kuli = ?";
    const kuliParams = [nama_kuli];
    if (selectedWarehouse) {
      kuliSql += " AND warehouse = ?";
      kuliParams.push(selectedWarehouse);
    }
    kuliSql += " LIMIT 1";
    const [kuliRows] = await pool.query(kuliSql, kuliParams);
    if (kuliRows.length === 0) return fail(res, "Kuli tidak ditemukan.", 404);

    const kuli = kuliRows[0];
    const idKuli = kuli.nik;
    const isJMW = kuli.warehouse === "JMW";
    const joinTable = isJMW ? "data_barang_tbl" : "data_kendaraan_tbl";
    const joinColumn = isJMW ? "k.jenis" : "k.nama_kendaraan";
    const biayaColumn = isJMW ? "k.ongkos" : "k.biaya_truk";

    const [transaksi] = await pool.query(
      `SELECT t.jenis_truk, t.qty_truk, t.ket, t.no_trip, ${biayaColumn} AS biaya_unit
       FROM data_transaksi_tbl t JOIN ${joinTable} k ON t.jenis_truk = ${joinColumn}
       WHERE t.tgl BETWEEN ? AND ? AND t.id_kuli = ? AND t.warehouse = ?`,
      [start_tgl, end_tgl, idKuli, kuli.warehouse]
    );

    const noTripList = [...new Set(transaksi.map((t) => t.no_trip))];
    let allKuliInTrip = [];
    if (noTripList.length) {
      const placeholders = noTripList.map(() => "?").join(",");
      const [rows] = await pool.query(
        `SELECT no_trip, id_kuli, jenis_truk, ket FROM data_transaksi_tbl WHERE no_trip IN (${placeholders}) AND warehouse = ?`,
        [...noTripList, kuli.warehouse]
      );
      allKuliInTrip = rows;
    }

    const rincianMuat = {};
    let totalPendapatanMuat = 0;
    transaksi.forEach((t) => {
      const key = `${t.jenis_truk}|${t.ket}`;
      const jumlahKuli = allKuliInTrip.filter((r) => r.no_trip === t.no_trip && r.ket === t.ket).length;
      const qtyTruk = Number(String(t.qty_truk || 0).replace(",", "."));
      const biaya = Number(String(t.biaya_unit || 0).replace(",", "."));
      const totalBiayaTrip = biaya * qtyTruk;
      const share = jumlahKuli > 0 ? totalBiayaTrip / jumlahKuli : 0;

      if (!rincianMuat[key]) {
        rincianMuat[key] = { jenis: t.jenis_truk + (t.ket ? ` (${t.ket})` : ""), qty: 0, pendapatan: 0 };
      }
      rincianMuat[key].qty += 1;
      rincianMuat[key].pendapatan += share;
      totalPendapatanMuat += share;
    });

    let rincianNota = Object.values(rincianMuat);

    const [umRow] = await pool.query("SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ?", [
      new Date().getFullYear(),
    ]);
    const hargaUM = Number(umRow[0]?.harga_uang_makan || 0);
    const [umCountRow] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM data_transaksi_uangmakankuli_tbl WHERE tgl BETWEEN ? AND ? AND id_kuli = ? AND warehouse = ?",
      [start_tgl, end_tgl, idKuli, kuli.warehouse]
    );
    const jumlahUangMakan = umCountRow[0]?.cnt || 0;
    const totalUangMakan = jumlahUangMakan * hargaUM;
    if (jumlahUangMakan > 0) {
      rincianNota.push({ jenis: "Uang Makan", qty: jumlahUangMakan, pendapatan: totalUangMakan });
    }

    const [susun] = await pool.query(
      `SELECT t.kode_transaksi, t.jenis_truk, k.biaya_truk
       FROM data_transaksi_susunlantai_tbl t JOIN data_kendaraan_tbl k ON t.jenis_truk = k.nama_kendaraan
       WHERE t.tgl BETWEEN ? AND ? AND t.id_kuli = ? AND t.warehouse = ?`,
      [start_tgl, end_tgl, idKuli, kuli.warehouse]
    );
    const kodeSusunList = [...new Set(susun.map((s) => s.kode_transaksi))];
    let allKuliInSusun = [];
    if (kodeSusunList.length) {
      const placeholders = kodeSusunList.map(() => "?").join(",");
      const [rows] = await pool.query(
        `SELECT kode_transaksi, id_kuli FROM data_transaksi_susunlantai_tbl WHERE kode_transaksi IN (${placeholders}) AND warehouse = ?`,
        [...kodeSusunList, kuli.warehouse]
      );
      allKuliInSusun = rows;
    }
    const rincianSusun = {};
    let totalPendapatanSusun = 0;
    susun.forEach((t) => {
      const biaya = Number(String(t.biaya_truk || 0).replace(",", "."));
      const jumlahKuli = allKuliInSusun.filter((r) => r.kode_transaksi === t.kode_transaksi).length;
      const share = jumlahKuli > 0 ? biaya / jumlahKuli : 0;
      const key = `Susun Lantai ${t.jenis_truk}`;
      if (!rincianSusun[key]) rincianSusun[key] = { jenis: key, qty: 0, pendapatan: 0 };
      rincianSusun[key].qty += 1;
      rincianSusun[key].pendapatan += share;
      totalPendapatanSusun += share;
    });
    rincianNota = rincianNota.concat(Object.values(rincianSusun));

    const grandTotal = totalPendapatanMuat + totalUangMakan + totalPendapatanSusun;
    const totalQty = rincianNota.reduce((s, r) => s + r.qty, 0);

    return ok(res, { rincian: rincianNota, grand_total: grandTotal, total_qty: totalQty });
  } catch (err) {
    console.error("[cetakNotaKuli]", err);
    return fail(res, "Gagal mengambil data rincian dari server.", 500);
  }
}

module.exports = { performanceKuli, cetakNotaKuli };
