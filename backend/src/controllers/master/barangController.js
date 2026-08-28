const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");

const TABLE = "data_barang_tbl";

async function list(req, res) {
  const { search } = req.query;
  let sql = `SELECT * FROM ${TABLE} WHERE 1=1`;
  const params = [];

  if (search) {
    sql += " AND (jenis LIKE ? OR ongkos LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY jenis ASC";

  try {
    const [rows] = await pool.query(sql, params);
    return ok(res, rows);
  } catch (err) {
    console.error("[barang.list]", err);
    return fail(res, "Gagal mengambil data jenis barang.", 500);
  }
}

async function create(req, res) {
  const { jenis, ongkos } = req.body;
  if (!jenis || ongkos === undefined) {
    return fail(res, "Jenis barang dan ongkos wajib diisi.", 422);
  }
  try {
    await pool.query(`INSERT INTO ${TABLE} (jenis, ongkos) VALUES (?, ?)`, [jenis, ongkos]);
    return ok(res, null, "Kuli berhasil ditambahkan.", 201); // pesan disamakan dgn Laravel (walau nama sedikit typo di sana)
  } catch (err) {
    console.error("[barang.create]", err);
    return fail(res, "Gagal menambahkan jenis barang.", 500);
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { jenis, ongkos } = req.body;
  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    await pool.query(`UPDATE ${TABLE} SET jenis = ?, ongkos = ? WHERE id = ?`, [jenis, ongkos, id]);
    return ok(res, null, "Data berhasil diupdate.");
  } catch (err) {
    console.error("[barang.update]", err);
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
    console.error("[barang.remove]", err);
    return fail(res, "Gagal menghapus data.", 500);
  }
}

module.exports = { list, create, update, remove };
