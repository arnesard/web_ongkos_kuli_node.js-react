import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Check, X, Loader2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import NeoTable from "../../components/common/NeoTable";
import { managementApi } from "../../api/endpoints";

const swalDark = { customClass: { popup: "neo-swal" } };

export default function ApproveBongkarmuat() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await managementApi.approveList();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[ApproveBongkarmuat.fetchData]", err);
      Swal.fire({ ...swalDark, icon: "error", title: "Gagal memuat data", text: err.response?.data?.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = (row, action) => {
    Swal.fire({
      ...swalDark,
      icon: action === "approve" ? "question" : "warning",
      title: action === "approve" ? "Approve dokumen ini?" : "Reject dokumen ini?",
      text: row.no_doc,
      showCancelButton: true,
      confirmButtonText: action === "approve" ? "Ya, Approve" : "Ya, Reject",
      confirmButtonColor: action === "approve" ? "#22e0a0" : "#ff5470",
      cancelButtonColor: "#1e2a45",
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        await managementApi.approveProcess(row.no_doc, action);
        await fetchData();
        Swal.fire({ ...swalDark, icon: "success", title: "Berhasil diproses", timer: 1200, showConfirmButton: false });
      } catch (err) {
        console.error("[ApproveBongkarmuat.handleAction]", err);
        Swal.fire({ ...swalDark, icon: "error", title: "Gagal memproses", text: err.response?.data?.message });
      }
    });
  };

  const statusBadge = (status) => {
    const s = status || "";
    const cls = s.includes("reject") ? "danger" : s === "approvebyhod" ? "success" : s ? "warning" : "info";
    const label = !s ? "Menunggu SH" : s.includes("reject") ? "Ditolak" : s === "approvebyhod" ? "Disetujui" : s;
    return <span className={`badge-neo ${cls}`}>{label}</span>;
  };

  const columns = [
    { name: "WAREHOUSE", selector: (r) => r.warehouse, width: "110px" },
    { name: "TANGGAL", selector: (r) => r.tgl, sortable: true },
    { name: "NO DOC", selector: (r) => r.no_doc, sortable: true },
    { name: "URAIAN KEGIATAN", selector: (r) => r.uraian_kegiatan, grow: 2 },
    {
      name: "NILAI",
      selector: (r) => r.nilai,
      format: (r) => `Rp ${Number(r.nilai || 0).toLocaleString("id-ID")}`,
    },
    { name: "STATUS", cell: (r) => statusBadge(r.status), width: "130px" },
    {
      name: "AKSI",
      width: "110px",
      cell: (r) =>
        !r.status || (r.status && !r.status.includes("reject") && r.status !== "approvebyhod") ? (
          <div className="row-actions">
            <button className="icon-btn" title="Approve" onClick={() => handleAction(r, "approve")}>
              <Check size={14} />
            </button>
            <button className="icon-btn danger" title="Reject" onClick={() => handleAction(r, "reject")}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Approve Bongkarmuat" subtitle="Persetujuan dokumen bon sementara yang masuk" />
      <div className="glass-card panel">
        {loading ? (
          <div className="empty-state" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} className="spin" /> Memuat data...
          </div>
        ) : (
          <NeoTable columns={columns} data={rows} searchableKeys={["no_doc", "uraian_kegiatan", "warehouse"]} />
        )}
      </div>
    </div>
  );
}
