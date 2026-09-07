function dateLong(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function number(value, decimals = 0) {
  return Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}

function tripNumber(value) {
  const match = String(value || "").match(/([A-Za-z]\d{2,3})$/);
  return match?.[1] || value || "-";
}

function tableForDate(data, date) {
  const transactions = data.transactions.filter((item) => item.tgl === date);
  const food = data.dataUangMakan.filter((item) => item.tgl === date);
  const susun = data.dataSusunTire.filter((item) => item.tgl === date);
  const moves = data.dataPemindahanBarang.filter((item) => item.tgl === date);
  if (!transactions.length && !food.length && !susun.length && !moves.length)
    return "";
  let carRows = "";
  const markets = Object.entries(
    transactions.reduce((groups, item) => {
      const market = item.market || "-";
      (groups[market] ||= []).push(item);
      return groups;
    }, {}),
  );
  let marketNo = 0;
  let carTotal = 0;
  markets.forEach(([market, items]) => {
    marketNo += 1;
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.qty_truk || 0),
      0,
    );
    carTotal += subtotal;
    items.forEach((item, index) => {
      carRows += `<tr>${index === 0 ? `<td rowspan="${items.length}">${marketNo}</td><td rowspan="${items.length}">${esc(market)}</td>` : ""}<td>${index + 1}</td><td class="left">${esc(item.customer)}</td><td>${esc(tripNumber(item.no_trip))}</td><td>${number(item.qty_truk, 2)}</td><td>${esc(item.jenis_truk)}</td><td>${esc(item.nopol || "-")}</td><td>${esc(item.ket || "-")}</td></tr>`;
    });
    carRows += `<tr class="secondary"><td colspan="5" class="right bold">Total ${esc(market)}</td><td colspan="2" class="left bold">${number(subtotal, 2)}</td><td colspan="2"></td></tr>`;
  });
  carRows += `<tr class="warning"><td colspan="5" class="right bold">Grand Total</td><td colspan="2" class="left bold">${number(carTotal, 2)}</td><td colspan="2"></td></tr>`;

  const foodTotal = food.reduce(
    (sum, item) => sum + Number(item.jumlah_uang_makan || 0),
    0,
  );
  const susunTotal = susun.reduce(
    (sum, item) => sum + Number(item.nilai || 0),
    0,
  );
  const susunKuli = susun.reduce(
    (sum, item) => sum + Number(item.total_kuli || 0),
    0,
  );
  const moveTotal = moves.reduce(
    (sum, item) => sum + Number(item.total_biaya || 0),
    0,
  );
  const moveRitase = moves.reduce(
    (sum, item) => sum + Number(item.ritase || 0),
    0,
  );
  return `<section class="detail-page"><h4>DATA MOBIL BONGKAR / MUAT</h4><h6>${dateLong(date)}</h6><table><thead><tr><th style="width:6%">No.</th><th style="width:10%">Market</th><th style="width:6%">No.</th><th style="width:30%">Customer</th><th style="width:6%">No. Trip</th><th style="width:6%">Qty</th><th style="width:14%">Jenis</th><th style="width:12%">No. Polisi</th><th style="width:10%">Ket</th></tr></thead><tbody>${carRows}</tbody></table>${food.length ? `<h4>DATA UANG MAKAN</h4><h6>${dateLong(date)}</h6><table><thead><tr><th style="width:6%">No.</th><th>ID Kuli</th><th style="width:50%">Nama Kuli</th><th>Jumlah (Rp)</th></tr></thead><tbody>${food.map((item, index) => `<tr><td>${index + 1}</td><td>${esc(item.id_kuli)}</td><td>${esc(item.nama_kuli)}</td><td class="right">${number(item.jumlah_uang_makan)}</td></tr>`).join("")}<tr class="warning"><td colspan="3" class="right bold">Grand Total</td><td class="right bold">${number(foodTotal)}</td></tr></tbody></table>` : ""}${susun.length ? `<h4>SUSUN TIRE LANTAI/RAK</h4><h6>${dateLong(date)}</h6><table><thead><tr><th style="width:6%">No.</th><th>Kode Transaksi</th><th>Jenis Truk</th><th>Item</th><th>Kubikasi</th><th>Nilai (Rp)</th><th>Total Kuli</th></tr></thead><tbody>${susun.map((item, index) => `<tr><td>${index + 1}</td><td>${esc(item.kode_transaksi)}</td><td>${esc(item.jenis_truk)}</td><td>${esc(item.item)}</td><td>${esc(item.kubikasi)}</td><td class="right">${number(item.nilai)}</td><td>${number(item.total_kuli)}</td></tr>`).join("")}<tr class="warning"><td colspan="5" class="right bold">Grand Total</td><td class="right bold">${number(susunTotal)}</td><td class="bold">${number(susunKuli)}</td></tr></tbody></table>` : ""}${moves.length ? `<h4>PEMINDAHAN BARANG</h4><h6>${dateLong(date)}</h6><table><thead><tr><th style="width:6%">No.</th><th style="width:34%">Lokasi Awal</th><th style="width:34%">Tujuan</th><th style="width:7%">Ritase</th><th style="width:12%">Total Biaya (Rp)</th></tr></thead><tbody>${moves.map((item, index) => `<tr><td>${index + 1}</td><td>${esc(item.lokasi_awal)}</td><td>${esc(item.lokasi_tujuan)}</td><td>${esc(item.ritase)}</td><td class="right">${number(item.total_biaya)}</td></tr>`).join("")}<tr class="warning"><td colspan="3" class="right bold">Grand Total</td><td class="bold">${number(moveRitase)}</td><td class="right bold">${number(moveTotal)}</td></tr></tbody></table>` : ""}</section>`;
}

export function printBalanceCashDetail(data) {
  const pages = data.dateRange
    .map((date) => tableForDate(data, date))
    .filter(Boolean)
    .join("");
  const signature = `<table class="signature no-border"><tbody><tr><td colspan="3"></td><td class="right-date">Tangerang, ${dateLong(data.tanggal)}</td></tr><tr><td>Mengetahui,</td><td>Menyetujui,</td><td>Yang Menyerahkan,</td><td>Yang Menerima,</td></tr><tr class="signature-spacer"><td colspan="4"></td></tr><tr><td>(_________________________)</td><td>(_________________________)</td><td>(_________________________)</td><td>(_________________________)</td></tr></tbody></table>`;
  const win = window.open("", "Balance Cash Detail", "height=800,width=1200");
  if (!win) return;
  win.document.write(
    `<html><head><title>Detail Transaksi - ${dateLong(data.tanggal)}</title><style>body{font-family:Arial,sans-serif;color:#000;margin:0}.detail-page{padding:5mm}h4,h6{text-align:center;margin:2mm 0}table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6mm}th,td{border:1px solid #3a3939;padding:3px;line-height:1.2;font-size:11px;word-wrap:break-word;vertical-align:middle;text-align:center}th{background:#eee}.warning{background:#fce9b7!important;font-weight:bold}.secondary{background:#d0d0d0!important;font-weight:bold}.left{text-align:left}.right{text-align:right}.bold{font-weight:bold}.no-border,.no-border td{border:none!important}.signature{margin-top:10px}.signature td{padding:5px;text-align:center;vertical-align:bottom}.signature-spacer td{height:50px}@media print{@page{size:A4 portrait;margin:5mm 5mm 10mm 5mm}body{font-size:12px;padding:0;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.detail-page{padding:0}table{margin-bottom:6mm}th,td{padding:2px;font-size:11px}.warning,.secondary,.signature{page-break-inside:avoid}}</style></head><body>${pages}${signature}</body></html>`,
  );
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 300);
}
