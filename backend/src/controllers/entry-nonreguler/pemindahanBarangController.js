const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

const TABLE = "data_transaksi_pemindahanbarang_tbl";

function cleanNumber(v) {
  if (v === undefined || v === null || v === "") return 0;
  return Number(String(v).replace(/\./g, ""));
}

// GET /api/entry-nonreguler/pemindahan-barang?tgl=
// Samain dengan OngkosController::pemindahanBarang — sengaja TIDAK difilter warehouse
// (query Laravel aslinya juga global per tanggal, bukan per-warehouse).
async function list(req, res) {
  const tgl = req.query.tgl || new Date().toISOString().slice(0, 10);

  try {
    const [dataPemindahan] = await pool.query(
      `SELECT * FROM ${TABLE} WHERE tgl = ? ORDER BY tgl DESC`,
      [tgl]
    );
    const [kendaraanRows] = await pool.query("SELECT nama_kendaraan FROM data_kendaraan_tbl");

    return ok(res, {
      dataPemindahan,
      kendaraan: kendaraanRows.map((r) => r.nama_kendaraan),
      tanggalDipilih: tgl,
    });
  } catch (err) {
    console.error("[pemindahanBarang.list]", err);
    return fail(res, "Gagal mengambil data pemindahan barang.", 500);
  }
}

// POST /api/entry-nonreguler/pemindahan-barang
async function create(req, res) {
  const { warehouse } = warehouseScope(req.user);
  const b = req.body;
  const required = ["tgl", "lokasi_awal", "lokasi_tujuan", "jenis_truk", "ritase", "driver", "nopol"];
  for (const f of required) {
    if (!b[f]) return fail(res, `Field ${f} wajib diisi.`, 422);
  }

  try {
    await pool.query(
      `INSERT INTO ${TABLE} (tgl, lokasi_awal, lokasi_tujuan, jenis_truk, ritase, nopol, driver, biaya_retribusi, biaya_security, biaya_parkir, biaya_uangjalan, warehouse)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        b.tgl, b.lokasi_awal, b.lokasi_tujuan, b.jenis_truk, b.ritase, b.nopol, b.driver,
        cleanNumber(b.biaya_retribusi), cleanNumber(b.biaya_security), cleanNumber(b.biaya_parkir), cleanNumber(b.biaya_uangjalan || b.uang_jalan),
        warehouse || "X",
      ]
    );
    return ok(res, null, "Data berhasil disimpan!", 201);
  } catch (err) {
    console.error("[pemindahanBarang.create]", err);
    return fail(res, "Gagal menyimpan data.", 500);
  }
}

// PUT /api/entry-nonreguler/pemindahan-barang/:id
async function update(req, res) {
  const { id } = req.params;
  const b = req.body;

  // Samain dengan update(): field wajib divalidasi sebelum disimpan.
  const required = ["tgl", "lokasi_awal", "lokasi_tujuan", "jenis_truk", "ritase", "driver", "nopol"];
  for (const f of required) {
    if (!b[f]) return fail(res, `Field ${f} wajib diisi.`, 422);
  }

  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    await pool.query(
      `UPDATE ${TABLE} SET tgl=?, lokasi_awal=?, lokasi_tujuan=?, jenis_truk=?, ritase=?, nopol=?, driver=?, biaya_retribusi=?, biaya_security=?, biaya_parkir=?, biaya_uangjalan=? WHERE id=?`,
      [
        b.tgl, b.lokasi_awal, b.lokasi_tujuan, b.jenis_truk, b.ritase, b.nopol, b.driver,
        cleanNumber(b.biaya_retribusi), cleanNumber(b.biaya_security), cleanNumber(b.biaya_parkir), cleanNumber(b.biaya_uangjalan || b.uang_jalan),
        id,
      ]
    );
    return ok(res, null, "Data berhasil diupdate!");
  } catch (err) {
    console.error("[pemindahanBarang.update]", err);
    return fail(res, "Gagal mengupdate data.", 500);
  }
}

// DELETE /api/entry-nonreguler/pemindahan-barang/:id
async function remove(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);
    await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return ok(res, null, "Data berhasil dihapus!");
  } catch (err) {
    console.error("[pemindahanBarang.remove]", err);
    return fail(res, "Gagal menghapus data.", 500);
  }
}

// GET /api/entry-nonreguler/pemindahan-barang/export?tgl=
// Samain dengan OngkosController::exportCSV — ini yang satu-satunya query di modul ini
// yang difilter warehouse (isSuperUser check), persis kayak Laravel.
async function exportCsv(req, res) {
  const { warehouse, isSuperUser } = warehouseScope(req.user);
  const { tgl } = req.query;

  let sql = `SELECT * FROM ${TABLE} WHERE 1=1`;
  const params = [];
  if (!isSuperUser) {
    sql += " AND warehouse = ?";
    params.push(warehouse);
  }
  if (tgl) {
    sql += " AND DATE(tgl) = ?";
    params.push(tgl);
  } else {
    sql += " AND DATE(tgl) = CURDATE()";
  }

  try {
    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) {
      return fail(res, "Tidak ada data yang sesuai tanggal filter.", 422);
    }

    const header = [
      "Tanggal", "Lokasi Awal", "Lokasi Tujuan", "Jenis Truk", "No Polisi", "Driver",
      "Ritase", "Biaya Retribusi", "Biaya Security", "Biaya Parkir", "Uang Jalan", "Total Biaya", "Warehouse",
    ];
    const csvLines = [header.join(",")];
    rows.forEach((r) => {
      const total =
        (Number(r.biaya_retribusi) || 0) +
        (Number(r.biaya_security) || 0) +
        (Number(r.biaya_parkir) || 0) +
        (Number(r.biaya_uangjalan) || 0);
      csvLines.push(
        [
          r.tgl, r.lokasi_awal, r.lokasi_tujuan, r.jenis_truk, r.nopol, r.driver,
          r.ritase, r.biaya_retribusi, r.biaya_security, r.biaya_parkir, r.biaya_uangjalan, total, r.warehouse,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
    });

    const fileName = `pemindahan_barang_${tgl || new Date().toISOString().slice(0, 10).replace(/-/g, "")}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(csvLines.join("\n"));
  } catch (err) {
    console.error("[pemindahanBarang.exportCsv]", err);
    return fail(res, "Gagal mengexport data.", 500);
  }
}

module.exports = { list, create, update, remove, exportCsv };
