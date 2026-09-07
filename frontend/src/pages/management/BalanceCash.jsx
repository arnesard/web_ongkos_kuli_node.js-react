import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { Loader2, Printer, Search, RefreshCw } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { managementApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { printBalanceResume } from "./BalanceCashPrint";
import { printBalanceCashDetail } from "./BalanceCashDetailPrint";

const swalDark = { customClass: { popup: "neo-swal" } };
const WAREHOUSES = ["APW", "BPW", "DPW", "RPW", "JMW"];

function formatTgl(tgl) {
  if (!tgl) return "-";
  const date = new Date(tgl);
  if (Number.isNaN(date.getTime())) return tgl;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  const [printingDate, setPrintingDate] = useState("");
  const [printingMode, setPrintingMode] = useState("");
  const requestIdRef = useRef(0);

  const fetchData = async (params = {}) => {
    const requestId = ++requestIdRef.current;
    if (isHighLevel && !(params.warehouse ?? selectedWarehouse)) {
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
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal memuat data",
        text: err.response?.data?.message,
      });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCetak = async (tanggal) => {
    setPrintingDate(tanggal);
    try {
      const resume = await managementApi.balanceCashResume(
        tanggal,
        selectedWarehouse,
      );
      if (!resume.groupedByDate?.length) {
        Swal.fire({
          ...swalDark,
          icon: "warning",
          title: "Tidak ada transaksi untuk dicetak.",
        });
        return;
      }
      printBalanceResume(resume);
    } catch (err) {
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal menyiapkan cetakan",
        text: err.response?.data?.message,
      });
    } finally {
      setPrintingDate("");
    }
  };

  const handleCetakDetail = async (tanggal) => {
    setPrintingDate(tanggal);
    setPrintingMode("detail");
    try {
      const detail = await managementApi.balanceCashDetail(
        tanggal,
        selectedWarehouse,
      );
      printBalanceCashDetail(detail);
    } catch (err) {
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal menyiapkan detail cetakan",
        text: err.response?.data?.message,
      });
    } finally {
      setPrintingDate("");
      setPrintingMode("");
    }
  };

  const handleReset = () => {
    setSelectedWarehouse("");
    setTgl("");
    setNoBon("");
    fetchData({ warehouse: "", tgl: "", no_bon: "" });
  };

  const handleWarehouse = (warehouse) => {
    const next = selectedWarehouse === warehouse ? "" : warehouse;
    setSelectedWarehouse(next);
    fetchData({ warehouse: next });
  };

  return (
    <div>
      <PageHeader
        title="Balance Cash"
        subtitle="Ringkasan arus kas bon sementara per warehouse"
      />
      <div className="glass-card panel panel-elevated">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>
            Terima dari Kasir - Departement
            {selectedWarehouse && (
              <span className="badge-neo info" style={{ marginLeft: 8 }}>
                {selectedWarehouse}
              </span>
            )}
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="icon-btn"
              title="Cari"
              onClick={() => setShowFilter((state) => !state)}
            >
              <Search size={15} />
            </button>
            <button className="icon-btn" title="Refresh" onClick={handleReset}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
        {isHighLevel && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            {WAREHOUSES.map((warehouse) => (
              <button
                key={warehouse}
                type="button"
                className={`btn-neo sm ${selectedWarehouse === warehouse ? "primary" : "ghost"}`}
                onClick={() => handleWarehouse(warehouse)}
              >
                {warehouse}
              </button>
            ))}
          </div>
        )}
        {showFilter && (
          <form
            className="search-inline management-filter-row"
            onSubmit={(event) => {
              event.preventDefault();
              fetchData({});
            }}
            style={{ marginBottom: 14 }}
          >
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={tgl}
                onChange={(event) => setTgl(event.target.value)}
              />
            </div>
            <div className="field">
              <label>No Bon</label>
              <input
                type="text"
                value={noBon}
                onChange={(event) => setNoBon(event.target.value)}
                placeholder="No Bon"
              />
            </div>
            <button type="submit" className="btn-neo primary sm">
              OKE
            </button>
          </form>
        )}
        {requiresWarehouse ? (
          <div className="empty-state">
            Pilih salah satu warehouse di atas dulu untuk menampilkan data.
          </div>
        ) : loading ? (
          <div
            className="empty-state"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Loader2 size={16} className="spin" /> Memuat data...
          </div>
        ) : rekap.length === 0 ? (
          <div className="empty-state">Belum ada data untuk ditampilkan.</div>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: 620, overflowY: "auto" }}>
            <table
              className="table-bordered-neo"
              style={{ width: "100%", fontSize: 12.5 }}
            >
              <thead>
                <tr style={{ textAlign: "center" }}>
                  <th>NO</th>
                  <th>TANGGAL</th>
                  <th>BON SEMENTARA</th>
                  <th>TRANSAKSI IN</th>
                  <th>TOTAL TRANSAKSI</th>
                  <th>BALANCE</th>
                  <th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {rekap.map((row, index) => {
                  const balance =
                    Number(row.total_aktual || 0) -
                    Number(row.total_transaksi || 0);
                  const busy = printingDate === row.tgl;
                  return (
                    <tr
                      key={`${row.warehouse}-${row.tgl}`}
                      style={{ textAlign: "center" }}
                    >
                      <td>{index + 1}</td>
                      <td>{formatTgl(row.tgl)}</td>
                      <td>
                        Rp {Number(row.total_bon || 0).toLocaleString("id-ID")}
                      </td>
                      <td>
                        Rp{" "}
                        {Number(row.total_aktual || 0).toLocaleString("id-ID")}
                      </td>
                      <td>
                        Rp{" "}
                        {Number(row.total_transaksi || 0).toLocaleString(
                          "id-ID",
                        )}
                      </td>
                      <td
                        style={{
                          color:
                            balance >= 0 ? "var(--success)" : "var(--danger)",
                          fontWeight: 600,
                        }}
                      >
                        Rp {balance.toLocaleString("id-ID")}
                      </td>
                      <td
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <button
                          className="icon-btn"
                          title={`Cetak detail ${formatTgl(row.tgl)}`}
                          onClick={() => handleCetakDetail(row.tgl)}
                          disabled={busy}
                        >
                          {busy && printingMode === "detail" ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Printer size={15} />
                          )}
                        </button>
                        <button
                          className="icon-btn"
                          title={`Cetak resume ${formatTgl(row.tgl)}`}
                          onClick={() => handleCetak(row.tgl)}
                          disabled={busy}
                        >
                          {busy && printingMode !== "detail" ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Printer size={15} />
                          )}
                        </button>
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
