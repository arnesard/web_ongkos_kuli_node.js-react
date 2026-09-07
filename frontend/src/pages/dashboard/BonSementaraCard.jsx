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

ChartJS.register(LineElement, PointElement, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

function formatJt(v) {
  const sign = v < 0 ? "-" : "";
  return `${sign}Rp. ${Math.abs(v).toFixed(1)} JT`;
}

// Plugin manual (tanpa nambah dependency) buat nampilin label angka di atas/bawah
// titik data — samain gaya Laravel yg pakai chartjs-plugin-datalabels.
const valueLabelsPlugin = {
  id: "valueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((ds, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;
      ctx.save();
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      meta.data.forEach((el, i) => {
        const value = ds.data[i];
        if (value === undefined || value === null) return;
        ctx.fillStyle = ds.borderColor || ds.backgroundColor;
        const isBar = ds.type === "bar";
        const y = isBar ? el.y - 6 : el.y + (value < 0 ? 14 : -8);
        ctx.fillText(formatJt(value), el.x, y);
      });
      ctx.restore();
    });
  },
};

export default function BonSementaraCard({ labels = [], totalTransaksi = [], uangBon = [], selisih = [] }) {
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
    layout: { padding: { top: 22, bottom: 18 } },
    plugins: {
      legend: { position: "bottom", labels: { color: "#93a5c9", boxWidth: 12, font: { size: 11 } } },
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
      <div style={{ flex: 1, minHeight: 160 }}>
        {labels.length > 0 ? (
          <Chart type="bar" data={data} options={options} plugins={[valueLabelsPlugin]} />
        ) : (
          <div className="empty-state">Belum ada data bon sementara</div>
        )}
      </div>
    </div>
  );
}
