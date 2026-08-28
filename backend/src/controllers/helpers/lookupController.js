const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

// GET /api/helpers/customer?market=&customer=
async function customer(req, res) {
  const marketInput = String(req.query.market || "").toUpperCase().trim();
  const customerInput = req.query.customer || "";

  try {
    let sql = "SELECT DISTINCT customer FROM data_kota_tbl WHERE 1=1";
    const params = [];
    if (marketInput === "-") {
      // ambil semua
    } else if (marketInput === "EXPORT" || marketInput === "IMPORT") {
      sql += " AND market = 'EXPORT'";
    } else {
      sql += " AND market = 'LOKAL'";
    }
    sql += " ORDER BY customer";
    const [customerRows] = await pool.query(sql, params);

    const [cityRows] = await pool.query(
      "SELECT DISTINCT nama_kota FROM data_kota_tbl WHERE customer = ? ORDER BY nama_kota",
      [customerInput]
    );

    return ok(res, {
      last_kode: customerRows.map((r) => r.customer),
      city: cityRows.map((r) => r.nama_kota),
    });
  } catch (err) {
    console.error("[helpers.customer]", err);
    return fail(res, "Gagal mengambil data customer.", 500);
  }
}

// GET /api/helpers/kuli-list
async function kuliList(req, res) {
  const { warehouse, isSuperUser } = warehouseScope(req.user);

  try {
    let sql = "SELECT nik, nama_kuli, warehouse FROM data_kuli_tbl WHERE 1=1";
    const params = [];
    if (!isSuperUser) {
      sql += " AND warehouse = ?";
      params.push(warehouse);
    }
    sql += " ORDER BY nama_kuli";
    const [rows] = await pool.query(sql, params);
    return ok(res, { kuli: rows });
  } catch (err) {
    console.error("[helpers.kuliList]", err);
    return fail(res, "Gagal mengambil daftar kuli.", 500);
  }
}

// GET /api/helpers/get-last-kode?tgl=&jenis=muat_fg|bongkar_rm|susun_lantai&market=
async function getLastKode(req, res) {
  const { warehouse } = warehouseScope(req.user);
  const { tgl, jenis, market } = req.query;

  if (!tgl || !jenis) return ok(res, { last_kode: null });

  let table = "data_transaksi_susunlantai_tbl";
  let field = "kode_transaksi";
  let suffix = null;

  if (jenis === "muat_fg") {
    table = "data_transaksi_tbl";
    field = "no_trip";
    if (market === "Export") suffix = "E";
    else if (market === "Import") suffix = "I";
    else return ok(res, { last_kode: null });
  } else if (jenis === "bongkar_rm") {
    table = "data_transaksi_tbl";
    field = "no_trip";
    suffix = "Z";
  } else if (jenis !== "susun_lantai") {
    return ok(res, { last_kode: null });
  }

  try {
    let sql = `SELECT ${field} FROM ${table} WHERE DATE(tgl) = ? AND warehouse = ?`;
    const params = [tgl, warehouse];
    if (suffix) {
      sql += ` AND ${field} LIKE ?`;
      params.push(`%${suffix}%`);
    }
    sql += ` ORDER BY ${field} DESC LIMIT 1`;

    const [rows] = await pool.query(sql, params);
    return ok(res, { last_kode: rows[0]?.[field] ?? null });
  } catch (err) {
    console.error("[helpers.getLastKode]", err);
    return fail(res, "Gagal mengambil kode terakhir.", 500);
  }
}

// GET /api/helpers/get-trip-data?tgl=&no_trip=
// Catatan: di Laravel data ini berasal dari koneksi database KEDUA (Oracle shipment,
// model DataTrip::connection('mysql_second')). Endpoint ini disediakan sebagai
// placeholder — sambungkan ke sumber data trip Anda bila tersedia.
async function getTripData(req, res) {
  return ok(res, { status: "not_found" });
}

module.exports = { customer, kuliList, getLastKode, getTripData };
