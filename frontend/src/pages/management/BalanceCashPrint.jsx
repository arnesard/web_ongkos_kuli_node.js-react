function rupiah(value, decimals = 2) {
  return `Rp. ${Number(value || 0).toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function terbilang(value) {
  const angka = Math.floor(Math.abs(Number(value || 0)));
  const satuan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];
  const convert = (n) => {
    if (n < 12) return satuan[n];
    if (n < 20) return `${convert(n - 10)} Belas`;
    if (n < 100)
      return `${convert(Math.floor(n / 10))} Puluh ${convert(n % 10)}`.trim();
    if (n < 200) return `Seratus ${convert(n - 100)}`.trim();
    if (n < 1000)
      return `${convert(Math.floor(n / 100))} Ratus ${convert(n % 100)}`.trim();
    if (n < 2000) return `Seribu ${convert(n - 1000)}`.trim();
    if (n < 1000000)
      return `${convert(Math.floor(n / 1000))} Ribu ${convert(n % 1000)}`.trim();
    if (n < 1000000000)
      return `${convert(Math.floor(n / 1000000))} Juta ${convert(n % 1000000)}`.trim();
    return `${convert(Math.floor(n / 1000000000))} Miliar ${convert(n % 1000000000)}`.trim();
  };
  return convert(angka) || "Nol";
}

function dateLong(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}

function renderDay(day, warehouse) {
  const markets = Object.entries(day.grouped || {});
  const totalRows = markets.reduce(
    (sum, [, items]) => sum + items.length + 1,
    0,
  );
  let firstCells = true;
  let rows = "";
  markets.forEach(([market, items]) => {
    const subtotalQty = items.reduce(
      (sum, item) => sum + Number(item.total_qty || 0),
      0,
    );
    const subtotalTotal = items.reduce(
      (sum, item) => sum + Number(item.total_biaya || 0),
      0,
    );
    items.forEach((item, index) => {
      rows += `<tr>${firstCells ? `<td rowspan="${totalRows}">${escapeHtml(dateLong(day.tgl))}</td><td rowspan="${totalRows}">Bongkar / Muat</td>` : ""}${index === 0 ? `<td rowspan="${items.length}">${escapeHtml(market)}</td>` : ""}<td>${Number(item.total_qty || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td><td>${escapeHtml(item.jenis_truk)}</td><td>${rupiah(item.biaya_truk, 0)}</td>${index === 0 ? `<td rowspan="${items.length}"></td>` : ""}<td class="total-right">${rupiah(item.total_biaya)}</td></tr>`;
      firstCells = false;
    });
    rows += `<tr class="subtotal-row"><td class="total-bold">Subtotal</td><td class="total-center total-bold">${subtotalQty.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td><td colspan="3"></td><td class="total-right total-bold">${rupiah(subtotalTotal)}</td></tr>`;
  });
  rows += `<tr class="table-warning"><td colspan="3" class="total-bold">TOTAL BONGKAR MUAT (QTY)</td><td class="total-center total-bold">${Number(day.grandTotalQty || 0).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td><td colspan="3" class="total-bold">TOTAL BONGKAR MUAT (HARGA)</td><td class="total-right total-bold">${rupiah(day.grandTotalHarga)}</td></tr>`;
  return `<section class="resume-page"><h4>RESUME TRANSAKSI</h4><h5>DEPARTEMEN ${escapeHtml(warehouse)} - ${escapeHtml(dateLong(day.tgl))}</h5><h5 class="section-title">1. Bongkar Muat</h5><table class="table-bordered"><thead><tr class="table-warning"><th>TANGGAL</th><th>JENIS PEKERJAAN</th><th>Market</th><th>JUMLAH QTY</th><th>KENDARAAN</th><th>SATUAN / @</th><th>PARAF</th><th>TOTAL BIAYA (Rp)</th></tr></thead><tbody>${rows}</tbody></table><div class="summary-grid"><div><h5 class="section-title">2. Transaksi Lainnya</h5><table class="table-bordered"><thead><tr class="table-warning"><th>JENIS TRANSAKSI LAINNYA</th><th>TOTAL BIAYA (Rp)</th></tr></thead><tbody><tr><td>Total Uang Makan Kuli</td><td class="total-right">${rupiah(day.grandTotalUangMakan)}</td></tr><tr><td>Total Susun Tire Lantai/Rak</td><td class="total-right">${rupiah(day.grandTotalSusunTire)}</td></tr><tr><td>Total Pemindahan Barang</td><td class="total-right">${rupiah(day.grandTotalPemindahanBarang)}</td></tr><tr class="table-warning"><td class="total-bold">TOTAL TRANSAKSI LAINNYA</td><td class="total-right total-bold">${rupiah(day.grandTotalTransaksiLainnya)}</td></tr></tbody></table></div><div><h5 class="section-title">3. Resume Total Biaya</h5><table class="table-bordered"><thead><tr class="table-warning"><th>KETERANGAN</th><th>NILAI (Rp)</th></tr></thead><tbody><tr><th>BIAYA KESELURUHAN</th><td class="total-center total-bold">${rupiah(day.grandTotal)}</td></tr><tr><th>PEMBULATAN (Final)</th><td class="total-center total-bold">${rupiah(day.pembulatan)}</td></tr><tr class="table-warning"><th>TERBILANG</th><td class="terbilang">${terbilang(day.pembulatan)} Rupiah</td></tr></tbody></table></div></div><table class="no-border signature-table"><tbody><tr><td colspan="3"></td><td class="right-date">Tangerang, ${escapeHtml(dateLong(day.tgl))}</td></tr><tr><td>Mengetahui,</td><td>Menyetujui,</td><td>Yang Menyerahkan,</td><td>Yang Menerima,</td></tr><tr class="signature"><td>(_________________________)</td><td>(_________________________)</td><td>(_________________________)</td><td>(_________________________)</td></tr></tbody></table></section>`;
}

export function printBalanceResume(data) {
  const pages = (data.groupedByDate || [])
    .map((day) => renderDay(day, data.selectedWarehouse))
    .join("");
  const win = window.open("", "Balance Cash Resume", "height=800,width=1200");
  if (!win) return;
  win.document.write(
    `<html><head><title>Resume Transaksi</title><style>body{font-family:Arial,sans-serif;color:#000;margin:0}.resume-page{padding:3mm 8mm 5mm}.resume-page+.resume-page{page-break-before:always}h4,h5{text-align:center;margin:5px 0 1mm}.section-title{text-align:left;margin-top:5px;margin-bottom:2px}table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:2mm}th,td{border:1px solid #000;padding:3px 5px;line-height:1.1;font-size:10px;word-break:break-all;text-align:center;vertical-align:middle}.table-warning{background:#fce9b7!important;font-weight:bold}.subtotal-row td{background:#f0f0f0}.total-right{text-align:right;white-space:nowrap}.total-bold{font-weight:bold}.total-center{text-align:center}.summary-grid{display:grid;grid-template-columns:40% 60%;gap:5px}.summary-grid table th,.summary-grid table td{text-align:left}.summary-grid table th:last-child,.summary-grid table td:last-child{text-align:right}.terbilang{font-weight:bold;text-align:left!important}.no-border,.no-border th,.no-border td{border:none!important}.signature-table{margin-top:10px}.right-date{text-align:right!important;padding-right:20px!important}.signature td{vertical-align:bottom;height:60px;font-size:10px}@media print{@page{size:A4 portrait;margin:0}body{font-size:9px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.resume-page{padding:3mm 8mm 5mm}th,td{padding:1px 3px;font-size:9px}.signature td{height:60px;padding-top:10px}}</style></head><body>${pages}</body></html>`,
  );
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 300);
}
