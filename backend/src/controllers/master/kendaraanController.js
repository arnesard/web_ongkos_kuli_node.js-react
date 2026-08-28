const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");

const TABLE = "data_kendaraan_tbl";

async function list(req, res) {
  const { search } = req.query;
  let sql = `SELECT * FROM ${TABLE} WHERE 1=1`;
  const params = [];

  if (search) {
    sql += " AND (nama_kendaraan LIKE ? OR biaya_truk LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY nama_kendaraan ASC";

  try {
    const [rows] = await pool.query(sql, params);
    return ok(res, rows);
  } catch (err) {
    console.error("[kendaraan.list]", err);
    return fail(res, "Gagal mengambil data kendaraan.", 500);
  }
}

async function create(req, res) {
  const { nama_kendaraan, biaya_truk, potongan_kuli } = req.body;
  if (!nama_kendaraan || biaya_truk === undefined) {
    return fail(res, "Nama kendaraan dan biaya per truck wajib diisi.", 422);
  }
  try {
    await pool.query(
      `INSERT INTO ${TABLE} (nama_kendaraan, biaya_truk, potongan_kuli) VALUES (?, ?, ?)`,
      [nama_kendaraan, biaya_truk, potongan_kuli ?? 0]
    );
    return ok(res, null, "Kendaraan berhasil ditambahkan.", 201);
  } catch (err) {
    console.error("[kendaraan.create]", err);
    return fail(res, "Gagal menambahkan kendaraan.", 500);
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { nama_kendaraan, biaya_truk, potongan_kuli } = req.body;
  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    await pool.query(
      `UPDATE ${TABLE} SET nama_kendaraan = ?, biaya_truk = ?, potongan_kuli = ? WHERE id = ?`,
      [nama_kendaraan, biaya_truk, potongan_kuli ?? 0, id]
    );
    return ok(res, null, "Data berhasil diupdate.");
  } catch (err) {
    console.error("[kendaraan.update]", err);
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
    console.error("[kendaraan.remove]", err);
    return fail(res, "Gagal menghapus data.", 500);
  }
}

module.exports = { list, create, update, remove };
