const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");
const { computeLpbsBreakdown, roundToHundred } = require("./approveController");

const TABLE_BON = "data_bonsementara_tbl";

// ==========================================================================
// Disamakan 1:1 dengan ManagementController::bsReport & ::lpbsReport
// (resources/views/management/transaksi-bs.blade.php & transaksi-lpbs.blade.php)
// ==========================================================================

function decodeNoDoc(encoded) {
  // Laravel: base64_decode($no_docs) dari segmen URL {no_doc}.
  return Buffer.from(decodeURIComponent(encoded), "base64").toString("utf8");
}

// GET /api/management/transaksi-bs/:no_doc_b64
// Samain dengan ManagementController::bsReport
async function bsReport(req, res) {
  const { isSuperUser, isHOD, warehouse } = warehouseScope(req.user);
  const level = req.user.level;
  const no_doc = decodeNoDoc(req.params.no_doc_b64);

  let sql = `SELECT * FROM ${TABLE_BON} WHERE 1=1`;
  const params = [];

  if (!isSuperUser && !isHOD) {
    sql += " AND warehouse = ?";
    params.push(warehouse);
  }
  if (level === "SH") {
    sql += " AND (status_bs IS NULL OR status_bs = '')";
  } else if (level === "DH") {
    sql += " AND status_bs = ?";
    params.push("approvebysh");
  } else if (level === "HOD") {
    sql += " AND status_bs = ?";
    params.push("approvebydh");
  }

  sql += " AND no_doc = ? ORDER BY tgl DESC";
  params.push(no_doc);

  try {
    const [datas] = await pool.query(sql, params);
    if (datas.length === 0) {
      return fail(res, "Data tidak ditemukan.", 404);
    }

    const [shUser] = await pool.query(
      "SELECT id, nama, level, warehouse FROM data_user_tbl WHERE warehouse = ? ORDER BY id ASC",
      [datas[0].warehouse]
    );

    return ok(res, { datas, shUser, title: "Preview BS" });
  } catch (err) {
    console.error("[report.bsReport]", err);
    return fail(res, "Gagal memuat data Bon Sementara.", 500);
  }
}

// GET /api/management/transaksi-lpbs/:no_doc_b64
// Samain dengan ManagementController::lpbsReport — nilai per baris DIHITUNG ULANG
// live dari transaksi hari itu (bukan dari kolom `nilai` yang tersimpan), persis
// seperti computeLpbsBreakdown yang dipakai approveController buat tab LPBS.
async function lpbsReport(req, res) {
  const no_doc = decodeNoDoc(req.params.no_doc_b64);

  try {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE_BON} WHERE no_doc = ? ORDER BY tgl DESC`, [no_doc]);
    if (rows.length === 0) {
      return fail(res, "Data tidak ditemukan.", 404);
    }

    const first = rows[0];
    const { act_nilai, status, status_bs, tgl, warehouse } = first;

    const breakdown = await computeLpbsBreakdown(tgl, warehouse);
    const datas = [];
    if (breakdown.uraian1) datas.push({ uraian_kegiatan: breakdown.uraian1, nilai: breakdown.nilai1 });
    if (breakdown.uraian2) datas.push({ uraian_kegiatan: breakdown.uraian2, nilai: breakdown.nilai2 });
    if (breakdown.uraian3) datas.push({ uraian_kegiatan: breakdown.uraian3, nilai: breakdown.nilai3 });
    if (breakdown.uraian4) datas.push({ uraian_kegiatan: breakdown.uraian4, nilai: breakdown.nilai4 });

    const [shUser] = await pool.query(
      "SELECT id, nama, level, warehouse FROM data_user_tbl WHERE warehouse = ? ORDER BY id ASC",
      [warehouse]
    );

    return ok(res, {
      datas,
      shUser,
      title: "Preview LPBS",
      no_doc,
      tanggal: tgl,
      status,
      status_bs,
      act_nilai: act_nilai || 0,
      pembulatan: roundToHundred(breakdown.total_nilai),
    });
  } catch (err) {
    console.error("[report.lpbsReport]", err);
    return fail(res, "Gagal memuat data LPBS.", 500);
  }
}

module.exports = { bsReport, lpbsReport };
