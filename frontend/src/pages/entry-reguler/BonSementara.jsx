import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/bon-sementara-tabel.blade.php & bon-sementara-input.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "60px" },
  { name: "TANGGAL", selector: (r) => r.tanggal, sortable: true },
  { name: "NO DOKUMEN", selector: (r) => r.no_dokumen, sortable: true },
  { name: "URAIAN KEGIATAN", selector: (r) => r.uraian_kegiatan, grow: 2 },
  {
    name: "BON SEMENTARA",
    selector: (r) => r.bon_sementara,
    format: (r) => `Rp ${Number(r.bon_sementara).toLocaleString("id-ID")}`,
  },
  {
    name: "UANG MASUK",
    selector: (r) => r.uang_masuk,
    format: (r) => `Rp ${Number(r.uang_masuk).toLocaleString("id-ID")}`,
  },
];

const fields = [
  { name: "tanggal", label: "Tanggal", type: "date", required: true },
  { name: "no_dokumen", label: "No Dokumen", required: true },
  { name: "uraian_kegiatan", label: "Uraian Kegiatan", type: "textarea", required: true },
  { name: "bon_sementara", label: "Nilai Bon Sementara (Rp)", type: "number", required: true },
  { name: "uang_masuk", label: "Uang Masuk / Nilai Aktual (Rp)", type: "number" },
];

const initialData = [
  {
    no: 1,
    tanggal: "2026-08-20",
    no_dokumen: "BS-0001",
    uraian_kegiatan: "Biaya operasional bongkar muat RM",
    bon_sementara: 1500000,
    uang_masuk: 1450000,
  },
  {
    no: 2,
    tanggal: "2026-08-24",
    no_dokumen: "BS-0002",
    uraian_kegiatan: "Uang makan lembur kuli FG",
    bon_sementara: 800000,
    uang_masuk: 0,
  },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function BonSementara() {
  return (
    <CrudPage
      title="Permintaan Bon Sementara"
      subtitle="Entry ongkos reguler — pengajuan & realisasi bon sementara"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["no_dokumen", "uraian_kegiatan"]}
      emptyForm={{ tanggal: "", no_dokumen: "", uraian_kegiatan: "", bon_sementara: "", uang_masuk: "" }}
      addLabel="Ajukan Bon Sementara"
    />
  );
}
