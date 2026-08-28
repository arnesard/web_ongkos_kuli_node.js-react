import CrudPage from "../../components/common/CrudPage";
import { kendaraanApi } from "../../api/endpoints";

// Disamakan dengan data_kendaraan_tbl (nama_kendaraan, biaya_truk, potongan_kuli)
const columns = [
  { name: "NAMA KENDARAAN", selector: (r) => r.nama_kendaraan, sortable: true },
  {
    name: "BIAYA PER TRUCK",
    selector: (r) => r.biaya_truk,
    format: (r) => `Rp ${Number(r.biaya_truk).toLocaleString("id-ID")}`,
  },
  {
    name: "POTONGAN KEPALA KULI",
    selector: (r) => r.potongan_kuli,
    format: (r) => `Rp ${Number(r.potongan_kuli || 0).toLocaleString("id-ID")}`,
  },
];

const fields = [
  { name: "nama_kendaraan", label: "Nama Kendaraan", required: true },
  { name: "biaya_truk", label: "Biaya per Truck (Rp)", type: "number", required: true },
  { name: "potongan_kuli", label: "Potongan Kepala Kuli (Rp)", type: "number" },
];

export default function KendaraanFg() {
  return (
    <CrudPage
      title="Kendaraan FG Warehouse"
      subtitle="Master data jenis kendaraan angkut FG"
      columns={columns}
      fields={fields}
      idKey="id"
      api={kendaraanApi}
      searchableKeys={["nama_kendaraan"]}
      emptyForm={{ nama_kendaraan: "", biaya_truk: "", potongan_kuli: "" }}
      addLabel="Tambah Kendaraan"
    />
  );
}
