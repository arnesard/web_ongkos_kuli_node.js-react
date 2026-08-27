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

// TODO (fase backend): ganti dengan hasil query rekap Bon Sementara Vs Aktual
// dari DashboardController@index ($rekap: total_transaksi, total_aktual, total_bon)
const labels = ["3", "4", "5", "6", "7", "10", "11", "12", "13", "14"];
const totalTransaksi = [5.6, 7, 5.2, 8.7, 6.1, 6, 5, 6.3, 3.6, 6.2];
const uangCashier = [5.5, 8, 4, 7.2, 7, 6.5, 8, 5.5, 8, 0];
const selisih = [-0.14, -0.58, -1.3, -0.35, 0.35, -0.29, 3, 0.13, 4.4, -6.2];

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
      data: uangCashier,
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
  plugins: {
    legend: { position: "bottom", labels: { color: "#93a5c9", boxWidth: 12, font: { size: 11 } } },
    tooltip: { mode: "index", intersect: false },
  },
  scales: {
    x: {
      ticks: { color: "#5d6d8f", font: { size: 10 } },
      grid: { color: "rgba(90,150,255,0.06)" },
      title: { display: true, text: "Agustus 2026", color: "#5d6d8f", font: { size: 10 } },
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

export default function BonSementaraCard() {
  return (
    <div className="glass-card panel dash-card-fill">
      <div className="panel-title">
        <h3>Bon Sementara Vs Aktual</h3>
      </div>
      <div style={{ height: 260, flex: 1 }}>
        <Chart type="bar" data={data} options={options} />
      </div>
    </div>
  );
}
