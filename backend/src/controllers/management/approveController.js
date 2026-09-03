const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

const TABLE_BON = "data_bonsementara_tbl";

// ==========================================================================
// Disamakan 1:1 dengan ManagementController::approveBongkarMuat +
// ::prosesApprove + AppServiceProvider (composer pendingBonBSCount/LPBSCount).
//
// Ada 2 KATEGORI approval yang sama-sama jalan lewat tabel data_bonsementara_tbl,
// bedanya cuma kolom status yang dipakai:
//   - kategori "bs"   -> kolom `status_bs`  (approval pengajuan Bon Sementara awal)
//   - kategori "lpbs" -> kolom `status`     (approval Laporan Penyelesaian Bon
//                        Sementara — nilainya DIHITUNG ULANG live dari transaksi
//                        asli hari itu, BUKAN dari kolom `nilai` yang tersimpan.
//                        Persis logic yang sama dipakai balanceCashController.js)
//
// Jenjang approval: kosong -(SH)-> approvebysh -(DH)-> approvebydh -(HOD)-> approve
// Reject di level manapun -> "reject" (final, gak bisa diproses lagi).
// ==========================================================================

function roundToHundred(value) {
  const intVal = Math.round(value);
  const lastTwo = intVal % 100;
  if (lastTwo === 50) return Math.floor(intVal / 100) * 100;
  if (lastTwo > 50) return Math.ceil(intVal / 100) * 100;
  return Math.floor(intVal / 100) * 100;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Hitung breakdown nilai LPBS on-the-fly dari transaksi asli hari itu (dan H+1,
// H+2 kalau tgl jatuh hari Jumat — kompensasi weekend, sama kayak balanceCash).
async function computeLpbsBreakdown(tgl, warehouse) {
  const dayOfWeek = new Date(tgl).getDay(); // JS: Minggu=0 ... Jumat=5 (sama posisinya dgn PHP date('N')==5)
  const rangeTgl = dayOfWeek === 5 ? [tgl, addDays(tgl, 1), addDays(tgl, 2)] : [tgl];
  const placeholders = rangeTgl.map(() => "?").join(",");
  const isJMW = String(warehouse).toLowerCase() === "jmw";

  const [kendaraanRows] = await pool.query("SELECT nama_kendaraan, biaya_truk FROM data_kendaraan_tbl");
  const biayaTrukArr = {};
  kendaraanRows.forEach((k) => (biayaTrukArr[k.nama_kendaraan] = k.biaya_truk));
  const [barangRows] = await pool.query("SELECT jenis, ongkos FROM data_barang_tbl");
  const biayaTrukArrJMW = {};
  barangRows.forEach((b) => (biayaTrukArrJMW[b.jenis] = b.ongkos));

  // 1. Ongkos Bongkar/Muat (unik per tgl+no_trip+jenis_truk)
  const [transaksiTruk] = await pool.query(
    `SELECT tgl, no_trip, jenis_truk, qty_truk FROM data_transaksi_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
    [...rangeTgl, warehouse]
  );
  const qtyPerTruk = {};
  const seenGroup = new Set();
  transaksiTruk.forEach((row) => {
    const gk = `${row.tgl}|${row.no_trip}|${row.jenis_truk}`;
    if (seenGroup.has(gk)) return;
    seenGroup.add(gk);
    const qty = Number(String(row.qty_truk || 0).replace(",", "."));
    qtyPerTruk[row.jenis_truk] = (qtyPerTruk[row.jenis_truk] || 0) + qty;
  });
  let nilai1 = 0;
  const trukString = [];
  Object.entries(qtyPerTruk).forEach(([jenisTruk, qty]) => {
    const biaya = isJMW ? biayaTrukArrJMW[jenisTruk] || 0 : biayaTrukArr[jenisTruk] || 0;
    if (qty > 0 && biaya > 0) {
      nilai1 += qty * biaya;
      trukString.push(`${qty} ${jenisTruk}`);
    }
  });
  const uraian1 = trukString.length ? `ONGKOS BONGKAR/MUAT : ${trukString.join(", ")}` : null;

  // 2. Uang Makan Kuli
  const [umRow] = await pool.query("SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ?", [
    new Date().getFullYear(),
  ]);
  const hargaUM = umRow[0]?.harga_uang_makan || 0;
  const [kuliCountRow] = await pool.query(
    `SELECT COUNT(DISTINCT id_kuli) AS cnt FROM data_transaksi_uangmakankuli_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
    [...rangeTgl, warehouse]
  );
  const kuliCount = kuliCountRow[0]?.cnt || 0;
  const nilai2 = kuliCount * hargaUM;
  const uraian2 = kuliCount > 0 ? `ONGKOS UANG MAKAN KULI : ${kuliCount} KULI` : null;

  // 3. Susun Lantai (unik per kode_transaksi+tgl)
  const [susunRows] = await pool.query(
    `SELECT jenis_truk, kubikasi, kode_transaksi, tgl FROM data_transaksi_susunlantai_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
    [...rangeTgl, warehouse]
  );
  const susunGrouped = {};
  susunRows.forEach((r) => {
    const k = `${r.kode_transaksi}|${r.tgl}`;
    (susunGrouped[k] = susunGrouped[k] || []).push(r);
  });
  let nilai3 = 0;
  Object.values(susunGrouped).forEach((items) => {
    const first = items[0];
    const biayaPerTruk = biayaTrukArr[first.jenis_truk] || 0;
    if (first.kubikasi > 0 && biayaPerTruk > 0) nilai3 += first.kubikasi * biayaPerTruk;
  });
  const jumlahKegiatanSusun = new Set(susunRows.map((r) => r.kode_transaksi)).size;
  const uraian3 = nilai3 > 0 ? `ONGKOS SUSUN LANTAI : ${jumlahKegiatanSusun} KEGIATAN` : null;

  // 4. Pemindahan Barang
  const [pemindahanRows] = await pool.query(
    `SELECT biaya_retribusi, biaya_security, biaya_parkir, biaya_uangjalan FROM data_transaksi_pemindahanbarang_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
    [...rangeTgl, warehouse]
  );
  let nilai4 = 0;
  pemindahanRows.forEach((p) => {
    nilai4 +=
      Number(p.biaya_retribusi || 0) +
      Number(p.biaya_security || 0) +
      Number(p.biaya_parkir || 0) +
      Number(p.biaya_uangjalan || 0);
  });
  const uraian4 = pemindahanRows.length > 0 ? `ONGKOS PEMINDAHAN BARANG : ${pemindahanRows.length} RITASE` : null;

  const total_nilai = nilai1 + nilai2 + nilai3 + nilai4;
  const uraian_kegiatan = [uraian1, uraian2, uraian3, uraian4].filter(Boolean).join("\n");

  return { uraian_kegiatan, nilai1, nilai2, nilai3, nilai4, total_nilai, pembulatan: roundToHundred(total_nilai) };
}

// Badge angka pending di tombol tab BS/LPBS — samain dgn View::composer di
// AppServiceProvider (dipanggil di halaman approve, bukan global kayak Laravel,
// biar gak nambah query di SETIAP halaman lain).
async function computePendingCounts(user) {
  const level = user?.level;
  const warehouse = user?.warehouse;
  if (!level) return { bs: 0, lpbs: 0 };

  const lvl = String(level).toLowerCase();
  let bsWhere = "b.nilai IS NOT NULL";
  let lpbsWhere = "b.nilai IS NOT NULL";
  const bsParams = [];
  const lpbsParams = [];

  if (lvl === "sh") {
    bsWhere += " AND (b.status_bs IS NULL OR b.status_bs = '') AND b.warehouse = ?";
    bsParams.push(warehouse);
    lpbsWhere += " AND (b.status IS NULL OR b.status = '') AND b.warehouse = ?";
    lpbsParams.push(warehouse);
  } else if (lvl === "dh") {
    bsWhere += " AND b.status_bs = ? AND b.warehouse = ?";
    bsParams.push("approvebysh", warehouse);
    lpbsWhere += " AND b.status = ? AND b.warehouse = ?";
    lpbsParams.push("approvebysh", warehouse);
  } else if (lvl === "hod") {
    bsWhere += " AND b.status_bs = ?";
    bsParams.push("approvebydh");
    lpbsWhere += " AND b.status = ?";
    lpbsParams.push("approvebydh");
  } else if (lvl === "admin" || lvl === "superuser") {
    bsWhere += " AND (b.status_bs IS NULL OR b.status_bs IN ('', 'approvebysh', 'approvebydh'))";
    lpbsWhere += " AND (b.status IS NULL OR b.status IN ('', 'approvebysh', 'approvebydh'))";
  } else {
    return { bs: 0, lpbs: 0 };
  }

  try {
    const [bsRows] = await pool.query(
      `SELECT COUNT(DISTINCT b.no_doc) AS cnt FROM ${TABLE_BON} b WHERE ${bsWhere}`,
      bsParams
    );
    // LPBS cuma dihitung kalau tanggalnya beneran punya transaksi (whereExists di Laravel)
    const [lpbsRows] = await pool.query(
      `SELECT COUNT(DISTINCT b.no_doc) AS cnt FROM ${TABLE_BON} b
       WHERE ${lpbsWhere}
       AND EXISTS (
         SELECT 1 FROM data_transaksi_tbl dt
         WHERE dt.tgl = b.tgl AND dt.warehouse = b.warehouse
       )`,
      lpbsParams
    );
    return { bs: bsRows[0]?.cnt || 0, lpbs: lpbsRows[0]?.cnt || 0 };
  } catch (err) {
    console.error("[approveBongkarmuat.computePendingCounts]", err);
    return { bs: 0, lpbs: 0 };
  }
}

// GET /api/management/approve-bongkarmuat?tab=bs|lpbs&status=&search_date=
async function list(req, res) {
  const { warehouse, isSuperUser, isHOD } = warehouseScope(req.user);
  const level = req.user.level;
  const { tab, status, search_date } = req.query;

  const pendingCounts = await computePendingCounts(req.user);

  // Belum pilih tab -> cuma kirim badge count, sama seperti tampilan awal Laravel
  // ("Tekan Tombol Kategori")
  if (tab !== "bs" && tab !== "lpbs") {
    return ok(res, { tab: null, groupedData: [], pendingCounts });
  }

  const isLpbs = tab === "lpbs";
  const statusColumn = isLpbs ? "status" : "status_bs";

  let sql = `SELECT * FROM ${TABLE_BON} WHERE 1=1`;
  const params = [];
  if (!isSuperUser && !isHOD) {
    sql += " AND warehouse = ?";
    params.push(warehouse);
  }

  if (status === "onprocess") {
    sql += ` AND (${statusColumn} IS NULL OR ${statusColumn} = '')`;
  } else if (status) {
    if (status === "reject") sql += ` AND ${statusColumn} LIKE '%reject%'`;
    else {
      sql += ` AND ${statusColumn} = ?`;
      params.push(status);
    }
  } else {
    // Data All belum dipilih -> default filter berdasarkan jenjang level user
    if (level === "SH") sql += ` AND (${statusColumn} IS NULL OR ${statusColumn} = '')`;
    else if (level === "DH") {
      sql += ` AND ${statusColumn} = ?`;
      params.push("approvebysh");
    } else if (level === "HOD") {
      sql += ` AND ${statusColumn} = ?`;
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
    let groupedData = [];

    if (isLpbs) {
      const seenKeys = new Set();
      for (const row of rows) {
        const key = `${row.tgl}|${row.no_doc}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        const breakdown = await computeLpbsBreakdown(row.tgl, row.warehouse);
        if (breakdown.total_nilai > 0) {
          groupedData.push({
            tgl: row.tgl,
            no_doc: row.no_doc,
            warehouse: row.warehouse,
            status: row.status,
            ...breakdown,
          });
        }
      }
    } else {
      const map = {};
      rows.forEach((row) => {
        const key = `${row.tgl}|${row.no_doc}`;
        if (!map[key]) {
          map[key] = {
            tgl: row.tgl,
            warehouse: row.warehouse,
            no_doc: row.no_doc,
            uraian_list: [],
            status_bs: row.status_bs,
            total_nilai: 0,
          };
        }
        if (row.uraian_kegiatan) map[key].uraian_list.push(row.uraian_kegiatan);
        map[key].total_nilai += Number(row.nilai || 0);
      });
      groupedData = Object.values(map).map(({ uraian_list, ...g }) => ({
        ...g,
        uraian_kegiatan: uraian_list.join(", "),
      }));
    }

    groupedData.sort((a, b) => (a.tgl < b.tgl ? 1 : -1));
    return ok(res, { tab, statusColumn, groupedData, pendingCounts });
  } catch (err) {
    console.error("[approveBongkarmuat.list]", err);
    return fail(res, "Gagal mengambil data approval.", 500);
  }
}

// POST /api/management/approve-bongkarmuat/:no_doc  { action: "approve"|"reject", kategori: "bs"|"lpbs" }
// Samain dgn ManagementController::prosesApprove — jenjang approval divalidasi
// server-side (bukan cuma disembunyiin tombolnya di frontend): approve cuma
// jalan kalau status SAAT INI cocok sama urutan yang berhak diproses level user.
async function process(req, res) {
  const { no_doc } = req.params;
  const { action, kategori } = req.body;
  const level = req.user.level;
  const userLevel = String(level || "").toLowerCase();

  if (userLevel === "admin") {
    return fail(res, "Level admin tidak memiliki akses approve/reject.", 403);
  }
  if (!["approve", "reject"].includes(action)) {
    return fail(res, "Aksi tidak valid.", 422);
  }

  const statusColumn = kategori === "lpbs" ? "status" : "status_bs";

  try {
    const [rows] = await pool.query(`SELECT ${statusColumn} AS current_status FROM ${TABLE_BON} WHERE no_doc = ? LIMIT 1`, [
      no_doc,
    ]);
    if (rows.length === 0) return fail(res, "Dokumen tidak ditemukan.", 404);
    const currentStatus = rows[0].current_status;

    let newStatus;
    if (action === "reject") {
      newStatus = "reject";
    } else if ((!currentStatus || currentStatus === "") && level === "SH") {
      newStatus = "approvebysh";
    } else if (currentStatus === "approvebysh" && level === "DH") {
      newStatus = "approvebydh";
    } else if (currentStatus === "approvebydh" && level === "HOD") {
      newStatus = "approve";
    } else {
      return fail(res, "Approval tidak valid untuk status atau level saat ini.", 422);
    }

    await pool.query(`UPDATE ${TABLE_BON} SET ${statusColumn} = ? WHERE no_doc = ?`, [newStatus, no_doc]);
    return ok(res, { status: newStatus }, "Dokumen berhasil diproses.");
  } catch (err) {
    console.error("[approveBongkarmuat.process]", err);
    return fail(res, "Gagal memproses dokumen.", 500);
  }
}

module.exports = { list, process };
