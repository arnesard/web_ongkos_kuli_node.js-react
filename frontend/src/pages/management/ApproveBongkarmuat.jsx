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

// Rupiah gak punya sen -> selalu bulatkan & jangan tampilkan desimal.
// Sebelumnya tab BS pakai total_nilai mentah (hasil sum kuantitas desimal
// kayak "5.1 TRONTON") jadi kebawa floating-point noise (mis. "4.673.429,3999999998")
// dan bikin kolom Nilai wrapping 2 baris / kepotong di kanan. Tab LPBS aman
// karena udah pakai `pembulatan` (roundToHundred) dari backend.
function formatRupiah(value) {
  return Math.round(Number(value || 0)).toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  });
}

// Jenjang approval per level: kolom status HARUS persis segini sebelum level
// itu boleh approve/reject (samain 1:1 sama validasi approveController.process
// di backend: SH cuma boleh pas status kosong, DH pas "approvebysh", HOD pas
// "approvebydh"). Sebelumnya frontend cuma cek `!isFinal` doang tanpa cek
// jenjang, jadi SH ikut kelihatan tombol Approve/Reject di row yang udah
// "DH APPROVED" — padahal backend bakal nolak (422) kalau diklik.
const STAGE_FOR_LEVEL = { sh: "", dh: "approvebysh", hod: "approvebydh" };

function formatTgl(tgl) {
  if (!tgl) return "-";
  const d = new Date(tgl);
  if (Number.isNaN(d.getTime())) return tgl;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Gagal memuat data",
          text: err.response?.data?.message,
        });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
      title:
        action === "approve" ? "Approve dokumen ini?" : "Reject dokumen ini?",
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
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Berhasil diproses",
          timer: 1200,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error("[ApproveBongkarmuat.handleAction]", err);
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Gagal memproses",
          text: err.response?.data?.message,
        });
      }
    });
  };

  const pageTitle =
    tab === "bs"
      ? "Approve Bon Sementara"
      : tab === "lpbs"
        ? "Approve Laporan Penyelesaian Bon Sementara"
        : null;

  return (
    <div>
      <PageHeader
        title="Approve Bongkar Muat"
        subtitle="Persetujuan dokumen Bon Sementara & LPBS berjenjang (SH → DH → HOD)"
      />

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
            {userLevel !== "admin" && pendingCounts.bs > 0 && (
              <span className="badge-neo danger">{pendingCounts.bs}</span>
            )}
          </button>
          <button
            type="button"
            className={`btn-neo ${tab === "lpbs" ? "primary" : "ghost"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => openTab("lpbs")}
          >
            LPBS
            {userLevel !== "admin" && pendingCounts.lpbs > 0 && (
              <span className="badge-neo danger">{pendingCounts.lpbs}</span>
            )}
          </button>
        </div>
      </div>

      {tab === null ? (
        <div className="glass-card panel">
          <div
            className="empty-state"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "40px 0",
            }}
          >
            <ClipboardList size={28} style={{ opacity: 0.4 }} />
            Tekan tombol kategori (BS / LPBS) di atas untuk menampilkan daftar
            dokumen.
          </div>
        </div>
      ) : (
        <div className="glass-card panel panel-elevated">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ margin: 0 }}>{pageTitle}</h3>
            <div
              className="form-neo"
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div className="field" style={{ minWidth: 170, marginBottom: 0 }}>
                <label>Tanggal</label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={handleDateChange}
                />
              </div>
              <div className="field" style={{ minWidth: 170, marginBottom: 0 }}>
                <label>Status</label>
                <SelectNeo
                  name="status"
                  value={status}
                  onChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>
          </div>

          {loading ? (
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
          ) : groupedData.length === 0 ? (
            <div className="empty-state">
              Tidak ada data <b>{pageTitle}</b> untuk ditampilkan.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                className="table-bordered-neo"
                style={{ width: "100%", fontSize: 12.5 }}
              >
                <thead>
                  <tr style={{ textAlign: "center" }}>
                    <th style={{ width: 44 }}>NO</th>
                    <th>Warehouse</th>
                    <th style={{ minWidth: 110 }}>Date</th>
                    <th>No Doc</th>
                    <th style={{ textAlign: "left" }}>Uraian Kegiatan</th>
                    <th>Nilai</th>
                    <th>Status</th>
                    <th style={{ minWidth: 190 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData.map((row, idx) => {
                    const rowStatus =
                      tab === "lpbs" ? row.status : row.status_bs;
                    const nilaiTampil =
                      tab === "lpbs"
                        ? (row.pembulatan ?? row.total_nilai)
                        : row.total_nilai;
                    const isFinal =
                      rowStatus === "approve" ||
                      String(rowStatus || "").includes("reject");
                    const requiredStage = STAGE_FOR_LEVEL[userLevel];
                    const canAct =
                      !isFinal &&
                      requiredStage !== undefined &&
                      (rowStatus || "") === requiredStage;

                    return (
                      <tr key={`${row.tgl}-${row.no_doc}`}>
                        <td style={{ textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ textAlign: "center" }}>{row.warehouse}</td>
                        <td style={{ textAlign: "center" }}>
                          {formatTgl(row.tgl)}
                        </td>
                        <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {row.no_doc}
                            <Link
                              to={`/${tab === "lpbs" ? "transaksi-lpbs" : "transaksi-bs"}/${encodeNoDoc(row.no_doc)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Preview / Cetak"
                              className="icon-btn"
                              style={{ display: "inline-flex" }}
                            >
                              <Printer size={13} />
                            </Link>
                          </span>
                        </td>
                        <td style={{ whiteSpace: "pre-line" }}>
                          {row.uraian_kegiatan || "-"}
                        </td>
                        <td
                          style={{ textAlign: "right", whiteSpace: "nowrap" }}
                        >
                          Rp {formatRupiah(nilaiTampil)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <StatusBadge status={rowStatus} />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {canAct ? (
                            <div
                              className="row-actions"
                              style={{ justifyContent: "center", gap: 8 }}
                            >
                              <button
                                type="button"
                                className="btn-neo success sm"
                                title="Approve"
                                onClick={() => handleAction(row, "approve")}
                              >
                                <Check size={13} />
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn-neo danger sm"
                                title="Reject"
                                onClick={() => handleAction(row, "reject")}
                              >
                                <X size={13} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-muted)",
                                fontSize: 12,
                              }}
                            >
                              —
                            </span>
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
