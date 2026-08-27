import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/kendaraan-fg-tabel.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "70px" },
  { name: "NAMA KENDARAAN", selector: (r) => r.nama_kendaraan, sortable: true },
  {
    name: "BIAYA PER TRUCK",
    selector: (r) => r.biaya_per_truck,
    format: (r) => `Rp ${Number(r.biaya_per_truck).toLocaleString("id-ID")}`,
  },
  {
    name: "POTONGAN KEPALA KULI",
    selector: (r) => r.potongan_kepala_kuli,
    format: (r) => `Rp ${Number(r.potongan_kepala_kuli).toLocaleString("id-ID")}`,
  },
];

const fields = [
  { name: "nama_kendaraan", label: "Nama Kendaraan", required: true },
  { name: "biaya_per_truck", label: "Biaya per Truck (Rp)", type: "number", required: true },
  { name: "potongan_kepala_kuli", label: "Potongan Kepala Kuli (Rp)", type: "number", required: true },
];

const initialData = [
  { no: 1, nama_kendaraan: "Fuso", biaya_per_truck: 350000, potongan_kepala_kuli: 20000 },
  { no: 2, nama_kendaraan: "Colt Diesel", biaya_per_truck: 220000, potongan_kepala_kuli: 15000 },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function KendaraanFg() {
  return (
    <CrudPage
      title="Kendaraan FG Warehouse"
      subtitle="Master data jenis kendaraan angkut FG"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["nama_kendaraan"]}
      emptyForm={{ nama_kendaraan: "", biaya_per_truck: "", potongan_kepala_kuli: "" }}
      addLabel="Tambah Kendaraan"
    />
  );
}
