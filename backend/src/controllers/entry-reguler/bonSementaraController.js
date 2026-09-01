const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

const TABLE = "data_bonsementara_tbl";

// GET /api/entry-reguler/bon-sementara?bulan=YYYY-MM&no_doc=&cari=1
// Samain dengan OngkosController::indexBonSementara
async function list(req, res) {
  const { warehouse, isSuperUser } = warehouseScope(req.user);
  const { bulan, no_doc, cari } = req.query;

  let sql = `SELECT * FROM ${TABLE} WHERE 1=1`;
  const params = [];

  if (!isSuperUser) {
    sql += " AND warehouse = ?";
    params.push(warehouse);
  }

  if (bulan) {
    // bulan format "YYYY-MM"
    sql += " AND DATE_FORMAT(tgl, '%Y-%m') = ?";
    params.push(bulan);
  } else {
    sql += " AND tgl = CURDATE()";
  }

  sql += " ORDER BY tgl DESC";

  try {
    const [data] = await pool.query(sql, params);

    // Distinct no_doc list (untuk dropdown pencarian)
    let noDocSql = `SELECT DISTINCT no_doc FROM ${TABLE} WHERE 1=1`;
    const noDocParams = [];
    if (!isSuperUser) {
      noDocSql += " AND warehouse = ?";
      noDocParams.push(warehouse);
    }
    const [noDocRows] = await pool.query(noDocSql, noDocParams);

    let dataCari = [];
    let totalNilai = 0;
    let totalActNilai = 0;
    let statusBS = null;

    if (cari && no_doc) {
      let cariSql = `SELECT * FROM ${TABLE} WHERE LOWER(no_doc) = ?`;
      const cariParams = [String(no_doc).toLowerCase()];
      if (!isSuperUser) {
        cariSql += " AND warehouse = ?";
        cariParams.push(warehouse);
      }
      const [cariRows] = await pool.query(cariSql, cariParams);
      dataCari = cariRows;
      totalNilai = cariRows.reduce((sum, r) => sum + Number(r.nilai || 0), 0);
      totalActNilai = cariRows[0]?.act_nilai ?? 0;
      statusBS = cariRows[0]?.status_bs ?? null; // fix: kolom aslinya status_bs, bukan status
    }

    return ok(res, {
      data,
      noDocs: noDocRows.map((r) => r.no_doc),
      dataCari,
      totalNilai,
      totalActNilai,
      statusBS,
    });
  } catch (err) {
    console.error("[bonSementara.list]", err);
    return fail(res, "Gagal mengambil data bon sementara.", 500);
  }
}

// POST /api/entry-reguler/bon-sementara
async function create(req, res) {
  const { warehouse } = warehouseScope(req.user);
  const { tgl, no_doc, uraian_kegiatan, nilai } = req.body;

  if (!tgl || !no_doc || !uraian_kegiatan || !nilai) {
    return fail(res, "Tanggal, no dokumen, uraian kegiatan, dan nilai wajib diisi.", 422);
  }

  // Samain dengan mutator DataBonsementara::nilai() -> hapus titik ribuan
  const cleanNilai = String(nilai).replace(/\./g, "");

  try {
    await pool.query(
      `INSERT INTO ${TABLE} (tgl, no_doc, uraian_kegiatan, nilai, warehouse) VALUES (?, ?, ?, ?, ?)`,
      [tgl, String(no_doc).toUpperCase(), uraian_kegiatan, cleanNilai, String(warehouse).toUpperCase()]
    );
    return ok(res, null, "Data berhasil ditambahkan.", 201);
  } catch (err) {
    console.error("[bonSementara.create]", err);
    return fail(res, "Gagal menambahkan data.", 500);
  }
}

// PUT /api/entry-reguler/bon-sementara/:id
async function update(req, res) {
  const { id } = req.params;
  const { tgl, no_doc, uraian_kegiatan, nilai } = req.body;

  if (!tgl || !no_doc || !uraian_kegiatan || !nilai) {
    return fail(res, "Tanggal, no dokumen, uraian kegiatan, dan nilai wajib diisi.", 422);
  }
  const cleanNilai = String(nilai).replace(/\./g, "");

  try {
    const [rows] = await pool.query(`SELECT id, status_bs FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    if (rows[0].status_bs) {
      return fail(res, "Data sudah di-approve, tidak bisa diedit lagi.", 403);
    }

    await pool.query(
      `UPDATE ${TABLE} SET tgl=?, no_doc=?, uraian_kegiatan=?, nilai=? WHERE id=?`,
      [tgl, String(no_doc).toUpperCase(), uraian_kegiatan, cleanNilai, id]
    );
    return ok(res, null, "Data berhasil diperbarui.");
  } catch (err) {
    console.error("[bonSementara.update]", err);
    return fail(res, "Gagal memperbarui data.", 500);
  }
}

// DELETE /api/entry-reguler/bon-sementara/:id
async function remove(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`SELECT id, status_bs FROM ${TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return fail(res, "Data tidak ditemukan.", 404);

    if (rows[0].status_bs) {
      return fail(res, "Data sudah di-approve, tidak bisa dihapus.", 403);
    }

    await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return ok(res, null, "Data berhasil dihapus!");
  } catch (err) {
    console.error("[bonSementara.remove]", err);
    return fail(res, "Gagal menghapus data.", 500);
  }
}

// POST /api/entry-reguler/bon-sementara/input-aktual
// Samain dengan OngkosController::inputAktual
// Murni role-based: SuperUser selalu boleh isi (approved atau belum), level lain (termasuk admin) sama sekali tidak boleh
async function inputAktual(req, res) {
  const level = String(req.user?.level || "").toLowerCase();
  if (level !== "superuser") {
    return fail(res, "Hanya SuperUser yang boleh mengisi nilai aktual.", 403);
  }

  const { no_doc, act_nilai } = req.body;
  if (!no_doc || act_nilai === undefined) {
    return fail(res, "No dokumen dan nilai aktual wajib diisi.", 422);
  }
  const cleaned = String(act_nilai).replace(/\./g, "");

  try {
    await pool.query(`UPDATE ${TABLE} SET act_nilai = ? WHERE no_doc = ?`, [cleaned, no_doc]);
    return ok(res, null, "Nilai aktual berhasil disimpan!");
  } catch (err) {
    console.error("[bonSementara.inputAktual]", err);
    return fail(res, "Gagal menyimpan nilai aktual.", 500);
  }
}

// GET /api/entry-reguler/bon-sementara/recent?limit=20&bulanKode=YYYY-MM
// Dipakai modal "Cari No Dokumen" biar begitu dibuka langsung nampilin data terbaru
// (bukan kosong), diurutkan tgl terbaru dulu. bulanKode -> filter berdasarkan
// bulan/tahun yang KE-EMBED di ekor no_doc (format ".../MM/YYYY", contoh
// "981/GAC/09/2026" -> "09/2026"), BUKAN kolom tgl transaksi.
async function recent(req, res) {
  const { warehouse, isSuperUser } = warehouseScope(req.user);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const { bulanKode } = req.query;

  let sql = `SELECT * FROM ${TABLE} WHERE 1=1`;
  const params = [];

  if (!isSuperUser) {
    sql += " AND warehouse = ?";
    params.push(warehouse);
  }

  if (bulanKode) {
    const [yyyy, mm] = String(bulanKode).split("-");
    if (yyyy && mm) {
      sql += " AND no_doc LIKE ?";
      params.push(`%/${mm}/${yyyy}`);
    }
  }

  sql += " ORDER BY tgl DESC, id DESC LIMIT ?";
  params.push(limit);

  try {
    const [rows] = await pool.query(sql, params);
    return ok(res, { data: rows });
  } catch (err) {
    console.error("[bonSementara.recent]", err);
    return fail(res, "Gagal mengambil data terbaru.", 500);
  }
}

module.exports = { list, create, update, remove, inputAktual, recent };
