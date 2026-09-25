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

    // Ambil data user SH & DH berdasarkan warehouse dokumen, serta HOD aktif
    const [[shUser], [hodRows]] = await Promise.all([
      pool.query(
        "SELECT id, nama, level, warehouse FROM data_user_tbl WHERE warehouse = ? ORDER BY id ASC",
        [datas[0].warehouse],
      ),
      pool.query(
        "SELECT id, nama, level FROM data_user_tbl WHERE UPPER(level) = 'HOD' LIMIT 1",
      ),
    ]);

    const hodUser = hodRows[0] || null;

    return ok(res, { datas, shUser, hodUser, title: "Preview BS" });
  } catch (err) {
    console.error("[report.bsReport]", err);
    return fail(res, "Gagal memuat data Bon Sementara.", 500);
  }
}

// GET /api/management/transaksi-lpbs/:no_doc_b64
// Samain dengan ManagementController::lpbsReport
async function lpbsReport(req, res) {
  const no_doc = decodeNoDoc(req.params.no_doc_b64);

  try {
    const [rows] = await pool.query(
      `SELECT * FROM ${TABLE_BON} WHERE no_doc = ? ORDER BY tgl DESC`,
      [no_doc],
    );
    if (rows.length === 0) {
      return fail(res, "Data tidak ditemukan.", 404);
    }

    const first = rows[0];
    const {
      act_nilai,
      status,
      status_bs,
      tgl,
      warehouse,
      approved_sh_lpbs_at,
      approved_dh_lpbs_at,
      approved_hod_lpbs_at,
    } = first;

    const [kendaraanRows] = await pool.query(
      "SELECT nama_kendaraan, biaya_truk FROM data_kendaraan_tbl",
    );
    const [barangRows] = await pool.query(
      "SELECT jenis, ongkos FROM data_barang_tbl",
    );
    const [umRows] = await pool.query(
      "SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ? LIMIT 1",
      [new Date().getFullYear()],
    );
    const shared = {
      biayaTrukArr: Object.fromEntries(
        kendaraanRows.map((item) => [item.nama_kendaraan, item.biaya_truk]),
      ),
      biayaTrukArrJMW: Object.fromEntries(
        barangRows.map((item) => [item.jenis, item.ongkos]),
      ),
      hargaUM: Number(umRows[0]?.harga_uang_makan || 0),
    };

    const breakdown = await computeLpbsBreakdown(tgl, warehouse, shared);
    const datas = [];
    if (breakdown.uraian1)
      datas.push({
        uraian_kegiatan: breakdown.uraian1,
        nilai: breakdown.nilai1,
      });
    if (breakdown.uraian2)
      datas.push({
        uraian_kegiatan: breakdown.uraian2,
        nilai: breakdown.nilai2,
      });
    if (breakdown.uraian3)
      datas.push({
        uraian_kegiatan: breakdown.uraian3,
        nilai: breakdown.nilai3,
      });
    if (breakdown.uraian4)
      datas.push({
        uraian_kegiatan: breakdown.uraian4,
        nilai: breakdown.nilai4,
      });

    // Ambil data user SH & DH per warehouse dokumen, serta HOD aktif
    const [[shUser], [hodRows]] = await Promise.all([
      pool.query(
        "SELECT id, nama, level, warehouse FROM data_user_tbl WHERE warehouse = ? ORDER BY id ASC",
        [warehouse],
      ),
      pool.query(
        "SELECT id, nama, level FROM data_user_tbl WHERE UPPER(level) = 'HOD' LIMIT 1",
      ),
    ]);

    const hodUser = hodRows[0] || null;

    return ok(res, {
      datas,
      shUser,
      hodUser,
      title: "Preview LPBS",
      no_doc,
      tanggal: tgl,
      status,
      status_bs,
      act_nilai: act_nilai || 0,
      pembulatan: roundToHundred(breakdown.total_nilai),
      approved_sh_lpbs_at,
      approved_dh_lpbs_at,
      approved_hod_lpbs_at,
    });
  } catch (err) {
    console.error("[report.lpbsReport]", err);
    return fail(res, "Gagal memuat data LPBS.", 500);
  }
}

module.exports = { bsReport, lpbsReport };
