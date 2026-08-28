const pool = require("../../config/db");

// Samain dengan StoreOrUpdateMuatFgRequest::prepareForValidation() + validated()
// Format tanggal jadi "dmy" (contoh 27-08-2026 -> "270826") lalu di-prefix ke no_trip.
function formatDmy(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

function buildPrefixedNoTrip(tgl, rawNoTrip) {
  // Kalau sudah ber-prefix 6 digit angka, jangan di-prefix lagi (mode edit)
  if (/^\d{6}/.test(rawNoTrip)) return rawNoTrip;
  return formatDmy(tgl) + rawNoTrip;
}

// Samain dengan rule "Tanggal hanya diperbolehkan H-4, H, atau H+4 dari hari ini."
function isDateInAllowedRange(tglInput) {
  const input = new Date(tglInput);
  input.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((input - today) / (1000 * 60 * 60 * 24));
  return diffDays >= -4 && diffDays <= 4;
}

// Cek duplikasi transaksi (versi sederhana dari Rule A di StoreOrUpdateMuatFgRequest)
async function isExactDuplicate({ tgl, market, customer, kota, jam_bongkar, no_trip, qty_truk, jenis_truk, pa, nopol, driver, jam_masuk, ket, id_kuli, warehouse, excludeId }) {
  let sql = `SELECT id FROM data_transaksi_tbl WHERE tgl=? AND market=? AND customer=? AND kota=? AND jam_bongkar=?
    AND no_trip=? AND jenis_truk=? AND pa=? AND nopol=? AND driver=? AND jam_masuk=? AND id_kuli=? AND warehouse=?`;
  const params = [tgl, market, customer, kota, jam_bongkar, no_trip, jenis_truk, pa, nopol, driver, jam_masuk, id_kuli, warehouse];

  if (ket && ket !== "-") {
    sql += " AND ket = ?";
    params.push(ket);
  } else {
    sql += " AND (ket IS NULL OR ket = '' OR ket = '-')";
  }

  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }

  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

module.exports = { formatDmy, buildPrefixedNoTrip, isDateInAllowedRange, isExactDuplicate };
