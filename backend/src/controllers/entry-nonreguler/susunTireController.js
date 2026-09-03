const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

const TABLE = "data_transaksi_susunlantai_tbl";

function formatDmy(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

// GET /api/entry-nonreguler/susun-tire?tanggal=
// Samain dengan OngkosController::indexSusunTire (join kendaraan -> biaya_truk, hitung total_biaya = kubikasi * biaya_truk)
async function list(req, res) {
  const { warehouse, isSuperUser } = warehouseScope(req.user);
  const tanggal = req.query.tanggal || new Date().toISOString().slice(0, 10);

  let sql = `
    SELECT dt.*, dk.biaya_truk, (dt.kubikasi * dk.biaya_truk) AS total_biaya
    FROM ${TABLE} dt
    LEFT JOIN data_kendaraan_tbl dk ON dt.jenis_truk = dk.nama_kendaraan
    WHERE DATE(dt.tgl) = ?`;
  const params = [tanggal];

  if (!isSuperUser) {
    sql += " AND dt.warehouse = ?";
    params.push(warehouse);
  }

  try {
    const [datas] = await pool.query(sql, params);

    let countSql = `SELECT kode_transaksi, COUNT(id_kuli) AS count_kuli FROM ${TABLE} WHERE DATE(tgl) = ?`;
    const countParams = [tanggal];
    if (!isSuperUser) {
      countSql += " AND warehouse = ?";
      countParams.push(warehouse);
    }
    countSql += " GROUP BY kode_transaksi";
    const [countRows] = await pool.query(countSql, countParams);
    const countKuliPerTrip = {};
    countRows.forEach((r) => (countKuliPerTrip[r.kode_transaksi] = r.count_kuli));

    const [nama_kendaraan] = await pool.query("SELECT * FROM data_kendaraan_tbl");

    let kuliSql = "SELECT nik, nama_kuli FROM data_kuli_tbl WHERE 1=1";
    const kuliParams = [];
    if (!isSuperUser) {
      kuliSql += " AND warehouse = ?";
      kuliParams.push(warehouse);
    }
    const [nk] = await pool.query(kuliSql, kuliParams);

    return ok(res, { datas, countKuliPerTrip, nama_kendaraan, tanggal, nk });
  } catch (err) {
    console.error("[susunTire.list]", err);
    return fail(res, "Gagal mengambil data susun tire.", 500);
  }
}

// GET /api/entry-nonreguler/susun-tire/last-kode?tgl=&jenis=susun_lantai
// Samain dengan OngkosController::getLastKode (khusus jenis=susun_lantai)
async function getLastKode(req, res) {
  const { warehouse } = warehouseScope(req.user);
  const { tgl } = req.query;
  if (!tgl) return ok(res, { last_kode: null });

  try {
    const [rows] = await pool.query(
      `SELECT kode_transaksi FROM ${TABLE} WHERE DATE(tgl) = ? AND warehouse = ? ORDER BY kode_transaksi DESC LIMIT 1`,
      [tgl, warehouse]
    );
    return ok(res, { last_kode: rows[0]?.kode_transaksi ?? null });
  } catch (err) {
    console.error("[susunTire.getLastKode]", err);
    return fail(res, "Gagal mengambil kode terakhir.", 500);
  }
}

// POST /api/entry-nonreguler/susun-tire
async function create(req, res) {
  const { warehouse } = warehouseScope(req.user);
  const { tgl, kode, jenis_truk, item, pcs, kubikasi, id_kuli } = req.body;

  if (!tgl || !jenis_truk || !item || pcs === undefined || !kubikasi || !id_kuli) {
    return fail(res, "Semua field wajib diisi.", 422);
  }

  const kode_transaksi = `${formatDmy(tgl)}S${kode}`;

  try {
    const [existing] = await pool.query(
      `SELECT id FROM ${TABLE} WHERE tgl = ? AND kode_transaksi = ? AND id_kuli = ?`,
      [tgl, kode_transaksi, id_kuli]
    );
    if (existing.length > 0) {
      return fail(res, "ID Kuli sudah pernah diinput untuk transaksi ini.", 422);
    }

    await pool.query(
      `INSERT INTO ${TABLE} (tgl, kode_transaksi, jenis_truk, item, pcs, kubikasi, id_kuli, warehouse) VALUES (?,?,?,?,?,?,?,?)`,
      [tgl, kode_transaksi, jenis_truk, item, pcs, kubikasi, id_kuli, warehouse]
    );
    return ok(res, null, "Data berhasil ditambahkan.", 201);
  } catch (err) {
    console.error("[susunTire.create]", err);
    return fail(res, "Gagal menambahkan data.", 500);
  }
}

// PUT /api/entry-nonreguler/susun-tire/:id
async function update(req, res) {
  const { warehouse } = warehouseScope(req.user);
  const { id } = req.params;
  const { tgl, jenis_truk, item, pcs, kubikasi, id_kuli } = req.body;

  // Samain dengan updateSusunLantai: semua field wajib diisi saat update.
  if (!tgl || !jenis_truk || !item || pcs === undefined || pcs === "" || !kubikasi || !id_kuli) {
    return fail(res, "Semua field wajib diisi.", 422);
  }

  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    await pool.query(
      `UPDATE ${TABLE} SET tgl=?, jenis_truk=?, item=?, pcs=?, kubikasi=?, id_kuli=?, warehouse=? WHERE id=?`,
      [tgl, jenis_truk, item, pcs, kubikasi, id_kuli, warehouse, id]
    );
    return ok(res, null, "Data berhasil diperbarui.");
  } catch (err) {
    console.error("[susunTire.update]", err);
    return fail(res, "Gagal memperbarui data.", 500);
  }
}

// DELETE /api/entry-nonreguler/susun-tire/:id
async function remove(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);
    await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return ok(res, null, "Data berhasil dihapus!");
  } catch (err) {
    console.error("[susunTire.remove]", err);
    return fail(res, "Gagal menghapus data.", 500);
  }
}

// GET /api/entry-nonreguler/susun-tire/export?tanggal=
// Samain dengan OngkosController::exportSusunLantai (tanpa filter warehouse, sama persis Laravel)
async function exportCsv(req, res) {
  const { tanggal } = req.query;

  let sql = `SELECT tgl, kode_transaksi, id_kuli, pcs, jenis_truk, item, warehouse, kubikasi FROM ${TABLE}`;
  const params = [];
  if (tanggal) {
    sql += " WHERE DATE(tgl) = ?";
    params.push(tanggal);
  }
  sql += " ORDER BY tgl DESC";

  try {
    const [rows] = await pool.query(sql, params);

    const header = ["Tanggal", "Kode Transaksi", "ID Kuli", "PCS", "Jenis Truk", "Item", "Warehouse", "Kubikasi"];
    const csvLines = [header.join(",")];
    rows.forEach((r) => {
      csvLines.push(
        [r.tgl, r.kode_transaksi, r.id_kuli, r.pcs, r.jenis_truk, r.item, r.warehouse, r.kubikasi]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
    });

    const fileName = `data-susunlantai-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15)}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(csvLines.join("\n"));
  } catch (err) {
    console.error("[susunTire.exportCsv]", err);
    return fail(res, "Gagal mengexport data.", 500);
  }
}

module.exports = { list, create, update, remove, getLastKode, exportCsv };
