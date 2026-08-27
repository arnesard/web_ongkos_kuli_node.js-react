import { Line } from "react-chartjs-2";
import { ArrowUp } from "lucide-react";

const sparkOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { point: { radius: 0 } },
};

export default function WarehouseSparkCard({ warehouse, nominal, persen, trend }) {
  const chartData = {
    labels: trend.map((_, i) => i),
    datasets: [
      {
        data: trend,
        borderColor: "var(--accent-2)",
        backgroundColor: "rgba(0, 212, 255, 0.12)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="spark-card">
      <div className="spark-card-title">BON SEMENTARA - {warehouse}</div>
      <div className="spark-card-value">
        Rp {new Intl.NumberFormat("id-ID").format(nominal)}
      </div>
      <div className="spark-card-chart">
        <Line data={chartData} options={sparkOptions} />
      </div>
      <div className="spark-card-pct">
        <ArrowUp size={13} />
        {persen}%
      </div>
    </div>
  );
}
