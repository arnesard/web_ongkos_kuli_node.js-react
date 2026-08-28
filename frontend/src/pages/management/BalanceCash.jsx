import { useEffect, useState } from "react";
import { Loader2, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import NeoTable from "../../components/common/NeoTable";
import StatCard, { StatGrid } from "../../components/common/StatCard";
import { managementApi } from "../../api/endpoints";

const columns = [
  { name: "TANGGAL", selector: (r) => r.tgl, sortable: true },
  { name: "WAREHOUSE", selector: (r) => r.warehouse, width: "110px" },
  {
    name: "TOTAL BON",
    selector: (r) => r.total_bon,
    format: (r) => `Rp ${Number(r.total_bon || 0).toLocaleString("id-ID")}`,
  },
  {
    name: "TOTAL AKTUAL",
    selector: (r) => r.total_aktual,
    format: (r) => `Rp ${Number(r.total_aktual || 0).toLocaleString("id-ID")}`,
  },
  {
    name: "TOTAL TRANSAKSI",
    selector: (r) => r.total_transaksi,
    format: (r) => `Rp ${Number(r.total_transaksi || 0).toLocaleString("id-ID")}`,
  },
  {
    name: "BALANCE (BON - TRANSAKSI)",
    selector: (r) => r.total_bon - r.total_transaksi,
    cell: (r) => {
      const balance = Number(r.total_bon || 0) - Number(r.total_transaksi || 0);
      return (
        <span style={{ color: balance >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
          Rp {balance.toLocaleString("id-ID")}
        </span>
      );
    },
  },
];

export default function BalanceCash() {
  const [loading, setLoading] = useState(true);
  const [rekap, setRekap] = useState([]);

  useEffect(() => {
    let mounted = true;
    managementApi
      .balanceCash()
      .then((res) => mounted && setRekap(res.rekap || []))
      .catch((err) => console.error("[BalanceCash]", err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const totalBon = rekap.reduce((a, b) => a + Number(b.total_bon || 0), 0);
  const totalTransaksi = rekap.reduce((a, b) => a + Number(b.total_transaksi || 0), 0);
  const totalBalance = totalBon - totalTransaksi;

  return (
    <div>
      <PageHeader title="Balance Cash" subtitle="Ringkasan arus kas bon sementara per warehouse" />

      <StatGrid>
        <StatCard label="Total Bon Sementara" value={`Rp ${totalBon.toLocaleString("id-ID")}`} icon={Wallet} />
        <StatCard label="Total Transaksi Aktual" value={`Rp ${totalTransaksi.toLocaleString("id-ID")}`} icon={ArrowDownCircle} />
        <StatCard
          label="Balance"
          value={`Rp ${totalBalance.toLocaleString("id-ID")}`}
          icon={ArrowUpCircle}
          trendDown={totalBalance < 0}
        />
      </StatGrid>

      <div className="glass-card panel">
        <div className="panel-title">
          <h3>Rekap Balance Cash</h3>
        </div>
        {loading ? (
          <div className="empty-state" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} className="spin" /> Memuat data...
          </div>
        ) : (
          <NeoTable columns={columns} data={rekap} searchableKeys={["warehouse", "tgl"]} />
        )}
      </div>
    </div>
  );
}
