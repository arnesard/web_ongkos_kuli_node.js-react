// Samain dengan function printTableOnly() yang dipakai di
// performance-kuli.blade.php & balance-cash.blade.php — buka window baru,
// isinya cuma tabel (header hitam, garis, cocok buat dicetak A4).
export function printHtmlTable(title, tableOuterHtml) {
  const win = window.open("", "", "height=800,width=1200");
  if (!win) return;

  win.document.write(`<html><head><title>${title}</title>`);
  win.document.write(`<style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 10mm; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    tr { break-inside: avoid; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #000; padding: 6px; text-align: center; }
    th {
      background-color: #000 !important;
      color: #fff !important;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    tr:nth-child(even) td {
      background-color: #f2f2f2 !important;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    h3 { text-align: center; margin-bottom: 20px; }
    @page { margin: 10mm; }
  </style>`);
  win.document.write("</head><body>");
  win.document.write(`<h3>${title}</h3>`);
  win.document.write(tableOuterHtml);
  win.document.write("</body></html>");
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 300);
}

// Samain dengan function printModalContent() di modal Nota Kuli — struk kecil,
// bukan tabel lebar kayak printHtmlTable.
export function printNotaKuli(title, bodyHtml) {
  const win = window.open("", "Print Nota Kuli", "height=700,width=500");
  if (!win) return;

  win.document.write(`<html><head><title>${title}</title>`);
  win.document.write(`<style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 6px; }
    th { background: #e5e5e5 !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
    .text-end { text-align: right; }
    .text-center { text-align: center; }
    .total-row td { background: #dceefb !important; font-weight: bold; -webkit-print-color-adjust: exact; color-adjust: exact; }
    h4, h6 { margin: 4px 0; }
    @page { margin: 5mm; }
  </style>`);
  win.document.write("</head><body>");
  win.document.write(bodyHtml);
  win.document.write("</body></html>");
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 300);
}
