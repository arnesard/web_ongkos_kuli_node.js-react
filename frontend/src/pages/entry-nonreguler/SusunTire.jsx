import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/susun-tire-input.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "55px" },
  { name: "TANGGAL", selector: (r) => r.tanggal, sortable: true },
  { name: "KODE TRANSAKSI", selector: (r) => r.kode_transaksi },
  { name: "JENIS TRUK", selector: (r) => r.jenis_truk },
  { name: "ITEM", selector: (r) => r.item },
  { name: "KUBIKASI", selector: (r) => r.kubikasi },
  {
    name: "NILAI (RP)",
    selector: (r) => r.nilai,
    format: (r) => `Rp ${Number(r.nilai).toLocaleString("id-ID")}`,
  },
  { name: "TOTAL KULI", selector: (r) => r.total_kuli, width: "100px" },
];

const fields = [
  { name: "tanggal", label: "Tanggal", type: "date", required: true },
  { name: "kode_transaksi", label: "Kode Transaksi", required: true },
  { name: "jenis_truk", label: "Jenis Truk", required: true },
  { name: "item", label: "Item", required: true },
  { name: "kubikasi", label: "Kubikasi", type: "number", required: true },
  { name: "nilai", label: "Nilai (Rp)", type: "number", required: true },
  { name: "total_kuli", label: "Total Kuli", type: "number", required: true },
];

const initialData = [
  {
    no: 1,
    tanggal: "2026-08-21",
    kode_transaksi: "ST-0001",
    jenis_truk: "Fuso",
    item: "Tire",
    kubikasi: 12,
    nilai: 180000,
    total_kuli: 2,
  },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function SusunTire() {
  return (
    <CrudPage
      title="Susun Tire Lantai / Rak"
      subtitle="Entry ongkos non reguler — transaksi susun tire"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["kode_transaksi", "item"]}
      emptyForm={{ tanggal: "", kode_transaksi: "", jenis_truk: "", item: "", kubikasi: "", nilai: "", total_kuli: "" }}
      addLabel="Tambah Transaksi"
    />
  );
}
