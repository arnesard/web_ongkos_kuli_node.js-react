import { Line } from "react-chartjs-2";
import { ArrowUp } from "lucide-react";

const sparkOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { point: { radius: 0 } },
};

export default function WarehouseSparkCard({ warehouse, nominal, persen, trend, isTotal = false }) {
  const chartData = {
    labels: trend.map((_, i) => i),
    datasets: [
      {
        data: trend,
        borderColor: isTotal ? "#5aa9ff" : "var(--accent-2)",
        backgroundColor: isTotal ? "rgba(90, 169, 255, 0.18)" : "rgba(0, 212, 255, 0.12)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className={`spark-card${isTotal ? " spark-card-total" : ""}`}>
      <div className="spark-card-title">
        {isTotal ? "TOTAL BON SEMENTARA" : `BON SEMENTARA - ${warehouse}`}
        {isTotal && <div className="spark-card-subtitle">HARI INI</div>}
      </div>
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
