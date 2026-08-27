import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/jenis-barang-tabel.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "70px" },
  { name: "JENIS BARANG", selector: (r) => r.jenis_barang, sortable: true },
  {
    name: "ONGKOS",
    selector: (r) => r.ongkos,
    format: (r) => `Rp ${Number(r.ongkos).toLocaleString("id-ID")}`,
    sortable: true,
  },
];

const fields = [
  { name: "jenis_barang", label: "Jenis Barang", required: true },
  { name: "ongkos", label: "Ongkos (Rp)", type: "number", required: true },
];

const initialData = [
  { no: 1, jenis_barang: "Tire", ongkos: 1500 },
  { no: 2, jenis_barang: "Tube", ongkos: 800 },
  { no: 3, jenis_barang: "Flap", ongkos: 600 },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function JenisBarang() {
  return (
    <CrudPage
      title="Jenis Barang RM Warehouse"
      subtitle="Master data jenis barang beserta ongkos per unit"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["jenis_barang"]}
      emptyForm={{ jenis_barang: "", ongkos: "" }}
      addLabel="Tambah Barang"
    />
  );
}
