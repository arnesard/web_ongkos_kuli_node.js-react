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

// GET /api/management/balance-cash?warehouse=&tgl=&no_bon=
// Samain dengan ManagementController::balanceCash
//
// CATATAN PARITAS: sama seperti performanceKuli — HOD/Superuser WAJIB pilih
// warehouse dulu (di Laravel, `where('warehouse', null)` bikin query gak
// pernah match apa pun kalau belum difilter).
async function balanceCash(req, res) {
  const { warehouse, isHighLevel } = warehouseScope(req.user);
  const { tgl, no_bon, warehouse: selectedWarehouse } = req.query;

  if (isHighLevel && !selectedWarehouse) {
    return ok(res, { rekap: [], requiresWarehouse: true });
  }
  const scopeWarehouse = isHighLevel ? selectedWarehouse : warehouse;

  try {
    let sql = "SELECT tgl, warehouse, nilai, act_nilai FROM data_bonsementara_tbl WHERE warehouse = ?";
    const params = [scopeWarehouse];
    if (tgl) {
      sql += " AND tgl = ?";
      params.push(tgl);
    }
    if (no_bon) {
      sql += " AND no_bon LIKE ?";
      params.push(`%${no_bon}%`);
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

    const groupEntries = Object.entries(groups);
    const datesNeeded = [
      ...new Set(
        groupEntries.flatMap(([, bonGroup]) => {
          const date = bonGroup[0].tgl;
          return new Date(`${date}T00:00:00`).getDay() === 5
            ? [date, addDays(date, 1), addDays(date, 2)]
            : [date];
        }),
      ),
    ];
    const [priceRows, umRows, transactionRows, susunRows, pemindahanRows] =
      await Promise.all([
        pool.query(
          scopeWarehouse === "JMW"
            ? "SELECT jenis AS nama, ongkos AS biaya FROM data_barang_tbl"
            : "SELECT nama_kendaraan AS nama, biaya_truk AS biaya FROM data_kendaraan_tbl",
        ),
        pool.query(
          "SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ? LIMIT 1",
          [new Date().getFullYear()],
        ),
        pool.query(
          "SELECT tgl, jenis_truk, ket, no_trip, qty_truk FROM data_transaksi_tbl WHERE tgl IN (?) AND warehouse = ?",
          [datesNeeded, scopeWarehouse],
        ),
        pool.query(
          "SELECT tgl, jenis_truk, kubikasi, kode_transaksi FROM data_transaksi_susunlantai_tbl WHERE tgl IN (?) AND warehouse = ?",
          [datesNeeded, scopeWarehouse],
        ),
        pool.query(
          "SELECT tgl, biaya_retribusi, biaya_security, biaya_parkir, biaya_uangjalan FROM data_transaksi_pemindahanbarang_tbl WHERE tgl IN (?) AND warehouse = ?",
          [datesNeeded, scopeWarehouse],
        ),
      ]);
    const biayaMap = Object.fromEntries(
      priceRows[0].map((row) => [row.nama, Number(row.biaya || 0)]),
    );
    const hargaUM = Number(umRows[0][0]?.harga_uang_makan || 0);

    // Satu query per sumber data. Versi sebelumnya menjalankan lima sampai
    // enam query untuk setiap tanggal bon, sehingga halaman makin lambat saat
    // histori bertambah.
    const rowsByDate = (rows) =>
      rows.reduce((result, row) => {
        (result[row.tgl] ||= []).push(row);
        return result;
      }, {});
    const transactionsByDate = rowsByDate(transactionRows[0]);
    const susunByDate = rowsByDate(susunRows[0]);
    const pemindahanByDate = rowsByDate(pemindahanRows[0]);

    const [uangMakanRows] = await pool.query(
      "SELECT tgl, id_kuli FROM data_transaksi_uangmakankuli_tbl WHERE tgl IN (?) AND warehouse = ?",
      [datesNeeded, scopeWarehouse],
    );
    const uangMakanByDate = rowsByDate(uangMakanRows);

    const rekap = [];
    for (const [key, bonGroup] of groupEntries) {
      const [warehouseGroup, tglGroup] = key.split("||");
      const totalBon = bonGroup.reduce((s, r) => s + Number(r.nilai || 0), 0);
      const totalAktual = bonGroup.reduce(
        (s, r) => s + Number(r.act_nilai || 0),
        0,
      );

      const dayOfWeek = new Date(`${tglGroup}T00:00:00`).getDay(); // 0=Minggu ... 5=Jumat
      const rangeTgl =
        dayOfWeek === 5
          ? [tglGroup, addDays(tglGroup, 1), addDays(tglGroup, 2)]
          : [tglGroup];
      // 1. Bongkar muat (unique per no_trip|ket|jenis_truk)
      const transaksiTruk = rangeTgl.flatMap(
        (date) => transactionsByDate[date] || [],
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
      const kuliIds = new Set(
        rangeTgl.flatMap((date) => uangMakanByDate[date] || []).map((r) => r.id_kuli),
      );
      const nilai2 = kuliIds.size * hargaUM;

      // 3. Susun lantai
      const susunRowsForRange = rangeTgl.flatMap(
        (date) => susunByDate[date] || [],
      );
      const susunGrouped = {};
      susunRowsForRange.forEach((r) => {
        const k = `${r.kode_transaksi}|${r.tgl}`;
        susunGrouped[k] = susunGrouped[k] || [];
        susunGrouped[k].push(r);
      });
      let nilai3 = 0;
      Object.values(susunGrouped).forEach((items) => {
        const first = items[0];
        const biayaPerTruk = biayaMap[first.jenis_truk] || 0;
        if (first.kubikasi > 0 && biayaPerTruk > 0)
          nilai3 += first.kubikasi * biayaPerTruk;
      });

      // 4. Pemindahan barang
      const pemindahanRowsForRange = rangeTgl.flatMap(
        (date) => pemindahanByDate[date] || [],
      );
      let nilai4 = 0;
      pemindahanRowsForRange.forEach((p) => {
        nilai4 +=
          Number(p.biaya_retribusi || 0) +
          Number(p.biaya_security || 0) +
          Number(p.biaya_parkir || 0) +
          Number(p.biaya_uangjalan || 0);
      });

      const totalTransaksi = roundToHundred(nilai1 + nilai2 + nilai3 + nilai4);

      rekap.push({
        tgl: tglGroup,
        warehouse: warehouseGroup,
        total_bon: totalBon,
        total_aktual: totalAktual,
        total_transaksi: totalTransaksi,
      });
    }

    rekap.sort((a, b) => (a.tgl < b.tgl ? 1 : -1));

    return ok(res, { rekap });
  } catch (err) {
    console.error("[balanceCash]", err);
    return fail(res, "Gagal menghitung balance cash.", 500);
  }
}

async function balanceCashResume(req, res) {
  const { warehouse, isHighLevel } = warehouseScope(req.user);
  const selectedWarehouse = req.query.warehouse || "";
  const warehouseFilter = isHighLevel ? selectedWarehouse : warehouse;
  const { tanggal } = req.params;

  if (!warehouseFilter) return fail(res, "Warehouse wajib dipilih.", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal))
    return fail(res, "Tanggal tidak valid.", 400);

  try {
    const day = new Date(`${tanggal}T00:00:00`);
    const dateRange =
      day.getDay() === 5
        ? [tanggal, addDays(tanggal, 1), addDays(tanggal, 2)]
        : [tanggal];
    const biayaSql =
      warehouseFilter === "JMW"
        ? "SELECT jenis AS nama, ongkos AS biaya FROM data_barang_tbl"
        : "SELECT nama_kendaraan AS nama, biaya_truk AS biaya FROM data_kendaraan_tbl";
    const [biayaRows] = await pool.query(biayaSql);
    const biayaMap = Object.fromEntries(
      biayaRows.map((row) => [row.nama, Number(row.biaya || 0)]),
    );
    const groupedByDate = [];

    for (const date of dateRange) {
      const [rawRows] = await pool.query(
        `SELECT t.tgl, t.market, t.no_trip, t.ket, t.jenis_truk,
                MIN(t.qty_truk) AS qty_truk, MIN(${warehouseFilter === "JMW" ? "b.ongkos" : "k.biaya_truk"}) AS biaya_truk
         FROM data_transaksi_tbl t
         LEFT JOIN data_kendaraan_tbl k ON t.jenis_truk = k.nama_kendaraan
         LEFT JOIN data_barang_tbl b ON t.jenis_truk = b.jenis
         WHERE t.tgl = ? AND t.warehouse = ?
         GROUP BY t.tgl, t.market, t.no_trip, t.ket, t.jenis_truk
         ORDER BY t.market`,
        [date, warehouseFilter],
      );
      const grouped = {};
      rawRows.forEach((row) => {
        const market = row.market || "-";
        const jenis = row.jenis_truk || "-";
        grouped[market] = grouped[market] || {};
        grouped[market][jenis] = grouped[market][jenis] || {
          jenis_truk: jenis,
          biaya_truk: Number(row.biaya_truk || biayaMap[jenis] || 0),
          total_qty: 0,
          total_biaya: 0,
        };
        const qty = Number(String(row.qty_truk || 0).replace(",", "."));
        const biaya = Number(row.biaya_truk || biayaMap[jenis] || 0);
        grouped[market][jenis].total_qty += qty;
        grouped[market][jenis].total_biaya += qty * biaya;
      });

      const groupedArray = Object.fromEntries(
        Object.entries(grouped).map(([market, items]) => [
          market,
          Object.values(items),
        ]),
      );
      const grandTotalQty = rawRows.reduce(
        (sum, row) => sum + Number(String(row.qty_truk || 0).replace(",", ".")),
        0,
      );
      const grandTotalHarga = Object.values(groupedArray)
        .flat()
        .reduce((sum, row) => sum + row.total_biaya, 0);
      const [umRows] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM data_transaksi_uangmakankuli_tbl WHERE tgl = ? AND warehouse = ?",
        [date, warehouseFilter],
      );
      const [hargaRows] = await pool.query(
        "SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ? LIMIT 1",
        [day.getFullYear()],
      );
      const grandTotalUangMakan =
        Number(umRows[0]?.cnt || 0) *
        Number(hargaRows[0]?.harga_uang_makan || 0);
      const [susunRows] = await pool.query(
        `SELECT dt.kubikasi, dk.biaya_truk
         FROM data_transaksi_susunlantai_tbl dt
         LEFT JOIN data_kendaraan_tbl dk ON dt.jenis_truk = dk.nama_kendaraan
         WHERE dt.tgl = ? AND dt.warehouse = ?`,
        [date, warehouseFilter],
      );
      const grandTotalSusunTire = susunRows.reduce(
        (sum, row) =>
          sum + Number(row.kubikasi || 0) * Number(row.biaya_truk || 0),
        0,
      );
      const [pindahRows] = await pool.query(
        `SELECT biaya_retribusi, biaya_security, biaya_parkir, biaya_uangjalan
         FROM data_transaksi_pemindahanbarang_tbl WHERE tgl = ? AND warehouse = ?`,
        [date, warehouseFilter],
      );
      const grandTotalPemindahanBarang = pindahRows.reduce(
        (sum, row) =>
          sum +
          Number(row.biaya_retribusi || 0) +
          Number(row.biaya_security || 0) +
          Number(row.biaya_parkir || 0) +
          Number(row.biaya_uangjalan || 0),
        0,
      );
      const grandTotalTransaksiLainnya =
        grandTotalUangMakan + grandTotalSusunTire + grandTotalPemindahanBarang;
      const grandTotal = grandTotalHarga + grandTotalTransaksiLainnya;
      const pembulatan = roundToHundred(grandTotal);
      if (grandTotal > 0) {
        groupedByDate.push({
          tgl: date,
          grouped: groupedArray,
          grandTotalQty,
          grandTotalHarga,
          grandTotalUangMakan,
          grandTotalSusunTire,
          grandTotalPemindahanBarang,
          grandTotalTransaksiLainnya,
          grandTotal,
          pembulatan,
        });
      }
    }

    return ok(res, {
      tanggal,
      selectedWarehouse: warehouseFilter,
      groupedByDate,
    });
  } catch (err) {
    console.error("[balanceCashResume]", err);
    return fail(res, "Gagal mengambil resume transaksi.", 500);
  }
}

async function balanceCashDetail(req, res) {
  const { warehouse, isHighLevel } = warehouseScope(req.user);
  const warehouseFilter = isHighLevel ? req.query.warehouse : warehouse;
  const { tanggal } = req.params;

  if (!warehouseFilter) return fail(res, "Warehouse wajib dipilih.", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal))
    return fail(res, "Tanggal tidak valid.", 400);

  try {
    const target = new Date(`${tanggal}T00:00:00`);
    const dateRange =
      target.getDay() === 5
        ? [tanggal, addDays(tanggal, 1), addDays(tanggal, 2)]
        : [tanggal];
    const [transactions] = await pool.query(
      `SELECT t.tgl, t.market, t.no_trip, t.ket,
              MIN(t.customer) AS customer, MIN(t.qty_truk) AS qty_truk,
              MIN(t.jenis_truk) AS jenis_truk, MIN(t.nopol) AS nopol
       FROM data_transaksi_tbl t
       WHERE t.tgl IN (?) AND t.warehouse = ?
       GROUP BY t.tgl, t.market, t.no_trip, t.ket
       ORDER BY t.tgl ASC, t.no_trip ASC`,
      [dateRange, warehouseFilter],
    );

    const year = target.getFullYear();
    const [priceRows] = await pool.query(
      "SELECT harga_uang_makan FROM data_uang_makan_tbl WHERE tahun = ? LIMIT 1",
      [year],
    );
    const foodPrice = Number(priceRows[0]?.harga_uang_makan || 0);
    const [foodRows] = await pool.query(
      `SELECT um.tgl, um.id_kuli, k.nama_kuli, ? AS jumlah_uang_makan
       FROM data_transaksi_uangmakankuli_tbl um
       LEFT JOIN data_kuli_tbl k ON um.id_kuli = k.nik
       WHERE um.tgl IN (?) AND um.warehouse = ?
       ORDER BY um.tgl ASC, um.id_kuli ASC`,
      [foodPrice, dateRange, warehouseFilter],
    );

    const [susunRows] = await pool.query(
      `SELECT dt.id, dt.tgl, dt.kode_transaksi, dt.jenis_truk, dt.item,
              dt.kubikasi, dk.biaya_truk,
              (dt.kubikasi * dk.biaya_truk) AS nilai,
              counts.total_kuli
       FROM data_transaksi_susunlantai_tbl dt
       LEFT JOIN data_kendaraan_tbl dk ON dt.jenis_truk = dk.nama_kendaraan
       LEFT JOIN (
         SELECT kode_transaksi, COUNT(id_kuli) AS total_kuli
         FROM data_transaksi_susunlantai_tbl
         WHERE tgl IN (?) AND warehouse = ?
         GROUP BY kode_transaksi
       ) counts ON counts.kode_transaksi = dt.kode_transaksi
       WHERE dt.tgl IN (?) AND dt.warehouse = ?
       ORDER BY dt.tgl ASC, dt.id ASC`,
      [dateRange, warehouseFilter, dateRange, warehouseFilter],
    );

    const [moveRows] = await pool.query(
      `SELECT id, tgl, lokasi_awal, lokasi_tujuan, ritase,
              (biaya_retribusi + biaya_security + biaya_parkir + biaya_uangjalan) AS total_biaya
       FROM data_transaksi_pemindahanbarang_tbl
       WHERE tgl IN (?) AND warehouse = ?
       ORDER BY tgl ASC, id ASC`,
      [dateRange, warehouseFilter],
    );

    return ok(res, {
      tanggal,
      dateRange,
      selectedWarehouse: warehouseFilter,
      transactions,
      dataUangMakan: foodRows,
      dataSusunTire: susunRows,
      dataPemindahanBarang: moveRows,
    });
  } catch (err) {
    console.error("[balanceCashDetail]", err);
    return fail(res, "Gagal mengambil detail transaksi.", 500);
  }
}

module.exports = { balanceCash, balanceCashResume, balanceCashDetail };
