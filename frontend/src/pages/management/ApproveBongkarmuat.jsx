import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { Check, X, Loader2, ClipboardList, Printer } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SelectNeo from "../../components/common/SelectNeo";
import { managementApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { encodeNoDoc } from "../../utils/noDoc";

// ==========================================================================
// Disamakan dengan resources/views/management/approve-bongkarmuat.blade.php
// + components/approve-bs-tabel.blade.php + approve-bongkarmuat-tabel.blade.php
//
// Dua kategori approval:
//   - BS   -> pengajuan Bon Sementara awal (kolom status_bs)
//   - LPBS -> Laporan Penyelesaian Bon Sementara, nilainya dihitung ulang live
//             dari transaksi hari itu (kolom status)
// ==========================================================================

const swalDark = { customClass: { popup: "neo-swal" } };

const STATUS_OPTIONS = [
  { value: "", label: "Data All" },
  { value: "onprocess", label: "On Process" },
  { value: "approvebysh", label: "SH Approved" },
  { value: "approvebydh", label: "DH Approved" },
  { value: "approve", label: "Approved" },
  { value: "reject", label: "Reject" },
];

function formatTgl(tgl) {
  if (!tgl) return "-";
  const d = new Date(tgl);
  if (Number.isNaN(d.getTime())) return tgl;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ status }) {
  const s = status || "";
  let cls = "info";
  let label = "On Process";
  if (s === "onprocess" || s === "") {
    cls = "info";
    label = "On Process";
  } else if (s === "approvebysh") {
    cls = "warning";
    label = "SH Approved";
  } else if (s === "approvebydh") {
    cls = "warning";
    label = "DH Approved";
  } else if (s === "approve") {
    cls = "success";
    label = "Approved";
  } else if (s.includes("reject")) {
    cls = "danger";
    label = "Reject";
  }
  return <span className={`badge-neo ${cls}`}>{label}</span>;
}

export default function ApproveBongkarmuat() {
  const { user } = useAuth();
  const userLevel = String(user?.level || "").toLowerCase();

  const [tab, setTab] = useState(null); // null | "bs" | "lpbs" — samain sama "Tekan Tombol Kategori" di awal
  const [status, setStatus] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [groupedData, setGroupedData] = useState([]);
  const [pendingCounts, setPendingCounts] = useState({ bs: 0, lpbs: 0 });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(
    async (nextTab = tab, nextStatus = status, nextDate = searchDate) => {
      setLoading(true);
      try {
        const data = await managementApi.approveList({
          tab: nextTab || undefined,
          status: nextStatus || undefined,
          search_date: nextDate || undefined,
        });
        setGroupedData(data.groupedData || []);
        setPendingCounts(data.pendingCounts || { bs: 0, lpbs: 0 });
      } catch (err) {
        console.error("[ApproveBongkarmuat.fetchData]", err);
        Swal.fire({ ...swalDark, icon: "error", title: "Gagal memuat data", text: err.response?.data?.message });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Muat badge pending count begitu halaman dibuka (tab masih null)
  useEffect(() => {
    fetchData(null, "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTab = (nextTab) => {
    setTab(nextTab);
    setStatus("");
    fetchData(nextTab, "", searchDate);
  };

  const handleStatusChange = (_name, value) => {
    setStatus(value);
    fetchData(tab, value, searchDate);
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setSearchDate(value);
    fetchData(tab, status, value);
  };

  const handleAction = (row, action) => {
    Swal.fire({
      ...swalDark,
      icon: action === "approve" ? "question" : "warning",
      title: action === "approve" ? "Approve dokumen ini?" : "Reject dokumen ini?",
      text: row.no_doc,
      showCancelButton: true,
      confirmButtonText: action === "approve" ? "Ya, Approve" : "Ya, Reject",
      confirmButtonColor: action === "approve" ? "#238636" : "#ff5470",
      cancelButtonColor: "#1e2a45",
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        await managementApi.approveProcess(row.no_doc, action, tab);
        await fetchData();
        Swal.fire({ ...swalDark, icon: "success", title: "Berhasil diproses", timer: 1200, showConfirmButton: false });
      } catch (err) {
        console.error("[ApproveBongkarmuat.handleAction]", err);
        Swal.fire({ ...swalDark, icon: "error", title: "Gagal memproses", text: err.response?.data?.message });
      }
    });
  };

  const pageTitle = tab === "bs" ? "Approve Bon Sementara" : tab === "lpbs" ? "Approve Laporan Penyelesaian Bon Sementara" : null;

  return (
    <div>
      <PageHeader title="Approve Bongkar Muat" subtitle="Persetujuan dokumen Bon Sementara & LPBS berjenjang (SH → DH → HOD)" />

      {/* ===== Tombol Tab Kategori ===== */}
      <div className="glass-card panel" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px" }}>Kategori Approve</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className={`btn-neo ${tab === "bs" ? "primary" : "ghost"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => openTab("bs")}
          >
            BS
            {pendingCounts.bs > 0 && <span className="badge-neo danger">{pendingCounts.bs}</span>}
          </button>
          <button
            type="button"
            className={`btn-neo ${tab === "lpbs" ? "primary" : "ghost"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => openTab("lpbs")}
          >
            LPBS
            {pendingCounts.lpbs > 0 && <span className="badge-neo danger">{pendingCounts.lpbs}</span>}
          </button>
        </div>
      </div>

      {tab === null ? (
        <div className="glass-card panel">
          <div className="empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "40px 0" }}>
            <ClipboardList size={28} style={{ opacity: 0.4 }} />
            Tekan tombol kategori (BS / LPBS) di atas untuk menampilkan daftar dokumen.
          </div>
        </div>
      ) : (
        <div className="glass-card panel panel-elevated">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{pageTitle}</h3>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="field" style={{ minWidth: 160, marginBottom: 0 }}>
                <label>Tanggal</label>
                <input type="date" value={searchDate} onChange={handleDateChange} />
              </div>
              <div className="field" style={{ minWidth: 170, marginBottom: 0 }}>
                <label>Status</label>
                <SelectNeo name="status" value={status} onChange={handleStatusChange} options={STATUS_OPTIONS} />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="empty-state" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Loader2 size={16} className="spin" /> Memuat data...
            </div>
          ) : groupedData.length === 0 ? (
            <div className="empty-state">
              Tidak ada data <b>{pageTitle}</b> untuk ditampilkan.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table-bordered-neo" style={{ width: "100%", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "center" }}>
                    <th>NO</th>
                    <th>Warehouse</th>
                    <th>Date</th>
                    <th>No Doc</th>
                    <th style={{ textAlign: "left" }}>Uraian Kegiatan</th>
                    <th>Nilai</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData.map((row, idx) => {
                    const rowStatus = tab === "lpbs" ? row.status : row.status_bs;
                    const nilaiTampil = tab === "lpbs" ? row.pembulatan ?? row.total_nilai : row.total_nilai;
                    const isFinal = rowStatus === "approve" || String(rowStatus || "").includes("reject");
                    const canAct = userLevel !== "admin" && !isFinal;

                    return (
                      <tr key={`${row.tgl}-${row.no_doc}`}>
                        <td style={{ textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ textAlign: "center" }}>{row.warehouse}</td>
                        <td style={{ textAlign: "center" }}>{formatTgl(row.tgl)}</td>
                        <td style={{ fontWeight: 600 }}>
                          {row.no_doc}{" "}
                          <Link
                            to={`/${tab === "lpbs" ? "transaksi-lpbs" : "transaksi-bs"}/${encodeNoDoc(row.no_doc)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview / Cetak"
                            style={{ marginLeft: 4, display: "inline-flex", verticalAlign: "middle" }}
                          >
                            <Printer size={13} />
                          </Link>
                        </td>
                        <td style={{ whiteSpace: "pre-line" }}>{row.uraian_kegiatan || "-"}</td>
                        <td style={{ textAlign: "right" }}>Rp {Number(nilaiTampil || 0).toLocaleString("id-ID")}</td>
                        <td style={{ textAlign: "center" }}>
                          <StatusBadge status={rowStatus} />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {canAct ? (
                            <div className="row-actions" style={{ justifyContent: "center" }}>
                              <button className="icon-btn" title="Approve" onClick={() => handleAction(row, "approve")}>
                                <Check size={14} />
                              </button>
                              <button className="icon-btn danger" title="Reject" onClick={() => handleAction(row, "reject")}>
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
