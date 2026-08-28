const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

// Catatan: Laravel punya alur approval berjenjang (SH -> DH -> HOD) yang sangat
// panjang (>1000 baris, termasuk kirim email). Versi Node.js ini mengambil
// inti alurnya: status berjalan SH -> DH -> HOD -> Approved, reject di level
// manapun langsung menutup dokumen. Silakan dikembangkan lebih lanjut sesuai
// kebutuhan notifikasi email/tanda tangan digital.

const NEXT_STATUS = {
  "": "approvebysh",
  null: "approvebysh",
  approvebysh: "approvebydh",
  approvebydh: "approvebyhod",
};

// GET /api/management/approve-bongkarmuat?status=&search_date=
async function list(req, res) {
  const { warehouse, isSuperUser, isHOD } = warehouseScope(req.user);
  const level = req.user.level;
  const { status, search_date } = req.query;

  let sql = "SELECT * FROM data_bonsementara_tbl WHERE 1=1";
  const params = [];

  if (!isSuperUser && !isHOD) {
    sql += " AND warehouse = ?";
    params.push(warehouse);
  }

  if (status === "onprocess") {
    sql += " AND (status IS NULL OR status = '')";
  } else if (status) {
    if (status === "reject") {
      sql += " AND status LIKE '%reject%'";
    } else {
      sql += " AND status = ?";
      params.push(status);
    }
  } else {
    // Filter default berdasarkan level approver, samain dgn Laravel
    if (level === "SH") sql += " AND (status IS NULL OR status = '')";
    else if (level === "DH") {
      sql += " AND status = ?";
      params.push("approvebysh");
    } else if (level === "HOD") {
      sql += " AND status = ?";
      params.push("approvebydh");
    }
  }

  if (search_date) {
    sql += " AND DATE(tgl) = ?";
    params.push(search_date);
  }

  sql += " ORDER BY tgl DESC";

  try {
    const [rows] = await pool.query(sql, params);
    return ok(res, rows);
  } catch (err) {
    console.error("[approveBongkarmuat.list]", err);
    return fail(res, "Gagal mengambil data approval.", 500);
  }
}

// POST /api/management/approve-bongkarmuat/:no_doc  { action: "approve" | "reject" }
async function process(req, res) {
  const { no_doc } = req.params;
  const { action } = req.body;
  const level = req.user.level;

  try {
    const [rows] = await pool.query("SELECT * FROM data_bonsementara_tbl WHERE no_doc = ? LIMIT 1", [no_doc]);
    if (rows.length === 0) return fail(res, "Dokumen tidak ditemukan.", 404);

    let newStatus;
    if (action === "reject") {
      newStatus = `reject_${(level || "").toLowerCase()}`;
    } else {
      const current = rows[0].status || "";
      newStatus = NEXT_STATUS[current] || "approved";
    }

    await pool.query("UPDATE data_bonsementara_tbl SET status = ? WHERE no_doc = ?", [newStatus, no_doc]);
    return ok(res, { status: newStatus }, "Dokumen berhasil diproses.");
  } catch (err) {
    console.error("[approveBongkarmuat.process]", err);
    return fail(res, "Gagal memproses dokumen.", 500);
  }
}

module.exports = { list, process };
