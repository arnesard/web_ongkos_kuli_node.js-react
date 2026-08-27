import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/uang-makan-input.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "60px" },
  { name: "TANGGAL", selector: (r) => r.tanggal, sortable: true },
  { name: "ID KULI", selector: (r) => r.id_kuli },
  { name: "NAMA KULI", selector: (r) => r.nama_kuli, grow: 1.2 },
  {
    name: "JUMLAH UANG MAKAN",
    selector: (r) => r.jumlah,
    format: (r) => `Rp ${Number(r.jumlah).toLocaleString("id-ID")}`,
  },
];

const fields = [
  { name: "tanggal", label: "Tanggal", type: "date", required: true },
  { name: "id_kuli", label: "ID Kuli", required: true },
  { name: "nama_kuli", label: "Nama Kuli", required: true },
  { name: "jumlah", label: "Jumlah Uang Makan (Rp)", type: "number", required: true },
];

const initialData = [
  { no: 1, tanggal: "2026-08-25", id_kuli: "KL-001", nama_kuli: "Sutrisno", jumlah: 30000 },
  { no: 2, tanggal: "2026-08-25", id_kuli: "KL-002", nama_kuli: "Budiman", jumlah: 30000 },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function UangMakan() {
  return (
    <CrudPage
      title="Uang Makan Kuli"
      subtitle="Entry ongkos non reguler — transaksi uang makan"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["id_kuli", "nama_kuli"]}
      emptyForm={{ tanggal: "", id_kuli: "", nama_kuli: "", jumlah: "" }}
      addLabel="Tambah Uang Makan"
    />
  );
}
