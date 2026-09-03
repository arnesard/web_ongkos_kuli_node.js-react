const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

const TABLE = "data_transaksi_uangmakankuli_tbl";

// GET /api/entry-nonreguler/uang-makan?tgl=&id_kuli=
// Samain dengan OngkosController::indexUangMakan (join kuli + subquery harga tahun berjalan)
async function list(req, res) {
  const { warehouse, isSuperUser } = warehouseScope(req.user);
  const { tgl, id_kuli } = req.query;

  let sql = `
    SELECT um.id, um.tgl, um.id_kuli, k.nama_kuli, k.warehouse,
      (SELECT m.harga_uang_makan FROM data_uang_makan_tbl m WHERE m.tahun = YEAR(um.tgl) LIMIT 1) AS jumlah_uang_makan
    FROM ${TABLE} um
    JOIN data_kuli_tbl k ON um.id_kuli = k.nik
    WHERE 1=1`;
  const params = [];

  if (!isSuperUser) {
    sql += " AND k.warehouse = ?";
    params.push(warehouse);
  }
  if (tgl) {
    sql += " AND DATE(um.tgl) = ?";
    params.push(tgl);
  } else {
    sql += " AND DATE(um.tgl) = CURDATE()";
  }
  if (id_kuli) {
    sql += " AND um.id_kuli LIKE ?";
    params.push(`%${id_kuli}%`);
  }
  sql += " ORDER BY um.tgl DESC";

  try {
    const [dataUangMakan] = await pool.query(sql, params);

    let kuliSql = "SELECT nik, nama_kuli FROM data_kuli_tbl WHERE 1=1";
    const kuliParams = [];
    if (!isSuperUser) {
      kuliSql += " AND warehouse = ?";
      kuliParams.push(warehouse);
    }
    const [nk] = await pool.query(kuliSql, kuliParams);

    return ok(res, { dataUangMakan, nk });
  } catch (err) {
    console.error("[uangMakan.list]", err);
    return fail(res, "Gagal mengambil data uang makan.", 500);
  }
}

// POST /api/entry-nonreguler/uang-makan
async function create(req, res) {
  const { warehouse } = warehouseScope(req.user);
  const { tgl, id_kuli } = req.body;

  if (!tgl || !id_kuli) {
    return fail(res, "Tanggal dan ID kuli wajib diisi.", 422);
  }

  try {
    const [existing] = await pool.query(`SELECT id FROM ${TABLE} WHERE tgl = ? AND id_kuli = ?`, [tgl, id_kuli]);
    if (existing.length > 0) {
      return fail(res, "Data untuk kuli ini pada tanggal tersebut sudah ada.", 422);
    }

    await pool.query(`INSERT INTO ${TABLE} (tgl, id_kuli, warehouse) VALUES (?, ?, ?)`, [tgl, id_kuli, warehouse]);
    return ok(res, null, "Data berhasil ditambahkan.", 201);
  } catch (err) {
    console.error("[uangMakan.create]", err);
    return fail(res, "Gagal menambahkan data.", 500);
  }
}

// PUT /api/entry-nonreguler/uang-makan/:id
async function update(req, res) {
  const { warehouse } = warehouseScope(req.user);
  const { id } = req.params;
  const { tgl, id_kuli } = req.body;

  if (!tgl || !id_kuli) return fail(res, "Tanggal dan ID kuli wajib diisi.", 422);

  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    await pool.query(`UPDATE ${TABLE} SET tgl=?, id_kuli=?, warehouse=? WHERE id=?`, [tgl, id_kuli, warehouse, id]);
    return ok(res, null, "Data berhasil diperbarui.");
  } catch (err) {
    console.error("[uangMakan.update]", err);
    return fail(res, "Gagal memperbarui data.", 500);
  }
}

// DELETE /api/entry-nonreguler/uang-makan/:id
async function remove(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);
    await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return ok(res, null, "Data berhasil dihapus.");
  } catch (err) {
    console.error("[uangMakan.remove]", err);
    return fail(res, "Gagal menghapus data.", 500);
  }
}

// GET /api/entry-nonreguler/uang-makan/export?tgl=&id_kuli=
// Samain dengan OngkosController::exportUangMakan (query sama persis dengan list(), output CSV)
async function exportCsv(req, res) {
  const { warehouse, isSuperUser } = warehouseScope(req.user);
  const { tgl, id_kuli } = req.query;

  let sql = `
    SELECT um.tgl, um.id_kuli, k.nama_kuli, k.warehouse,
      (SELECT m.harga_uang_makan FROM data_uang_makan_tbl m WHERE m.tahun = YEAR(um.tgl) LIMIT 1) AS jumlah_uang_makan
    FROM ${TABLE} um
    JOIN data_kuli_tbl k ON um.id_kuli = k.nik
    WHERE 1=1`;
  const params = [];

  if (!isSuperUser) {
    sql += " AND k.warehouse = ?";
    params.push(warehouse);
  }
  if (tgl) {
    sql += " AND DATE(um.tgl) = ?";
    params.push(tgl);
  } else {
    sql += " AND DATE(um.tgl) = CURDATE()";
  }
  if (id_kuli) {
    sql += " AND um.id_kuli LIKE ?";
    params.push(`%${id_kuli}%`);
  }
  sql += " ORDER BY um.tgl DESC";

  try {
    const [rows] = await pool.query(sql, params);
    if (rows.length === 0) {
      return fail(res, "Tidak ada data uang makan untuk diexport.", 422);
    }

    const header = ["Tanggal", "ID Kuli", "Nama Kuli", "Warehouse", "Jumlah Uang Makan"];
    const csvLines = [header.join(",")];
    rows.forEach((r) => {
      csvLines.push(
        [r.tgl, r.id_kuli, r.nama_kuli, r.warehouse, r.jumlah_uang_makan]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
    });

    const fileName = `uang_makan_${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15)}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(csvLines.join("\n"));
  } catch (err) {
    console.error("[uangMakan.exportCsv]", err);
    return fail(res, "Gagal mengexport data.", 500);
  }
}

module.exports = { list, create, update, remove, exportCsv };
