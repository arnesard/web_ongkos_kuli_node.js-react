import { Bar } from "react-chartjs-2";

// TODO (fase backend): ganti dengan hasil query kuliPerTripChartData
// dari DashboardController@index (trip per kuli hari ini)
const data = {
  labels: [
    "DPW || EDOT || 1 TRIP || Rp 63.9K",
    "DPW || HAMDAN || 1 TRIP || Rp 63.9K",
    "DPW || MISJA || 1 TRIP || Rp 63.9K",
    "DPW || SARIPUDIN || 1 TRIP || Rp 63.9K",
  ],
  datasets: [
    {
      label: "Jumlah Trip",
      data: [1, 1, 1, 1],
      backgroundColor: "rgba(34, 224, 160, 0.65)",
      hoverBackgroundColor: "rgba(34, 224, 160, 0.9)",
      borderRadius: 4,
      maxBarThickness: 22,
    },
  ],
};

const options = {
  indexAxis: "y",
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: "#5d6d8f", font: { size: 10 }, stepSize: 1 },
      grid: { color: "rgba(90,150,255,0.08)" },
      title: { display: true, text: "Jumlah Trip", color: "#5d6d8f", font: { size: 10 } },
    },
    y: {
      ticks: { color: "#93a5c9", font: { size: 10.5 } },
      grid: { display: false },
    },
  },
};

export default function SkemaPembayaranCard() {
  return (
    <div className="glass-card panel dash-card-fill">
      <div className="panel-title">
        <h3>Skema Pembayaran Kuli</h3>
      </div>
      <div style={{ height: 320, flex: 1 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
