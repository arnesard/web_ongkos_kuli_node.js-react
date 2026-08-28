import { useEffect, useState } from "react";
import { Loader2, Users, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import NeoTable from "../../components/common/NeoTable";
import StatCard, { StatGrid } from "../../components/common/StatCard";
import { managementApi } from "../../api/endpoints";

const columns = [
  { name: "ID KULI", selector: (r) => r.id_kuli, sortable: true, width: "110px" },
  { name: "NAMA KULI", selector: (r) => r.nama_kuli, sortable: true, grow: 1.3 },
  { name: "HADIR (HARI)", selector: (r) => r.hadir_hari, width: "120px" },
  {
    name: "PENDAPATAN MUAT/BONGKAR",
    selector: (r) => r.pendapatan_muat,
    format: (r) => `Rp ${Number(r.pendapatan_muat || 0).toLocaleString("id-ID")}`,
  },
  {
    name: "UANG MAKAN",
    selector: (r) => r.uang_makan,
    format: (r) => `Rp ${Number(r.uang_makan || 0).toLocaleString("id-ID")}`,
  },
  {
    name: "SUSUN TIRE",
    selector: (r) => r.pendapatan_susun,
    format: (r) => `Rp ${Number(r.pendapatan_susun || 0).toLocaleString("id-ID")}`,
  },
  {
    name: "TOTAL PENDAPATAN",
    selector: (r) => r.total_pendapatan,
    format: (r) => `Rp ${Number(r.total_pendapatan || 0).toLocaleString("id-ID")}`,
    sortable: true,
  },
];

export default function PerformanceKuli() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [bulan, setBulan] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    managementApi
      .performanceKuli({ bulan })
      .then((res) => mounted && setData(res.data || []))
      .catch((err) => console.error("[PerformanceKuli]", err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [bulan]);

  const totalPendapatan = data.reduce((a, b) => a + Number(b.total_pendapatan || 0), 0);
  const rataHadir = data.length ? Math.round(data.reduce((a, b) => a + Number(b.hadir_hari || 0), 0) / data.length) : 0;

  return (
    <div>
      <PageHeader
        title="Performance Kuli"
        subtitle="Rekap kehadiran & pendapatan kuli per periode"
        actions={
          <input
            type="month"
            className="form-neo"
            style={{ background: "rgba(6,12,26,0.7)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", borderRadius: 9, padding: "8px 12px" }}
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
          />
        }
      />

      <StatGrid>
        <StatCard label="Total Kuli Dinilai" value={data.length} icon={Users} />
        <StatCard label="Rata-rata Hari Hadir" value={rataHadir} icon={TrendingUp} />
        <StatCard label="Total Pendapatan" value={`Rp ${totalPendapatan.toLocaleString("id-ID")}`} icon={Wallet} />
      </StatGrid>

      <div className="glass-card panel">
        <div className="panel-title">
          <h3>Rekap Performance Kuli</h3>
        </div>
        {loading ? (
          <div className="empty-state" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} className="spin" /> Memuat data...
          </div>
        ) : (
          <NeoTable columns={columns} data={data} searchableKeys={["id_kuli", "nama_kuli"]} />
        )}
      </div>
    </div>
  );
}
