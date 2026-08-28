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

export default function BonSementaraCard({ labels = [], totalTransaksi = [], uangBon = [], selisih = [] }) {
  const data = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Total Transaksi Aktual",
        data: totalTransaksi,
        backgroundColor: "rgba(34, 224, 160, 0.7)",
        borderRadius: 4,
        maxBarThickness: 26,
        order: 2,
      },
      {
        type: "line",
        label: "Bon Sementara Diajukan",
        data: uangBon,
        borderColor: "#7c4dff",
        backgroundColor: "#7c4dff",
        tension: 0.35,
        pointRadius: 3,
        order: 1,
      },
      {
        type: "line",
        label: "Selisih (Bon - Transaksi)",
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
    <div className="glass-card panel dash-card-fill">
      <div className="panel-title">
        <h3>Bon Sementara Vs Aktual</h3>
      </div>
      <div style={{ height: 260, flex: 1 }}>
        {labels.length > 0 ? (
          <Chart type="bar" data={data} options={options} />
        ) : (
          <div className="empty-state">Belum ada data bon sementara</div>
        )}
      </div>
    </div>
  );
}
