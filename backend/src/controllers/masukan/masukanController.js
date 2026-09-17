const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

// POST /api/masukan — siapa aja yang login boleh kirim masukan
async function create(req, res) {
  const { subjek, pesan } = req.body;
  const { nip, nama, level, warehouse } = req.user || {};

  if (!subjek || !pesan) {
    return fail(res, "Subjek dan pesan wajib diisi.", 422);
  }

  try {
    await pool.query(
      "INSERT INTO masukan_tbl (nip, nama, level, warehouse, subjek, pesan) VALUES (?, ?, ?, ?, ?, ?)",
      [nip || null, nama || null, level || null, warehouse || null, subjek, pesan],
    );
    return ok(res, null, "Masukan berhasil dikirim.", 201);
  } catch (err) {
    console.error("[masukan.create]", err);
    return fail(res, "Gagal mengirim masukan.", 500);
  }
}

// GET /api/masukan — cuma SuperUser/HOD/DH yang boleh lihat daftar masukan
async function list(req, res) {
  const { isHighLevel } = warehouseScope(req.user);
  const isDH = req.user?.level === "DH";
  if (!isHighLevel && !isDH) {
    return fail(res, "Anda tidak berhak melihat daftar masukan.", 403);
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM masukan_tbl ORDER BY created_at DESC",
    );
    return ok(res, rows);
  } catch (err) {
    console.error("[masukan.list]", err);
    return fail(res, "Gagal mengambil data masukan.", 500);
  }
}

// DELETE /api/masukan/:id — cuma SuperUser/HOD/DH
async function remove(req, res) {
  const { isHighLevel } = warehouseScope(req.user);
  const isDH = req.user?.level === "DH";
  if (!isHighLevel && !isDH) {
    return fail(res, "Anda tidak berhak menghapus masukan.", 403);
  }

  const { id } = req.params;
  try {
    const [existingRows] = await pool.query(
      "SELECT id FROM masukan_tbl WHERE id = ?",
      [id],
    );
    if (existingRows.length === 0) {
      return fail(res, "Masukan tidak ditemukan.", 404);
    }

    await pool.query("DELETE FROM masukan_tbl WHERE id = ?", [id]);
    return ok(res, null, "Masukan berhasil dihapus.");
  } catch (err) {
    console.error("[masukan.remove]", err);
    return fail(res, "Gagal menghapus masukan.", 500);
  }
}

module.exports = { create, list, remove };
