const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");

const TABLE = "data_uang_makan_tbl";

async function list(req, res) {
  const { search } = req.query;
  let sql = `SELECT * FROM ${TABLE} WHERE 1=1`;
  const params = [];

  if (search) {
    sql += " AND (tahun LIKE ? OR harga_uang_makan LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY tahun DESC";

  try {
    const [rows] = await pool.query(sql, params);
    return ok(res, rows);
  } catch (err) {
    console.error("[um.list]", err);
    return fail(res, "Gagal mengambil data harga uang makan.", 500);
  }
}

async function create(req, res) {
  const { tahun, harga_uang_makan } = req.body;
  if (!tahun || !harga_uang_makan) {
    return fail(res, "Tahun dan harga uang makan wajib diisi.", 422);
  }
  try {
    await pool.query(`INSERT INTO ${TABLE} (tahun, harga_uang_makan) VALUES (?, ?)`, [
      tahun,
      harga_uang_makan,
    ]);
    return ok(res, null, "Harga berhasil ditambahkan.", 201);
  } catch (err) {
    console.error("[um.create]", err);
    return fail(res, "Gagal menambahkan harga uang makan.", 500);
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { tahun, harga_uang_makan } = req.body;
  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    await pool.query(`UPDATE ${TABLE} SET tahun = ?, harga_uang_makan = ? WHERE id = ?`, [
      tahun,
      harga_uang_makan,
      id,
    ]);
    return ok(res, null, "Data berhasil diupdate.");
  } catch (err) {
    console.error("[um.update]", err);
    return fail(res, "Gagal mengupdate data.", 500);
  }
}

async function remove(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return ok(res, null, "Data berhasil dihapus.");
  } catch (err) {
    console.error("[um.remove]", err);
    return fail(res, "Gagal menghapus data.", 500);
  }
}

module.exports = { list, create, update, remove };
