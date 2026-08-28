import { Bar } from "react-chartjs-2";

export default function SkemaPembayaranCard({ labels = [], data = [] }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: "Jumlah Trip",
        data,
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

  return (
    <div className="glass-card panel dash-card-fill">
      <div className="panel-title">
        <h3>Trip Kuli Hari Ini</h3>
      </div>
      <div style={{ height: 320, flex: 1 }}>
        {labels.length > 0 ? (
          <Bar data={chartData} options={options} />
        ) : (
          <div className="empty-state">Belum ada trip hari ini</div>
        )}
      </div>
    </div>
  );
}
