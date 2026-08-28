import { Bar } from "react-chartjs-2";

function PercentBadge({ hadir, total }) {
  const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
  const level = pct <= 20 ? "danger" : pct <= 60 ? "warning" : "success";
  return (
    <div className="unperform-pct">
      <span className={`badge-neo ${level}`}>{pct}%</span>
      <div className="unperform-pct-sub">
        ({hadir} dari {total} hari)
      </div>
    </div>
  );
}

export default function KapasitasKuliCard({ labels = [], kuliDatang = [], kuliTidakDatang = [], unperformData = [] }) {
  const kapasitasChartData = {
    labels,
    datasets: [
      {
        label: "Kuli datang",
        data: kuliDatang,
        backgroundColor: "rgba(34, 224, 160, 0.75)",
        borderRadius: 4,
        maxBarThickness: 14,
      },
      {
        label: "Kuli tidak datang",
        data: kuliTidakDatang,
        backgroundColor: "rgba(93, 109, 143, 0.35)",
        borderRadius: 4,
        maxBarThickness: 14,
      },
    ],
  };

  const kapasitasChartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#93a5c9", boxWidth: 12, font: { size: 11 } },
      },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        stacked: false,
        ticks: { color: "#5d6d8f", font: { size: 10 } },
        grid: { color: "rgba(90,150,255,0.08)" },
        title: { display: true, text: "Jumlah Kuli", color: "#5d6d8f", font: { size: 10 } },
      },
      y: {
        stacked: false,
        ticks: { color: "#93a5c9", font: { size: 10 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="glass-card panel dash-card-tall">
      <div className="panel-title">
        <h3>Kapasitas Kuli Vs Aktual</h3>
      </div>
      <div style={{ height: 260 }}>
        <Bar data={kapasitasChartData} options={kapasitasChartOptions} />
      </div>

      <div className="dash-subsection">
        <h4 className="dash-subtitle">Kuli Unperform</h4>
        <div className="unperform-scroll">
          {unperformData.length > 0 ? (
            <table className="unperform-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Dept.</th>
                  <th>Nama</th>
                  <th>% Hadir</th>
                </tr>
              </thead>
              <tbody>
                {unperformData.map((row, i) => (
                  <tr key={row.nama + i}>
                    <td>{i + 1}</td>
                    <td>{row.dept}</td>
                    <td className="unperform-nama">{row.nama}</td>
                    <td>
                      <PercentBadge hadir={row.hadir} total={row.total} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">Belum ada data performa kuli bulan ini</div>
          )}
        </div>
      </div>
    </div>
  );
}
