import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { Loader2, Printer, Search, RefreshCw } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { managementApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { printHtmlTable } from "../../utils/printTable";

// ==========================================================================
// Disamakan dengan resources/views/management/balance-cash.blade.php +
// components/balance-cash-tabel.blade.php + ManagementController::balanceCash
//
// Kolom & rumus BALANCE disamakan persis: total_aktual - total_transaksi
// (BUKAN total_bon - total_transaksi seperti versi sebelumnya — itu salah
// rumus, gak sesuai Laravel).
// ==========================================================================

const swalDark = { customClass: { popup: "neo-swal" } };
const WAREHOUSES = ["APW", "BPW", "DPW", "RPW", "JMW"];

function formatTgl(tgl) {
  if (!tgl) return "-";
  const d = new Date(tgl);
  if (Number.isNaN(d.getTime())) return tgl;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BalanceCash() {
  const { user } = useAuth();
  const isHighLevel = user?.level === "HOD" || user?.level === "Superuser";

  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [tgl, setTgl] = useState("");
  const [noBon, setNoBon] = useState("");

  const [rekap, setRekap] = useState([]);
  const [requiresWarehouse, setRequiresWarehouse] = useState(false);
  const [loading, setLoading] = useState(true);
  const tableRef = useRef(null);
  // Sama kayak PerformanceKuli.jsx — jaga-jaga fetch awal (belum difilter) telat
  // resolve dan nimpa hasil fetch yang lebih baru (udah difilter).
  const requestIdRef = useRef(0);

  const fetchData = async (params = {}) => {
    const requestId = ++requestIdRef.current;
    if (isHighLevel && !(params.warehouse ?? selectedWarehouse)) {
      if (requestId !== requestIdRef.current) return;
      setRekap([]);
      setRequiresWarehouse(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await managementApi.balanceCash({
        tgl: params.tgl ?? tgl,
        no_bon: params.no_bon ?? noBon,
        warehouse: params.warehouse ?? selectedWarehouse,
      });
      if (requestId !== requestIdRef.current) return;
      setRekap(res.rekap || []);
      setRequiresWarehouse(!!res.requiresWarehouse);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("[BalanceCash.fetchData]", err);
      Swal.fire({ ...swalDark, icon: "error", title: "Gagal memuat data", text: err.response?.data?.message });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickWarehouse = (wh) => {
    const next = selectedWarehouse === wh ? "" : wh;
    setSelectedWarehouse(next);
    fetchData({ warehouse: next });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchData({});
  };

  const handleReset = () => {
    setSelectedWarehouse("");
    setTgl("");
    setNoBon("");
    fetchData({ warehouse: "", tgl: "", no_bon: "" });
  };

  const handleCetak = () => {
    if (!tableRef.current || rekap.length === 0) {
      Swal.fire({ ...swalDark, icon: "warning", title: "Tidak ada data yang akan dicetak." });
      return;
    }
    printHtmlTable("Terima dari Kasir - Departement", tableRef.current.outerHTML);
  };

  return (
    <div>
      <PageHeader title="Balance Cash" subtitle="Ringkasan arus kas bon sementara per warehouse" />

      <div className="glass-card panel panel-elevated">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>
            Terima dari Kasir - Departement
            {selectedWarehouse && <span className="badge-neo info" style={{ marginLeft: 8 }}>{selectedWarehouse}</span>}
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" title="Cetak" onClick={handleCetak}>
              <Printer size={15} />
            </button>
            <button className="icon-btn" title="Cari" onClick={() => setShowFilter((s) => !s)}>
              <Search size={15} />
            </button>
            <button className="icon-btn" title="Refresh" onClick={handleReset}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {isHighLevel && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {WAREHOUSES.map((wh) => (
              <button
                key={wh}
                type="button"
                className={`btn-neo sm ${selectedWarehouse === wh ? "primary" : "ghost"}`}
                onClick={() => pickWarehouse(wh)}
              >
                {wh}
              </button>
            ))}
          </div>
        )}

        {showFilter && (
          <form className="search-inline" onSubmit={handleFilterSubmit} style={{ marginBottom: 14 }}>
            <div className="field">
              <label>Date</label>
              <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
            </div>
            <div className="field">
              <label>No Bon</label>
              <input type="text" value={noBon} onChange={(e) => setNoBon(e.target.value)} placeholder="No Bon" />
            </div>
            <button type="submit" className="btn-neo primary sm">OKE</button>
          </form>
        )}

        {requiresWarehouse ? (
          <div className="empty-state">Pilih salah satu warehouse di atas dulu untuk menampilkan data.</div>
        ) : loading ? (
          <div className="empty-state" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} className="spin" /> Memuat data...
          </div>
        ) : rekap.length === 0 ? (
          <div className="empty-state">Belum ada data untuk ditampilkan.</div>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: 620, overflowY: "auto" }}>
            <table ref={tableRef} className="table-bordered-neo" style={{ width: "100%", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "center" }}>
                  <th>NO</th>
                  <th>TANGGAL</th>
                  <th>BON SEMENTARA</th>
                  <th>TRANSAKSI IN</th>
                  <th>TOTAL TRANSAKSI</th>
                  <th>BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {rekap.map((r, idx) => {
                  const balance = Number(r.total_aktual || 0) - Number(r.total_transaksi || 0);
                  return (
                    <tr key={`${r.warehouse}-${r.tgl}`} style={{ textAlign: "center" }}>
                      <td>{idx + 1}</td>
                      <td>{formatTgl(r.tgl)}</td>
                      <td>Rp {Number(r.total_bon || 0).toLocaleString("id-ID")}</td>
                      <td>Rp {Number(r.total_aktual || 0).toLocaleString("id-ID")}</td>
                      <td>Rp {Number(r.total_transaksi || 0).toLocaleString("id-ID")}</td>
                      <td style={{ color: balance >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                        Rp {balance.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
