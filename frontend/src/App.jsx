import { User } from "lucide-react";
import Swal from "sweetalert2";
import { QRCodeCanvas } from "qrcode.react";
import Barcode from "react-barcode";
import axios from "axios";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const chartData = {
  labels: ["Jan", "Feb", "Mar"],
  datasets: [
    {
      label: "Penjualan",
      data: [10, 20, 15],
    },
  ],
};

function App() {
  const showAlert = () => {
    Swal.fire({
      title: "Berhasil",
      text: "Data tersimpan",
      icon: "success",
    });
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.aoa_to_sheet([
      ["NAMA", "UMUR", "KOTA"],
      ["Adi", 30, "Bandung"],
      ["Budi", 25, "Jakarta"],
      ["Siti", 28, "Bekasi"],
    ]);

    const range = XLSX.utils.decode_range(ws["!ref"]);

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({
          r: R,
          c: C,
        });

        if (!ws[cellRef]) continue;

        ws[cellRef].s = {
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },

          alignment: {
            horizontal: "center",
            vertical: "center",
          },
        };

        if (R === 0) {
          ws[cellRef].s = {
            ...ws[cellRef].s,

            fill: {
              fgColor: {
                rgb: "FF0000",
              },
            },

            font: {
              bold: true,
              color: {
                rgb: "FFFFFF",
              },
            },
          };
        }
      }
    }

    ws["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, "LAPORAN");

    XLSX.writeFile(wb, "laporan_styled.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);

    doc.text("LAPORAN DATA KARYAWAN", 14, 20);

    autoTable(doc, {
      startY: 30,

      head: [["Nama", "Umur", "Kota"]],

      body: [
        ["Adi", "30", "Bandung"],
        ["Budi", "25", "Jakarta"],
        ["Siti", "28", "Bekasi"],
      ],

      theme: "grid",

      headStyles: {
        fillColor: [255, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      bodyStyles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
    });

    doc.save("laporan_styled.pdf");
  };

  const getData = async () => {
    try {
      const res = await axios.get("http://localhost:5000");

      Swal.fire({
        title: "Response API",
        text: JSON.stringify(res.data),
        icon: "success",
      });

      console.log(res.data);
    } catch (error) {
      console.error(error);

      Swal.fire({
        title: "Error",
        text: "Tidak dapat terhubung ke API",
        icon: "error",
      });
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">
        <User size={32} className="me-2" />
        WEB BLANK
      </h1>

      <div className="mb-4">
        <button className="btn btn-success me-2" onClick={showAlert}>
          SweetAlert
        </button>

        <button className="btn btn-primary me-2" onClick={getData}>
          Test API
        </button>

        <button className="btn btn-warning me-2" onClick={exportExcel}>
          Export Excel
        </button>

        <button className="btn btn-danger" onClick={exportPDF}>
          Export PDF
        </button>
      </div>

      <div className="card p-3 mb-4">
        <h3>QR Code</h3>
        <QRCodeCanvas value="ADI SAPUTRA" />
      </div>

      <div className="card p-3 mb-4">
        <h3>Barcode</h3>
        <Barcode value="123456789" />
      </div>

      <div className="card p-3 mb-4">
        <h3>Grafik</h3>
        <Bar data={chartData} />
      </div>
    </div>
  );
}

export default App;
