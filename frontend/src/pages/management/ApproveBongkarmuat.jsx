import { useState } from "react";
import Swal from "sweetalert2";
import { Check, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import NeoTable from "../../components/common/NeoTable";

const swalDark = { customClass: { popup: "neo-swal" } };

// Disamakan dengan components/approve-bongkarmuat-tabel.blade.php & approve-bs-tabel.blade.php
const seed = [
  {
    id: 1,
    warehouse: "JKT",
    date: "2026-08-24",
    no_doc: "BS-0002",
    uraian: "Uang makan lembur kuli FG",
    nilai: 800000,
    status: "Pending",
  },
  {
    id: 2,
    warehouse: "SBY",
    date: "2026-08-23",
    no_doc: "LPBS-0011",
    uraian: "Bongkar muat truk ekspor",
    nilai: 1200000,
    status: "Pending",
  },
  {
    id: 3,
    warehouse: "JKT",
    date: "2026-08-22",
    no_doc: "BS-0001",
    uraian: "Biaya operasional bongkar muat RM",
    nilai: 1500000,
    status: "Approved",
  },
];

export default function ApproveBongkarmuat() {
  const [rows, setRows] = useState(seed);

  // TODO (fase backend): POST /api/approve-bongkarmuat/:no_doc (samakan dgn ManagementController::prosesApprove)
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
    }).then((res) => {
      if (res.isConfirmed) {
        setRows((rs) =>
          rs.map((r) => (r.id === row.id ? { ...r, status: action === "approve" ? "Approved" : "Rejected" } : r))
        );
        Swal.fire({ ...swalDark, icon: "success", title: "Berhasil diproses", timer: 1200, showConfirmButton: false });
      }
    });
  };

  const statusBadge = (status) => {
    const cls = status === "Approved" ? "success" : status === "Rejected" ? "danger" : "warning";
    return <span className={`badge-neo ${cls}`}>{status}</span>;
  };

  const columns = [
    { name: "NO", selector: (r, i) => i + 1, width: "55px" },
    { name: "WAREHOUSE", selector: (r) => r.warehouse, width: "110px" },
    { name: "DATE", selector: (r) => r.date, sortable: true },
    { name: "NO DOC", selector: (r) => r.no_doc, sortable: true },
    { name: "URAIAN KEGIATAN", selector: (r) => r.uraian, grow: 2 },
    {
      name: "NILAI",
      selector: (r) => r.nilai,
      format: (r) => `Rp ${Number(r.nilai).toLocaleString("id-ID")}`,
    },
    { name: "STATUS", cell: (r) => statusBadge(r.status), width: "120px" },
    {
      name: "AKSI",
      width: "110px",
      cell: (r) =>
        r.status === "Pending" ? (
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
      <PageHeader
        title="Approve Bongkarmuat"
        subtitle="Persetujuan dokumen bon sementara & LPBS yang masuk"
      />
      <div className="glass-card panel">
        <NeoTable columns={columns} data={rows} searchableKeys={["no_doc", "uraian", "warehouse"]} />
      </div>
    </div>
  );
}
