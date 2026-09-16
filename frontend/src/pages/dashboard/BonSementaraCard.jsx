import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
);

function formatJt(v) {
  const sign = v < 0 ? "-" : "";
  return `${sign}Rp. ${Math.abs(v).toFixed(1)} JT`;
}

// Plugin manual (tanpa nambah dependency) buat nampilin label angka di atas/bawah
// titik data — samain gaya Laravel yg pakai chartjs-plugin-datalabels.
//
// PENYEBAB LABEL NUMPUK: nilai "Total Uang Transaksi" (bar) dan "Uang Dari
// Cashier" (garis ungu) di tiap tanggal biasanya deket banget/nyaris sama,
// jadi kalau ketiga dataset (bar + garis ungu + garis selisih) sama-sama
// dikasih label angka, ruang vertikalnya gak pernah cukup di kartu compact
// kayak gini — mau digeser berapa px juga bakal ketemu lagi/numpuk.
//
// FIX: garis "Uang Dari Cashier" gak usah dikasih label angka lagi (nilainya
// masih kebaca lewat tooltip pas hover, dan warnanya ada di legend) — cuma
// bar (Total Uang Transaksi) & garis Selisih yang dikasih label, itu pun tiap
// label dikasih "chip" background gelap di belakangnya biar tetep kebaca
// walau posisinya deket sama garis/gridline lain.
const LABELED_DATASETS = new Set([
  "Total Uang Transaksi",
  "Selisih (Cashier - Aktual)",
]);
const LABEL_OFFSET = {
  "Total Uang Transaksi": () => -10,
  "Selisih (Cashier - Aktual)": (value) => (value < 0 ? 16 : -10),
};

const valueLabelsPlugin = {
  id: "valueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((ds) => {
      if (!LABELED_DATASETS.has(ds.label)) return;
      const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(ds));
      if (meta.hidden) return;
      ctx.save();
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const getOffset = LABEL_OFFSET[ds.label] || (() => -8);
      meta.data.forEach((el, i) => {
        const value = ds.data[i];
        if (value === undefined || value === null) return;
        const text = formatJt(value);
        const y = el.y + getOffset(value);
        const w = ctx.measureText(text).width;
        // chip background biar kontras & kebaca walau numpuk sama gridline/titik lain
        ctx.fillStyle = "rgba(10, 16, 32, 0.72)";
        ctx.fillRect(el.x - w / 2 - 4, y - 7, w + 8, 14);
        ctx.fillStyle = ds.borderColor || ds.backgroundColor;
        ctx.fillText(text, el.x, y);
      });
      ctx.restore();
    });
  },
};

export default function BonSementaraCard({
  labels = [],
  totalTransaksi = [],
  uangBon = [],
  selisih = [],
}) {
  const data = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Total Uang Transaksi",
        data: totalTransaksi,
        backgroundColor: "rgba(34, 224, 160, 0.7)",
        borderRadius: 4,
        maxBarThickness: 26,
        order: 2,
      },
      {
        type: "line",
        label: "Uang Dari Cashier",
        data: uangBon,
        borderColor: "#7c4dff",
        backgroundColor: "#7c4dff",
        tension: 0.35,
        pointRadius: 3,
        order: 1,
      },
      {
        type: "line",
        label: "Selisih (Cashier - Aktual)",
        data: selisih,
        borderColor: "#ff5470",
        backgroundColor: "#ff5470",
        borderDash: [4, 3],
        tension: 0.35,
        pointRadius: 2,
        order: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // Sekarang cuma 2 dataset yg punya label (bar + selisih), jadi padding
    // gak perlu se-ekstrem sebelumnya — 26/24 udah cukup buat chip label + legend.
    layout: { padding: { top: 26, bottom: 24 } },
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#93a5c9", boxWidth: 12, font: { size: 11 } },
      },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        ticks: { color: "#5d6d8f", font: { size: 10 } },
        grid: { color: "rgba(90,150,255,0.06)" },
      },
      y: {
        ticks: {
          color: "#5d6d8f",
          font: { size: 10 },
          callback: (v) => `Rp ${v} JT`,
        },
        grid: { color: "rgba(90,150,255,0.06)" },
      },
    },
  };

  return (
    <div className="glass-card panel dash-card-fill dash-card-bon-sementara">
      <div className="panel-title">
        <h3>Bon Sementara Vs Aktual</h3>
      </div>
      <div style={{ flex: 1, minHeight: 220 }}>
        {labels.length > 0 ? (
          <Chart
            type="bar"
            data={data}
            options={options}
            plugins={[valueLabelsPlugin]}
          />
        ) : (
          <div className="empty-state">Belum ada data bon sementara</div>
        )}
      </div>
    </div>
  );
}
