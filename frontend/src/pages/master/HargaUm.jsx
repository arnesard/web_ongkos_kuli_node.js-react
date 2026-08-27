import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/harga-um-tabel.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "70px" },
  { name: "TAHUN", selector: (r) => r.tahun, sortable: true },
  {
    name: "HARGA UANG MAKAN",
    selector: (r) => r.harga,
    format: (r) => `Rp ${Number(r.harga).toLocaleString("id-ID")}`,
    sortable: true,
  },
];

const fields = [
  { name: "tahun", label: "Tahun", type: "number", required: true },
  { name: "harga", label: "Harga Uang Makan (Rp)", type: "number", required: true },
];

const initialData = [
  { no: 1, tahun: 2024, harga: 25000 },
  { no: 2, tahun: 2025, harga: 28000 },
  { no: 3, tahun: 2026, harga: 30000 },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function HargaUm() {
  return (
    <CrudPage
      title="Harga Uang Makan"
      subtitle="Master data tarif uang makan kuli per tahun"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["tahun"]}
      emptyForm={{ tahun: new Date().getFullYear(), harga: "" }}
      addLabel="Tambah Tarif"
    />
  );
}
