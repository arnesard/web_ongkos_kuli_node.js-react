import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Users, Wallet, Truck, FileClock } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard, { StatGrid } from "../../components/common/StatCard";
import NeoTable from "../../components/common/NeoTable";
import { useAuth } from "../../context/AuthContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// TODO (fase backend): ganti seluruh data dummy di bawah dengan hasil query
// dari DashboardController (GET /api/dashboard)
const chartData = {
  labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  datasets: [
    {
      label: "Total Ongkos Kuli (Rp Juta)",
      data: [12, 15, 9, 18, 22, 14],
      backgroundColor: "rgba(0, 212, 255, 0.55)",
      borderRadius: 6,
      maxBarThickness: 36,
    },
  ],
};

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { labels: { color: "#93a5c9" } },
  },
  scales: {
    x: { ticks: { color: "#93a5c9" }, grid: { color: "rgba(90,150,255,0.08)" } },
    y: { ticks: { color: "#93a5c9" }, grid: { color: "rgba(90,150,255,0.08)" } },
  },
};

const kuliColumns = [
  { name: "NO.", selector: (r) => r.no, width: "70px" },
  { name: "DEPT.", selector: (r) => r.dept, sortable: true },
  { name: "NAMA KULI", selector: (r) => r.nama, sortable: true },
  { name: "USIA", selector: (r) => r.usia, sortable: true, width: "100px" },
];

const kuliData = [
  { no: 1, dept: "FG Warehouse", nama: "Sutrisno", usia: 34 },
  { no: 2, dept: "RM Warehouse", nama: "Budiman", usia: 29 },
  { no: 3, dept: "FG Warehouse", nama: "Agus Salim", usia: 41 },
  { no: 4, dept: "Non Reguler", nama: "Wahyudi", usia: 26 },
];

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title={`Selamat datang, ${user?.nama || "User"}`}
        subtitle="Ringkasan aktivitas operasional ongkos kuli hari ini"
      />

      <StatGrid>
        <StatCard label="Total Kuli Aktif" value="128" icon={Users} trend="+4 minggu ini" />
        <StatCard label="Bon Sementara Pending" value="7" icon={FileClock} trend="Perlu approval" trendDown />
        <StatCard label="Balance Cash" value="Rp 42,5 Jt" icon={Wallet} trend="Saldo warehouse" />
        <StatCard label="Trip Muat/Bongkar Hari Ini" value="19" icon={Truck} trend="+3 dari kemarin" />
      </StatGrid>

      <div className="glass-card panel">
        <div className="panel-title">
          <h3>Tren Ongkos Kuli Mingguan</h3>
          <span className="hint">Data dummy — akan ditarik dari API</span>
        </div>
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="glass-card panel">
        <div className="panel-title">
          <h3>Daftar Kuli Ringkas</h3>
          <span className="hint">Sumber: welcome-dashboard-tabel</span>
        </div>
        <NeoTable columns={kuliColumns} data={kuliData} searchableKeys={["dept", "nama"]} />
      </div>
    </div>
  );
}
