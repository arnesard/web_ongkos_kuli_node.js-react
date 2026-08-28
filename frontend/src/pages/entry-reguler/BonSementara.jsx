import CrudPage from "../../components/common/CrudPage";
import { bonSementaraApi } from "../../api/endpoints";

// Disamakan dengan data_bonsementara_tbl (tgl, no_doc, uraian_kegiatan, nilai, act_nilai, status, warehouse)
const columns = [
  { name: "TANGGAL", selector: (r) => r.tgl, sortable: true },
  { name: "NO DOKUMEN", selector: (r) => r.no_doc, sortable: true },
  { name: "URAIAN KEGIATAN", selector: (r) => r.uraian_kegiatan, grow: 2 },
  {
    name: "BON SEMENTARA",
    selector: (r) => r.nilai,
    format: (r) => `Rp ${Number(r.nilai || 0).toLocaleString("id-ID")}`,
  },
  {
    name: "NILAI AKTUAL",
    selector: (r) => r.act_nilai,
    format: (r) => (r.act_nilai ? `Rp ${Number(r.act_nilai).toLocaleString("id-ID")}` : "-"),
  },
  {
    name: "STATUS",
    selector: (r) => r.status,
    cell: (r) => {
      const s = r.status || "";
      const cls = s.includes("reject") ? "danger" : s === "approvebyhod" ? "success" : s ? "warning" : "info";
      const label = !s ? "Menunggu SH" : s.includes("reject") ? "Ditolak" : s === "approvebyhod" ? "Disetujui" : s;
      return <span className={`badge-neo ${cls}`}>{label}</span>;
    },
  },
];

const fields = [
  { name: "tgl", label: "Tanggal", type: "date", required: true },
  { name: "no_doc", label: "No Dokumen", required: true },
  { name: "uraian_kegiatan", label: "Uraian Kegiatan", type: "textarea", required: true },
  { name: "nilai", label: "Nilai Bon Sementara (Rp)", type: "number", required: true },
];

export default function BonSementara() {
  return (
    <CrudPage
      title="Permintaan Bon Sementara"
      subtitle="Entry ongkos reguler — pengajuan & realisasi bon sementara"
      columns={columns}
      fields={fields}
      idKey="id"
      api={bonSementaraApi}
      searchableKeys={["no_doc", "uraian_kegiatan"]}
      emptyForm={{ tgl: "", no_doc: "", uraian_kegiatan: "", nilai: "" }}
      addLabel="Ajukan Bon Sementara"
    />
  );
}
