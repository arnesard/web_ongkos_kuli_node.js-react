const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

// GET /api/master/kuli?search=
async function list(req, res) {
  const { warehouse, isSuperUser, isHOD } = warehouseScope(req.user);
  const { search } = req.query;

  let sql = "SELECT * FROM data_kuli_tbl WHERE 1=1";
  const params = [];

  // Samain dengan MasterController::daftarKuli — non superuser/HOD hanya lihat warehouse-nya sendiri
  if (!isSuperUser && !isHOD) {
    sql += " AND warehouse = ?";
    params.push(warehouse);
  }

  if (search) {
    sql += " AND (nik LIKE ? OR nama_kuli LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += " ORDER BY id DESC";

  try {
    const [rows] = await pool.query(sql, params);
    return ok(res, rows);
  } catch (err) {
    console.error("[kuli.list]", err);
    return fail(res, "Gagal mengambil data kuli.", 500);
  }
}

// POST /api/master/kuli
async function create(req, res) {
  const { warehouse, isSuperUser, isHOD } = warehouseScope(req.user);
  const { nik, nama_kuli, status } = req.body;
  let selectedWarehouse = req.body.warehouse;

  if (!nik || !nama_kuli || !status || !selectedWarehouse) {
    return fail(res, "NIK, nama kuli, status, dan warehouse wajib diisi.", 422);
  }

  // Samain dengan otorisasi create di Laravel: user biasa cuma boleh tambah untuk warehouse sendiri
  if (!isSuperUser && !isHOD) {
    if (selectedWarehouse !== warehouse) {
      return fail(res, "Anda hanya bisa menambah kuli untuk warehouse Anda sendiri.", 403);
    }
    selectedWarehouse = warehouse;
  }

  try {
    await pool.query(
      "INSERT INTO data_kuli_tbl (nik, nama_kuli, status, warehouse) VALUES (?, ?, ?, ?)",
      [nik, nama_kuli, status, selectedWarehouse]
    );
    return ok(res, null, "Kuli berhasil ditambahkan.", 201);
  } catch (err) {
    console.error("[kuli.create]", err);
    return fail(res, "Gagal menambahkan kuli.", 500);
  }
}

// PUT /api/master/kuli/:id
async function update(req, res) {
  const { warehouse, isSuperUser, isHOD } = warehouseScope(req.user);
  const { id } = req.params;
  const { nik, nama_kuli, status } = req.body;
  let selectedWarehouse = req.body.warehouse;

  try {
    const [existingRows] = await pool.query("SELECT * FROM data_kuli_tbl WHERE id = ?", [id]);
    if (existingRows.length === 0) return fail(res, "Data kuli tidak ditemukan.", 404);
    const existing = existingRows[0];

    if (!isSuperUser && !isHOD) {
      if (existing.warehouse !== warehouse) {
        return fail(res, "Anda tidak berhak mengupdate data kuli di luar warehouse Anda.", 403);
      }
      selectedWarehouse = warehouse;
    }

    await pool.query(
      "UPDATE data_kuli_tbl SET nik = ?, nama_kuli = ?, status = ?, warehouse = ? WHERE id = ?",
      [nik, nama_kuli, status, selectedWarehouse ?? existing.warehouse, id]
    );
    return ok(res, null, "Data berhasil diupdate.");
  } catch (err) {
    console.error("[kuli.update]", err);
    return fail(res, "Gagal mengupdate data kuli.", 500);
  }
}

// DELETE /api/master/kuli/:id
async function remove(req, res) {
  const { warehouse, isSuperUser, isHOD } = warehouseScope(req.user);
  const { id } = req.params;

  try {
    const [existingRows] = await pool.query("SELECT * FROM data_kuli_tbl WHERE id = ?", [id]);
    if (existingRows.length === 0) return fail(res, "Data kuli tidak ditemukan.", 404);
    const existing = existingRows[0];

    if (!isSuperUser && !isHOD && existing.warehouse !== warehouse) {
      return fail(res, "Anda tidak berhak menghapus data kuli di luar warehouse Anda.", 403);
    }

    await pool.query("DELETE FROM data_kuli_tbl WHERE id = ?", [id]);
    return ok(res, null, "Data berhasil dihapus.");
  } catch (err) {
    console.error("[kuli.remove]", err);
    return fail(res, "Gagal menghapus data kuli.", 500);
  }
}

module.exports = { list, create, update, remove };
