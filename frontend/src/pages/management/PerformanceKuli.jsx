import PageHeader from "../../components/common/PageHeader";
import NeoTable from "../../components/common/NeoTable";
import { StatGrid } from "../../components/common/StatCard";
import StatCard from "../../components/common/StatCard";
import { Users, TrendingUp, Wallet } from "lucide-react";

// Disamakan dengan components/performance-kuli-tabel.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "55px" },
  { name: "ID KULI", selector: (r) => r.id_kuli, sortable: true },
  { name: "NAMA KULI", selector: (r) => r.nama_kuli, sortable: true, grow: 1.3 },
  { name: "KEHADIRAN", selector: (r) => r.kehadiran, width: "110px" },
  { name: "HARI KERJA", selector: (r) => r.hari_kerja, width: "110px" },
  {
    name: "%",
    selector: (r) => r.persentase,
    format: (r) => `${r.persentase}%`,
    width: "80px",
  },
  {
    name: "PENDAPATAN",
    selector: (r) => r.pendapatan,
    format: (r) => `Rp ${Number(r.pendapatan).toLocaleString("id-ID")}`,
  },
];

const data = [
  { no: 1, id_kuli: "KL-001", nama_kuli: "Sutrisno", kehadiran: 24, hari_kerja: 26, persentase: 92, pendapatan: 2400000 },
  { no: 2, id_kuli: "KL-002", nama_kuli: "Budiman", kehadiran: 26, hari_kerja: 26, persentase: 100, pendapatan: 2600000 },
  { no: 3, id_kuli: "KL-003", nama_kuli: "Agus Salim", kehadiran: 20, hari_kerja: 26, persentase: 77, pendapatan: 2000000 },
];

export default function PerformanceKuli() {
  return (
    <div>
      <PageHeader title="Performance Kuli" subtitle="Rekap kehadiran & pendapatan kuli per periode" />

      <StatGrid>
        <StatCard label="Total Kuli Dinilai" value={data.length} icon={Users} />
        <StatCard
          label="Rata-rata Kehadiran"
          value={`${Math.round(data.reduce((a, b) => a + b.persentase, 0) / data.length)}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Total Pendapatan"
          value={`Rp ${data.reduce((a, b) => a + b.pendapatan, 0).toLocaleString("id-ID")}`}
          icon={Wallet}
        />
      </StatGrid>

      <div className="glass-card panel">
        <div className="panel-title">
          <h3>Rekap Performance Kuli</h3>
          <span className="hint">Data dummy — akan ditarik dari ManagementController::performanceKuli</span>
        </div>
        <NeoTable columns={columns} data={data} searchableKeys={["id_kuli", "nama_kuli"]} />
      </div>
    </div>
  );
}
