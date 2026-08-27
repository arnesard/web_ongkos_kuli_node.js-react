import PageHeader from "../../components/common/PageHeader";
import NeoTable from "../../components/common/NeoTable";
import StatCard, { StatGrid } from "../../components/common/StatCard";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

// Disamakan dengan components/balance-cash-tabel.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "55px" },
  { name: "TANGGAL", selector: (r) => r.tanggal, sortable: true },
  {
    name: "BON SEMENTARA",
    selector: (r) => r.bon_sementara,
    format: (r) => `Rp ${Number(r.bon_sementara).toLocaleString("id-ID")}`,
  },
  {
    name: "TRANSAKSI IN",
    selector: (r) => r.transaksi_in,
    format: (r) => `Rp ${Number(r.transaksi_in).toLocaleString("id-ID")}`,
  },
  {
    name: "TOTAL TRANSAKSI",
    selector: (r) => r.total_transaksi,
    format: (r) => `Rp ${Number(r.total_transaksi).toLocaleString("id-ID")}`,
  },
  {
    name: "BALANCE",
    selector: (r) => r.balance,
    cell: (r) => (
      <span style={{ color: r.balance >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
        Rp {Number(r.balance).toLocaleString("id-ID")}
      </span>
    ),
  },
];

const data = [
  { no: 1, tanggal: "2026-08-24", bon_sementara: 800000, transaksi_in: 500000, total_transaksi: 1300000, balance: -300000 },
  { no: 2, tanggal: "2026-08-23", bon_sementara: 1200000, transaksi_in: 1400000, total_transaksi: 2600000, balance: 200000 },
];

export default function BalanceCash() {
  const totalBalance = data.reduce((a, b) => a + b.balance, 0);
  const totalIn = data.reduce((a, b) => a + b.transaksi_in, 0);
  const totalBon = data.reduce((a, b) => a + b.bon_sementara, 0);

  return (
    <div>
      <PageHeader title="Balance Cash" subtitle="Ringkasan arus kas bon sementara per warehouse" />

      <StatGrid>
        <StatCard label="Total Bon Sementara" value={`Rp ${totalBon.toLocaleString("id-ID")}`} icon={Wallet} />
        <StatCard label="Total Transaksi Masuk" value={`Rp ${totalIn.toLocaleString("id-ID")}`} icon={ArrowDownCircle} />
        <StatCard
          label="Balance Akhir"
          value={`Rp ${totalBalance.toLocaleString("id-ID")}`}
          icon={ArrowUpCircle}
          trendDown={totalBalance < 0}
        />
      </StatGrid>

      <div className="glass-card panel">
        <div className="panel-title">
          <h3>Rekap Balance Cash</h3>
          <span className="hint">Data dummy — akan ditarik dari ManagementController::balanceCash</span>
        </div>
        <NeoTable columns={columns} data={data} searchableKeys={["tanggal"]} />
      </div>
    </div>
  );
}
