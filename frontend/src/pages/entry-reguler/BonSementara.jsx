import { useEffect, useState } from "react";
import { Pencil, Trash2, Search, Lock } from "lucide-react";
import Swal from "sweetalert2";
import CrudPage from "../../components/common/CrudPage";
import CariAktualModal from "./CariAktualModal";
import { bonSementaraApi } from "../../api/endpoints";

const swalDark = { customClass: { popup: "neo-swal" }, confirmButtonColor: "#2f7dff" };

// Disamakan dengan data_bonsementara_tbl (tgl, no_doc, uraian_kegiatan, nilai, act_nilai, status_bs, warehouse)
const columns = [
  { name: "TANGGAL", selector: (r) => r.tgl, sortable: true },
  { name: "NO DOKUMEN", selector: (r) => r.no_doc, sortable: true },
  { name: "URAIAN KEGIATAN", selector: (r) => r.uraian_kegiatan, grow: 3 },
  {
    name: "BON SEMENTARA",
    selector: (r) => r.nilai,
    format: (r) => `Rp ${Number(r.nilai || 0).toLocaleString("id-ID")}`,
  },
  {
    // status_bs -> field aslinya buat approval SH/DH/HOD (samain sama ManagementController Laravel)
    name: "STATUS",
    selector: (r) => r.status_bs,
    cell: (r) => {
      const s = r.status_bs || "";
      const cls = s.includes("reject") ? "danger" : s === "approvebyhod" ? "success" : s ? "warning" : "info";
      const label = !s ? "Menunggu SH" : s.includes("reject") ? "Ditolak" : s === "approvebyhod" ? "Disetujui" : s;
      return <span className={`badge-neo ${cls}`}>{label}</span>;
    },
  },
];

export default function BonSementara() {
  const [cariOpen, setCariOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [noDocOptions, setNoDocOptions] = useState([]);

  // Ambil daftar no_doc yang sudah pernah diinput -> buat combobox di form "Ajukan Bon Sementara"
  useEffect(() => {
    bonSementaraApi
      .noDocs()
      .then((docs) => setNoDocOptions(Array.isArray(docs) ? docs : []))
      .catch((err) => console.error("[BonSementara.noDocs]", err));
  }, [refreshKey]);

  // fields dibikin fungsi (bukan const statis) karena "options" combobox butuh data dari state
  const fields = [
    { name: "tgl", label: "Tanggal", type: "date", required: true },
    {
      name: "no_doc",
      label: "No Dokumen",
      type: "combobox",
      required: true,
      options: noDocOptions,
      placeholder: "Ketik atau pilih no dokumen...",
    },
    { name: "uraian_kegiatan", label: "Uraian Kegiatan", type: "textarea", required: true },
    { name: "nilai", label: "Nilai Bon Sementara (Rp)", type: "number", required: true },
  ];

  // Dipakai CariAktualModal buat trigger refresh tabel utama setelah nilai aktual disimpan
  const handleSaved = () => setRefreshKey((k) => k + 1);

  const handleDeleteLocked = () => {
    Swal.fire({
      ...swalDark,
      icon: "warning",
      title: "Data sudah di-approve",
      text: "Data yang sudah di-approve SH tidak bisa diedit atau dihapus.",
    });
  };

  // Override action per-baris: kunci edit/hapus kalau status_bs sudah terisi (approved)
  const renderActions = (row, { onEdit, onDelete }) => {
    if (row.status_bs) {
      return (
        <div className="row-actions">
          <span
            className="icon-btn"
            title="Terkunci — sudah di-approve SH"
            style={{ opacity: 0.5, cursor: "not-allowed" }}
            onClick={handleDeleteLocked}
          >
            <Lock size={14} />
          </span>
        </div>
      );
    }
    return (
      <div className="row-actions">
        <button className="icon-btn" title="Edit" onClick={onEdit}>
          <Pencil size={14} />
        </button>
        <button className="icon-btn danger" title="Hapus" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  return (
    <>
      <CrudPage
        key={refreshKey}
        wide
        title="Permintaan Bon Sementara"
        subtitle="Entry ongkos reguler — pengajuan & realisasi bon sementara"
        columns={columns}
        fields={fields}
        idKey="id"
        api={bonSementaraApi}
        searchableKeys={["no_doc", "uraian_kegiatan"]}
        emptyForm={{ tgl: "", no_doc: "", uraian_kegiatan: "", nilai: "" }}
        addLabel="Ajukan Bon Sementara"
        renderActions={renderActions}
        headerActions={
          <button type="button" className="btn-neo primary" onClick={() => setCariOpen(true)}>
            <Search size={16} /> Cari No Dokumen
          </button>
        }
      />

      <CariAktualModal open={cariOpen} onClose={() => setCariOpen(false)} onSaved={handleSaved} />
    </>
  );
}
