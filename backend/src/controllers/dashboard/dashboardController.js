const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");
const { warehouseScope } = require("../../middleware/auth");

function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function dayOfWeekISO(dateStr) {
  // 1=Senin ... 7=Minggu (samain dengan date('N') PHP)
  const jsDay = new Date(dateStr).getDay(); // 0=Minggu
  return jsDay === 0 ? 7 : jsDay;
}
function roundToHundred(value) {
  const intVal = Math.trunc(value);
  const lastTwo = intVal % 100;
  return lastTwo < 51 ? Math.floor(intVal / 100) * 100 : Math.ceil(intVal / 100) * 100;
}
function groupBy(arr, keyFn) {
  const out = {};
  arr.forEach((item) => {
    const k = keyFn(item);
    (out[k] = out[k] || []).push(item);
  });
  return out;
}

// Samain dengan calcPendapatanMuat (batch per no_trip + ket)
function calcPendapatanMuat(rows, biayaKey = "biaya") {
  const pendapatan = {};
  const byTrip = groupBy(rows, (r) => r.no_trip);
  Object.values(byTrip).forEach((recordsPerTrip) => {
    const byKet = groupBy(recordsPerTrip, (r) => r.ket ?? "");
    Object.values(byKet).forEach((records) => {
      const sample = records[0];
      const qty = Number(sample.qty_truk || 0);
      const biaya = Number(sample[biayaKey] || 0);
      const total = qty * biaya;
      const share = records.length > 0 ? total / records.length : 0;
      records.forEach((r) => (pendapatan[r.id_kuli] = (pendapatan[r.id_kuli] || 0) + share));
    });
  });
  return pendapatan;
}

// Samain dengan calcPendapatanSusun
function calcPendapatanSusun(rows) {
  const pendapatan = {};
  const byKode = groupBy(rows, (r) => r.kode_transaksi);
  Object.values(byKode).forEach((records) => {
    const biaya = Number(records[0]?.biaya_truk || 0);
    const share = records.length > 0 ? biaya / records.length : 0;
    records.forEach((r) => (pendapatan[r.id_kuli] = (pendapatan[r.id_kuli] || 0) + share));
  });
  return pendapatan;
}

// Samain dengan Carbon::parse($kuli['status'])->age — kolom `status` di data_kuli_tbl
// legacy-nya dipakai untuk menyimpan tanggal lahir, bukan status aktif/nonaktif.
function calcUsia(statusValue) {
  if (!statusValue) return null;
  const birth = new Date(statusValue);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// GET /api/dashboard?warehouse=&bulan=
async function index(req, res) {
  const { warehouse: sessionWH, isSuperUser, isHOD, isHighLevel } = warehouseScope(req.user);
  const selectedWH = req.query.warehouse;
  const activeFilter = !isHighLevel ? sessionWH : selectedWH && selectedWH !== "all" ? selectedWH : null;

  const today = ymd(new Date());
  const currentMonth = today.slice(0, 7);

  try {
    // ── KAPASITAS KULI ──
    let kapasitasSql = "SELECT warehouse, COUNT(DISTINCT nik) AS kapasitas_kuli FROM data_kuli_tbl WHERE 1=1";
    const kapasitasParams = [];
    if (activeFilter) {
      kapasitasSql += " AND warehouse = ?";
      kapasitasParams.push(activeFilter);
    }
    kapasitasSql += " GROUP BY warehouse";
    const [kapasitasRows] = await pool.query(kapasitasSql, kapasitasParams);
    const dataKapasitas = { TOTAL: 0 };
    kapasitasRows.forEach((r) => {
      dataKapasitas[r.warehouse] = r.kapasitas_kuli;
      dataKapasitas.TOTAL += r.kapasitas_kuli;
    });

    // ── AKTUAL KULI BULANAN (union 3 tabel) ──
    const unionParams = [`${currentMonth}%`, `${currentMonth}%`, `${currentMonth}%`];
    let unionSql = `
      SELECT tgl, COUNT(DISTINCT id_kuli) AS aktual_kuli FROM (
        SELECT tgl, id_kuli, warehouse FROM data_transaksi_tbl WHERE tgl LIKE ?
        UNION ALL
        SELECT tgl, id_kuli, warehouse FROM data_transaksi_uangmakankuli_tbl WHERE tgl LIKE ?
        UNION ALL
        SELECT tgl, id_kuli, warehouse FROM data_transaksi_susunlantai_tbl WHERE tgl LIKE ?
      ) unioned`;
    if (activeFilter) unionSql += " WHERE warehouse = ?";
    unionSql += " GROUP BY tgl ORDER BY tgl";
    const finalUnionParams = activeFilter ? [...unionParams, activeFilter] : unionParams;
    const [aktualRows] = await pool.query(unionSql, finalUnionParams);
    const dataAktual = {};
    aktualRows.forEach((r) => (dataAktual[r.tgl] = r.aktual_kuli));

    // ── DAFTAR WAREHOUSE BON SEMENTARA ──
    let whListSql = "SELECT DISTINCT warehouse FROM data_bonsementara_tbl WHERE 1=1";
    const whListParams = [];
    if (!isHighLevel) {
      whListSql += " AND warehouse = ?";
      whListParams.push(sessionWH);
    }
    const [whListRows] = await pool.query(whListSql, whListParams);
    const warehouseList = whListRows.map((r) => r.warehouse);

    // ── NOMINAL & PERSENTASE BON HARI INI ──
    let bonHariIniSql = `SELECT warehouse, SUM(nilai) AS total_nilai, SUM(act_nilai) AS total_aktual
      FROM data_bonsementara_tbl WHERE DATE(tgl) = ?`;
    const bonHariIniParams = [today];
    if (!isHighLevel) {
      bonHariIniSql += " AND warehouse = ?";
      bonHariIniParams.push(sessionWH);
    }
    bonHariIniSql += " GROUP BY warehouse";
    const [bonHariIniRows] = await pool.query(bonHariIniSql, bonHariIniParams);

    const nominalHariIni = {};
    const persentaseHariIni = {};
    bonHariIniRows.forEach((r) => {
      const nominal = Math.round(r.total_nilai || 0);
      const aktual = r.total_aktual || 0;
      nominalHariIni[r.warehouse] = nominal;
      persentaseHariIni[r.warehouse] = nominal > 0 ? Math.round((aktual / nominal) * 100) : 0;
    });
    warehouseList.forEach((w) => {
      nominalHariIni[w] = nominalHariIni[w] || 0;
      persentaseHariIni[w] = persentaseHariIni[w] || 0;
    });

    // ── SPARKLINE BULANAN PER WAREHOUSE ──
    let sparkSql = `SELECT warehouse, tgl, SUM(nilai) AS total_nilai FROM data_bonsementara_tbl WHERE tgl LIKE ?`;
    const sparkParams = [`${currentMonth}%`];
    if (!isHighLevel) {
      sparkSql += " AND warehouse = ?";
      sparkParams.push(sessionWH);
    }
    sparkSql += " GROUP BY warehouse, tgl ORDER BY tgl";
    const [sparkRows] = await pool.query(sparkSql, sparkParams);
    const sparklineData = {};
    warehouseList.forEach((w) => (sparklineData[w] = []));
    sparkRows.forEach((r) => {
      sparklineData[r.warehouse] = sparklineData[r.warehouse] || [];
      sparklineData[r.warehouse].push(Number(r.total_nilai));
    });

    // ── REKAP BON VS AKTUAL VS TRANSAKSI (grouped per warehouse + tgl, expand Jumat) ──
    let bonSql = "SELECT * FROM data_bonsementara_tbl WHERE 1=1";
    const bonParams = [];
    if (activeFilter) {
      bonSql += " AND warehouse = ?";
      bonParams.push(activeFilter);
    }
    bonSql += " ORDER BY tgl DESC";
    const [dataBon] = await pool.query(bonSql, bonParams);

    const groupedBon = groupBy(dataBon, (item) => {
      const dow = dayOfWeekISO(item.tgl);
      // Kalau Sabtu(6)/Minggu(7) mundur ke Jumat terdekat (samain dgn previous(FRIDAY))
      let adjTgl = item.tgl;
      if (dow === 6) adjTgl = addDays(item.tgl, -1);
      else if (dow === 7) adjTgl = addDays(item.tgl, -2);
      return `${item.warehouse}_${adjTgl}`;
    });

    const [biayaTrukRows] = await pool.query("SELECT nama_kendaraan, biaya_truk FROM data_kendaraan_tbl");
    const biayaTrukAll = {};
    biayaTrukRows.forEach((r) => (biayaTrukAll[r.nama_kendaraan] = r.biaya_truk));

    const [ongkosBrgRows] = await pool.query("SELECT jenis, ongkos FROM data_barang_tbl");
    const ongkosBrgAll = {};
    ongkosBrgRows.forEach((r) => (ongkosBrgAll[r.jenis] = r.ongkos));

    const [umRow] = await pool.query("SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ?", [
      new Date().getFullYear(),
    ]);
    const uangMakanHarianRekap = umRow[0]?.harga_uang_makan || 0;

    const rekap = [];
    for (const key of Object.keys(groupedBon)) {
      const [warehouseGroup, tgl] = key.split("_");
      const bonGroup = groupedBon[key];
      const isJumat = dayOfWeekISO(tgl) === 5;
      const rangeTanggal = isJumat ? [tgl, addDays(tgl, 1), addDays(tgl, 2)] : [tgl];
      const placeholders = rangeTanggal.map(() => "?").join(",");
      const biayaTrukArr = warehouseGroup === "JMW" ? ongkosBrgAll : biayaTrukAll;

      const [transaksiRows2] = await pool.query(
        `SELECT jenis_truk, ket, no_trip, qty_truk FROM data_transaksi_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
        [...rangeTanggal, warehouseGroup]
      );
      const seen = new Set();
      let nilai1 = 0;
      transaksiRows2.forEach((row) => {
        const uniq = `${row.no_trip}|${row.ket}|${row.jenis_truk}`;
        if (seen.has(uniq)) return;
        seen.add(uniq);
        nilai1 += Number(row.qty_truk || 0) * Number(biayaTrukArr[row.jenis_truk] || 0);
      });

      const [umCountRow] = await pool.query(
        `SELECT COUNT(DISTINCT id_kuli) AS cnt FROM data_transaksi_uangmakankuli_tbl WHERE tgl IN (${placeholders}) AND warehouse = ?`,
        [...rangeTanggal, warehouseGroup]
      );
      const nilai2 = (umCountRow[0]?.cnt || 0) * uangMakanHarianRekap;

      const [susunRows2] = await pool.query(
        `SELECT kode_transaksi, tgl, kubikasi, jenis_truk FROM data_transaksi_susunlantai_tbl
         WHERE tgl IN (${placeholders}) AND warehouse = ?`,
        [...rangeTanggal, warehouseGroup]
      );
      let nilai3 = 0;
      Object.values(groupBy(susunRows2, (r) => `${r.kode_transaksi}|${r.tgl}`)).forEach((items) => {
        const f = items[0];
        nilai3 += Number(f.kubikasi || 0) * Number(biayaTrukArr[f.jenis_truk] || 0);
      });

      const [pemindahanRows2] = await pool.query(
        `SELECT biaya_retribusi, biaya_security, biaya_parkir, biaya_uangjalan FROM data_transaksi_pemindahanbarang_tbl
         WHERE tgl IN (${placeholders}) AND warehouse = ?`,
        [...rangeTanggal, warehouseGroup]
      );
      let nilai4 = 0;
      pemindahanRows2.forEach((p) => {
        nilai4 += Number(p.biaya_retribusi || 0) + Number(p.biaya_security || 0) + Number(p.biaya_parkir || 0) + Number(p.biaya_uangjalan || 0);
      });

      rekap.push({
        tgl,
        warehouse: warehouseGroup,
        total_bon: bonGroup.reduce((s, r) => s + Number(r.nilai || 0), 0),
        total_aktual: bonGroup.reduce((s, r) => s + Number(r.act_nilai || 0), 0),
        total_transaksi: roundToHundred(nilai1 + nilai2 + nilai3 + nilai4),
      });
    }
    rekap.sort((a, b) => (a.tgl < b.tgl ? 1 : -1));

    // ── PERFORMA KULI BULAN BERJALAN (+ hari aktif) ──
    const start = `${currentMonth}-01`;
    const endDateObj = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0);
    const end = ymd(endDateObj);

    let kuliSql = "SELECT nik, nama_kuli, warehouse, status FROM data_kuli_tbl WHERE nik IS NOT NULL";
    const kuliParams = [];
    if (activeFilter) {
      kuliSql += " AND warehouse = ?";
      kuliParams.push(activeFilter);
    }
    const [kulisList] = await pool.query(kuliSql, kuliParams);
    const allNiks = kulisList.map((k) => k.nik);

    const [daysInMonthRow] = await pool.query(
      `SELECT COUNT(DISTINCT tgl) AS c FROM data_transaksi_tbl WHERE tgl BETWEEN ? AND ? ${activeFilter ? "AND warehouse = ?" : ""}`,
      activeFilter ? [start, end, activeFilter] : [start, end]
    );
    const daysInMonth = daysInMonthRow[0]?.c || 0;

    let hadirMap = {};
    if (allNiks.length > 0) {
      const inPlaceholders = allNiks.map(() => "?").join(",");
      const [hadirRows] = await pool.query(
        `SELECT id_kuli, COUNT(DISTINCT DATE(tgl)) AS hadir_hari FROM data_transaksi_tbl
         WHERE tgl BETWEEN ? AND ? ${activeFilter ? "AND warehouse = ?" : ""} AND id_kuli IN (${inPlaceholders})
         GROUP BY id_kuli`,
        activeFilter ? [start, end, activeFilter, ...allNiks] : [start, end, ...allNiks]
      );
      hadirRows.forEach((r) => (hadirMap[r.id_kuli] = r.hadir_hari));
    }

    const isJMW = sessionWH === "JMW";
    const transaksiJoinSql = isJMW
      ? `SELECT t.no_trip, t.id_kuli, k.ongkos AS biaya, t.ket, t.qty_truk FROM data_transaksi_tbl t
         JOIN data_barang_tbl k ON t.jenis_truk = k.jenis WHERE t.tgl BETWEEN ? AND ? ${activeFilter ? "AND t.warehouse = ?" : ""}`
      : `SELECT t.no_trip, t.id_kuli, k.biaya_truk AS biaya, t.ket, t.qty_truk FROM data_transaksi_tbl t
         JOIN data_kendaraan_tbl k ON t.jenis_truk = k.nama_kendaraan WHERE t.tgl BETWEEN ? AND ? ${activeFilter ? "AND t.warehouse = ?" : ""}`;
    const [transaksiRows] = await pool.query(transaksiJoinSql, activeFilter ? [start, end, activeFilter] : [start, end]);
    const pendapatanMuat = calcPendapatanMuat(transaksiRows);

    const uangMakanHarian = uangMakanHarianRekap;
    const [umRows2] = await pool.query(
      `SELECT id_kuli, COUNT(*) AS hadir_makan FROM data_transaksi_uangmakankuli_tbl WHERE tgl BETWEEN ? AND ? ${activeFilter ? "AND warehouse = ?" : ""} GROUP BY id_kuli`,
      activeFilter ? [start, end, activeFilter] : [start, end]
    );
    const uangMakanMap = {};
    umRows2.forEach((r) => (uangMakanMap[r.id_kuli] = r.hadir_makan * uangMakanHarian));

    const [susunJoinRows] = await pool.query(
      `SELECT s.kode_transaksi, s.id_kuli, k.biaya_truk FROM data_transaksi_susunlantai_tbl s
       JOIN data_kendaraan_tbl k ON s.jenis_truk = k.nama_kendaraan
       WHERE s.tgl BETWEEN ? AND ? ${activeFilter ? "AND s.warehouse = ?" : ""}`,
      activeFilter ? [start, end, activeFilter] : [start, end]
    );
    const pendapatanSusun = calcPendapatanSusun(susunJoinRows);

    const dataKuli = kulisList.map((k) => {
      const hadirHari = hadirMap[k.nik] || 0;
      const pm = pendapatanMuat[k.nik] || 0;
      const um = uangMakanMap[k.nik] || 0;
      const ps = pendapatanSusun[k.nik] || 0;
      return {
        id_kuli: k.nik,
        nama_kuli: k.nama_kuli,
        department: k.warehouse,
        hadir_hari: hadirHari,
        percentage: daysInMonth > 0 ? (hadirHari / daysInMonth) * 100 : 0,
        pendapatan_muat: pm,
        uang_makan: um,
        pendapatan_susun: ps,
        total_pendapatan: pm + um + ps,
        days_in_month: daysInMonth,
        usia: calcUsia(k.status),
      };
    });

    // ── KATEGORISASI USIA (dari kolom `status` yang dipakai sbg tgl lahir) ──
    const kuliUsiaDibawah35 = dataKuli.filter((k) => k.usia !== null && k.usia <= 34);
    const kuliUsiaProduktif = dataKuli.filter((k) => k.usia !== null && k.usia >= 35 && k.usia <= 49);
    const kuliUsiaSenior = dataKuli.filter((k) => k.usia !== null && k.usia >= 50);

    // ── TRIP PER KULI HARI INI ──
    let tripSql = `SELECT k.nama_kuli, COUNT(DISTINCT t.no_trip) AS total_trip_hari_ini
      FROM data_transaksi_tbl t JOIN data_kuli_tbl k ON t.id_kuli = k.nik WHERE DATE(t.tgl) = ?`;
    const tripParams = [today];
    if (activeFilter) {
      tripSql += " AND t.warehouse = ?";
      tripParams.push(activeFilter);
    }
    tripSql += " GROUP BY k.nama_kuli ORDER BY total_trip_hari_ini DESC";
    const [tripRows] = await pool.query(tripSql, tripParams);
    const kuliPerTripChartData = {
      labels: tripRows.map((r) => r.nama_kuli),
      data: tripRows.map((r) => r.total_trip_hari_ini),
    };

    return ok(res, {
      dataKapasitas,
      totalKuli: dataKapasitas.TOTAL,
      dataAktual,
      selectedWarehouse: selectedWH || (isHighLevel ? "all" : sessionWH),
      rekap,
      nominalHariIni,
      persentaseHariIni,
      sparklineData,
      daysInMonth,
      dataKuliUnperform: [...dataKuli].sort((a, b) => a.percentage - b.percentage).slice(0, 10),
      kuliUsiaDibawah35,
      kuliUsiaProduktif,
      kuliUsiaSenior,
      dataKuliTripHarian: kuliPerTripChartData,
    });
  } catch (err) {
    console.error("[dashboard.index]", err);
    return fail(res, "Gagal mengambil data dashboard.", 500);
  }
}

module.exports = { index };
