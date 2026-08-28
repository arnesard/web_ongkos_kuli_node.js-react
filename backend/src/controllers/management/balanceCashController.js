const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function roundToHundred(value) {
  const intVal = Math.round(value);
  const lastTwo = intVal % 100;
  if (lastTwo === 50) return Math.floor(intVal / 100) * 100;
  if (lastTwo > 50) return Math.ceil(intVal / 100) * 100;
  return Math.floor(intVal / 100) * 100;
}

// GET /api/management/balance-cash?warehouse=&tgl=
// Samain dengan ManagementController::balanceCash
async function balanceCash(req, res) {
  const { warehouse, isSuperUser, isHOD, isHighLevel } = warehouseScope(req.user);
  const { tgl, warehouse: selectedWarehouse } = req.query;
  const scopeWarehouse = isHighLevel ? selectedWarehouse : warehouse;

  try {
    let sql = "SELECT * FROM data_bonsementara_tbl WHERE 1=1";
    const params = [];
    if (scopeWarehouse) {
      sql += " AND warehouse = ?";
      params.push(scopeWarehouse);
    }
    if (tgl) {
      sql += " AND DATE(tgl) = ?";
      params.push(tgl);
    }
    sql += " ORDER BY tgl DESC";
    const [rows] = await pool.query(sql, params);

    // Group by warehouse + tgl (samain dengan groupBy Laravel)
    const groups = {};
    rows.forEach((r) => {
      const key = `${r.warehouse}||${r.tgl}`;
      groups[key] = groups[key] || [];
      groups[key].push(r);
    });

    const rekap = [];
    for (const key of Object.keys(groups)) {
      const [warehouseGroup, tglGroup] = key.split("||");
      const bonGroup = groups[key];
      const totalBon = bonGroup.reduce((s, r) => s + Number(r.nilai || 0), 0);
      const totalAktual = bonGroup.reduce((s, r) => s + Number(r.act_nilai || 0), 0);

      const dayOfWeek = new Date(tglGroup).getDay(); // 0=Minggu ... 5=Jumat
      const rangeTgl = dayOfWeek === 5 ? [tglGroup, addDays(tglGroup, 1), addDays(tglGroup, 2)] : [tglGroup];
      const placeholders = rangeTgl.map(() => "?").join(",");

      // Biaya per jenis truk/barang tergantung warehouse
      let biayaMap = {};
      if (warehouseGroup === "JMW") {
        const [barangRows] = await pool.query("SELECT jenis, ongkos FROM data_barang_tbl");
        barangRows.forEach((b) => (biayaMap[b.jenis] = b.ongkos));
      } else {
        const [kendaraanRows] = await pool.query("SELECT nama_kendaraan, biaya_truk FROM data_kendaraan_tbl");
        kendaraanRows.forEach((k) => (biayaMap[k.nama_kendaraan] = k.biaya_truk));
      }

      // 1. Bongkar muat (unique per no_trip|ket|jenis_truk)
      const [transaksiTruk] = await pool.query(
        `SELECT jenis_truk, ket, no_trip, qty_truk FROM data_transaksi_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
        [...rangeTgl, warehouseGroup]
      );
      const seen = new Set();
      let nilai1 = 0;
      transaksiTruk.forEach((row) => {
        const uniqKey = `${row.no_trip}|${row.ket}|${row.jenis_truk}`;
        if (seen.has(uniqKey)) return;
        seen.add(uniqKey);
        const qty = Number(String(row.qty_truk || 0).replace(",", "."));
        const biaya = biayaMap[row.jenis_truk] || 0;
        if (qty > 0 && biaya > 0) nilai1 += qty * biaya;
      });

      // 2. Uang makan kuli
      const [umRow] = await pool.query("SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ?", [
        new Date().getFullYear(),
      ]);
      const hargaUM = umRow[0]?.harga_uang_makan || 0;
      const [kuliCountRow] = await pool.query(
        `SELECT COUNT(DISTINCT id_kuli) AS cnt FROM data_transaksi_uangmakankuli_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
        [...rangeTgl, warehouseGroup]
      );
      const nilai2 = (kuliCountRow[0]?.cnt || 0) * hargaUM;

      // 3. Susun lantai
      const [susunRows] = await pool.query(
        `SELECT jenis_truk, kubikasi, kode_transaksi, tgl FROM data_transaksi_susunlantai_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
        [...rangeTgl, warehouseGroup]
      );
      const susunGrouped = {};
      susunRows.forEach((r) => {
        const k = `${r.kode_transaksi}|${r.tgl}`;
        susunGrouped[k] = susunGrouped[k] || [];
        susunGrouped[k].push(r);
      });
      let nilai3 = 0;
      Object.values(susunGrouped).forEach((items) => {
        const first = items[0];
        const biayaPerTruk = biayaMap[first.jenis_truk] || 0;
        if (first.kubikasi > 0 && biayaPerTruk > 0) nilai3 += first.kubikasi * biayaPerTruk;
      });

      // 4. Pemindahan barang
      const [pemindahanRows] = await pool.query(
        `SELECT biaya_retribusi, biaya_security, biaya_parkir, biaya_uangjalan FROM data_transaksi_pemindahanbarang_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
        [...rangeTgl, warehouseGroup]
      );
      let nilai4 = 0;
      pemindahanRows.forEach((p) => {
        nilai4 += Number(p.biaya_retribusi || 0) + Number(p.biaya_security || 0) + Number(p.biaya_parkir || 0) + Number(p.biaya_uangjalan || 0);
      });

      const totalTransaksi = roundToHundred(nilai1 + nilai2 + nilai3 + nilai4);

      rekap.push({ tgl: tglGroup, warehouse: warehouseGroup, total_bon: totalBon, total_aktual: totalAktual, total_transaksi: totalTransaksi });
    }

    rekap.sort((a, b) => (a.tgl < b.tgl ? 1 : -1));

    return ok(res, { rekap });
  } catch (err) {
    console.error("[balanceCash]", err);
    return fail(res, "Gagal menghitung balance cash.", 500);
  }
}

module.exports = { balanceCash };
