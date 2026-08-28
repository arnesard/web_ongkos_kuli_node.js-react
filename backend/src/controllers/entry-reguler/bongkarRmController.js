const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");
const { buildPrefixedNoTrip, isDateInAllowedRange, isExactDuplicate } = require("./transaksiTrukHelper");

const TABLE = "data_transaksi_tbl";

// GET /api/entry-reguler/bongkar-rm?tgl=&customer=&no_trip=
// Samain dengan OngkosController::indexBongkarrm (join ke data_barang_tbl -> ongkos)
async function list(req, res) {
  const { warehouse, isSuperUser } = warehouseScope(req.user);
  const { tgl, customer, no_trip } = req.query;

  let sql = `
    SELECT dt.*, dk.ongkos, (dt.qty_truk * dk.ongkos) AS total_biaya
    FROM ${TABLE} dt
    LEFT JOIN data_barang_tbl dk ON dt.jenis_truk = dk.jenis
    WHERE 1=1`;
  const params = [];

  if (!isSuperUser) {
    sql += " AND dt.warehouse = ?";
    params.push(warehouse);
  }
  if (tgl) {
    sql += " AND DATE(dt.tgl) = ?";
    params.push(tgl);
  } else {
    sql += " AND DATE(dt.tgl) = CURDATE()";
  }
  if (customer) {
    sql += " AND dt.customer LIKE ?";
    params.push(`%${customer}%`);
  }
  if (no_trip) {
    sql += " AND dt.no_trip LIKE ?";
    params.push(`%${no_trip}%`);
  }
  sql += " ORDER BY dt.id DESC";

  try {
    const [datas] = await pool.query(sql, params);

    const [countRows] = await pool.query(
      `SELECT no_trip, COUNT(DISTINCT id_kuli) AS count_kuli FROM ${TABLE} WHERE warehouse = ? GROUP BY no_trip`,
      [warehouse]
    );
    const countKuliPerTrip = {};
    countRows.forEach((r) => (countKuliPerTrip[r.no_trip] = r.count_kuli));

    const [jenisBarangRows] = await pool.query("SELECT * FROM data_barang_tbl ORDER BY jenis");

    return ok(res, { datas, countKuliPerTrip, jenis_barang: jenisBarangRows });
  } catch (err) {
    console.error("[bongkarRm.list]", err);
    return fail(res, "Gagal mengambil data bongkar RM.", 500);
  }
}

// POST /api/entry-reguler/bongkar-rm
async function create(req, res) {
  const { warehouse } = warehouseScope(req.user);
  const body = req.body;
  const required = ["tgl", "market", "customer", "kota", "jam_bongkar", "no_trip", "qty_truk", "jenis_truk", "pa", "nopol", "driver", "jam_masuk", "id_kuli"];
  for (const f of required) {
    if (!body[f] && body[f] !== 0) return fail(res, `Field ${f} wajib diisi.`, 422);
  }

  if (!isDateInAllowedRange(body.tgl)) {
    return fail(res, "Tanggal hanya diperbolehkan H-4, H, atau H+4 dari hari ini.", 422);
  }

  const no_trip = buildPrefixedNoTrip(body.tgl, body.no_trip);
  const ket = (body.ket || "").trim() || null;

  const duplicate = await isExactDuplicate({
    tgl: body.tgl, market: body.market, customer: body.customer, kota: body.kota,
    jam_bongkar: body.jam_bongkar, no_trip, qty_truk: body.qty_truk, jenis_truk: body.jenis_truk,
    pa: body.pa, nopol: body.nopol, driver: body.driver, jam_masuk: body.jam_masuk,
    ket, id_kuli: body.id_kuli, warehouse,
  });
  if (duplicate) {
    return fail(res, "Data transaksi ini sudah tercatat lengkap. Entri ini adalah duplikat.", 422);
  }

  try {
    await pool.query(
      `INSERT INTO ${TABLE} (tgl, market, customer, kota, jam_bongkar, no_trip, qty_truk, jenis_truk, pa, nopol, driver, jam_masuk, ket, id_kuli, warehouse)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [body.tgl, body.market, body.customer, body.kota, body.jam_bongkar, no_trip, body.qty_truk, body.jenis_truk, body.pa, body.nopol, body.driver, body.jam_masuk, ket, body.id_kuli, warehouse]
    );
    return ok(res, null, "Data berhasil disimpan!", 201);
  } catch (err) {
    console.error("[bongkarRm.create]", err);
    return fail(res, "Gagal menyimpan data.", 500);
  }
}

// PUT /api/entry-reguler/bongkar-rm/:id
async function update(req, res) {
  const { id } = req.params;
  const body = req.body;

  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    const no_trip = buildPrefixedNoTrip(body.tgl, body.no_trip);
    const ket = (body.ket || "").trim() || null;

    await pool.query(
      `UPDATE ${TABLE} SET tgl=?, market=?, customer=?, kota=?, jam_bongkar=?, no_trip=?, qty_truk=?, jenis_truk=?, pa=?, nopol=?, driver=?, jam_masuk=?, ket=?, id_kuli=? WHERE id=?`,
      [body.tgl, body.market, body.customer, body.kota, body.jam_bongkar, no_trip, body.qty_truk, body.jenis_truk, body.pa, body.nopol, body.driver, body.jam_masuk, ket, body.id_kuli, id]
    );
    return ok(res, null, "Data berhasil diperbarui!");
  } catch (err) {
    console.error("[bongkarRm.update]", err);
    return fail(res, "Gagal memperbarui data.", 500);
  }
}

// DELETE /api/entry-reguler/bongkar-rm/:id
async function remove(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);
    await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return ok(res, null, "Data berhasil dihapus!");
  } catch (err) {
    console.error("[bongkarRm.remove]", err);
    return fail(res, "Gagal menghapus data.", 500);
  }
}

module.exports = { list, create, update, remove };
