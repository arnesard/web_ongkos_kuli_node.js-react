import CrudPage from "../../components/common/CrudPage";
import { barangApi } from "../../api/endpoints";

// Disamakan dengan data_barang_tbl (jenis, ongkos)
const columns = [
  { name: "JENIS BARANG", selector: (r) => r.jenis, sortable: true },
  {
    name: "ONGKOS",
    selector: (r) => r.ongkos,
    format: (r) => `Rp ${Number(r.ongkos).toLocaleString("id-ID")}`,
    sortable: true,
  },
];

const fields = [
  { name: "jenis", label: "Jenis Barang", required: true },
  { name: "ongkos", label: "Ongkos (Rp)", type: "number", required: true },
];

export default function JenisBarang() {
  return (
    <CrudPage
      title="Jenis Barang RM Warehouse"
      subtitle="Master data jenis barang beserta ongkos per unit"
      columns={columns}
      fields={fields}
      idKey="id"
      api={barangApi}
      searchableKeys={["jenis"]}
      emptyForm={{ jenis: "", ongkos: "" }}
      addLabel="Tambah Barang"
    />
  );
}
