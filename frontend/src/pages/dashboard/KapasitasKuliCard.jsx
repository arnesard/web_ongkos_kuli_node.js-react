import { Bar } from "react-chartjs-2";

// TODO (fase backend): ganti dengan hasil query getKuliPerformanceData / kapasitas per hari
// dari DashboardController@index (dataKapasitas, dataAktual)
const kapasitasChartData = {
  labels: ["1", "3", "4", "5", "6", "7", "8", "9", "11", "12", "13", "14"],
  datasets: [
    {
      label: "Kuli datang",
      data: [1, 24, 29, 26, 26, 20, 9, 25, 27, 26, 28, 25],
      backgroundColor: "rgba(34, 224, 160, 0.75)",
      borderRadius: 4,
      maxBarThickness: 14,
    },
    {
      label: "Kuli tidak datang",
      data: [43, 20, 15, 18, 18, 24, 35, 19, 17, 18, 16, 19],
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

// TODO (fase backend): ganti dengan hasil query performa kuli (persentase hadir terendah)
const unperformData = [
  { no: 1, dept: "DPW", nama: "Jabaruddin", hadir: 0, total: 21 },
  { no: 2, dept: "DPW", nama: "Nurhayadi", hadir: 0, total: 21 },
  { no: 3, dept: "BPW", nama: "Sutrisno", hadir: 2, total: 21 },
  { no: 4, dept: "APW", nama: "Wahyudi", hadir: 3, total: 21 },
];

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

export default function KapasitasKuliCard() {
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
              {unperformData.map((row) => (
                <tr key={row.no}>
                  <td>{row.no}</td>
                  <td>{row.dept}</td>
                  <td className="unperform-nama">{row.nama}</td>
                  <td>
                    <PercentBadge hadir={row.hadir} total={row.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
