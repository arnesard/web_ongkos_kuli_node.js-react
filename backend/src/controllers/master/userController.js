const bcrypt = require("bcryptjs");
const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");

const TABLE = "data_user_tbl";

async function list(req, res) {
  const { search } = req.query;
  let sql = `SELECT id, nip, nama, level, user, email, warehouse FROM ${TABLE} WHERE 1=1`;
  const params = [];

  if (search) {
    sql += " AND (nip LIKE ? OR nama LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY id DESC";

  try {
    const [rows] = await pool.query(sql, params);
    return ok(res, rows); // password disembunyikan (samain dgn $hidden di model Laravel)
  } catch (err) {
    console.error("[user.list]", err);
    return fail(res, "Gagal mengambil data user.", 500);
  }
}

async function create(req, res) {
  const { nip, nama, level, user, email, warehouse, password } = req.body;

  if (!nip || !nama || !level || !user || !email || !warehouse || !password) {
    return fail(res, "Semua field wajib diisi (password minimal 4 karakter).", 422);
  }
  if (password.length < 4) {
    return fail(res, "Password minimal 4 karakter.", 422);
  }

  try {
    const [existing] = await pool.query(`SELECT id FROM ${TABLE} WHERE user = ?`, [user]);
    if (existing.length > 0) {
      return fail(res, "Username sudah digunakan.", 422);
    }

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO ${TABLE} (nip, nama, level, user, email, warehouse, password) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nip, nama, level, user, email, warehouse, hashed]
    );
    return ok(res, null, "User berhasil ditambahkan.", 201);
  } catch (err) {
    console.error("[user.create]", err);
    return fail(res, "Gagal menambahkan user.", 500);
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { nip, nama, level, user, email, warehouse, password } = req.body;

  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "User tidak ditemukan.", 404);

    // Username unik kecuali untuk user yang sedang diedit (samain dgn rule Laravel unique:...,$id)
    const [dupUser] = await pool.query(`SELECT id FROM ${TABLE} WHERE user = ? AND id != ?`, [user, id]);
    if (dupUser.length > 0) {
      return fail(res, "Username sudah digunakan oleh user lain.", 422);
    }

    if (password && password.length > 0) {
      if (password.length < 4) return fail(res, "Password minimal 4 karakter.", 422);
      const hashed = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE ${TABLE} SET nip=?, nama=?, level=?, user=?, email=?, warehouse=?, password=? WHERE id=?`,
        [nip, nama, level, user, email, warehouse, hashed, id]
      );
    } else {
      // Password kosong -> tidak diubah (samain dgn 'nullable' + $request->filled('password') di Laravel)
      await pool.query(
        `UPDATE ${TABLE} SET nip=?, nama=?, level=?, user=?, email=?, warehouse=? WHERE id=?`,
        [nip, nama, level, user, email, warehouse, id]
      );
    }

    return ok(res, null, "Data berhasil diupdate.");
  } catch (err) {
    console.error("[user.update]", err);
    return fail(res, "Gagal mengupdate user.", 500);
  }
}

async function remove(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "User tidak ditemukan.", 404);

    await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return ok(res, null, "Data berhasil dihapus.");
  } catch (err) {
    console.error("[user.remove]", err);
    return fail(res, "Gagal menghapus user.", 500);
  }
}

module.exports = { list, create, update, remove };
