import CrudPage from "../../components/common/CrudPage";
import { umApi } from "../../api/endpoints";

// Disamakan dengan components/harga-um-tabel.blade.php (data_uang_makan_tbl)
const columns = [
  { name: "TAHUN", selector: (r) => r.tahun, sortable: true },
  {
    name: "HARGA UANG MAKAN",
    selector: (r) => r.harga_uang_makan,
    format: (r) => `Rp ${Number(r.harga_uang_makan).toLocaleString("id-ID")}`,
    sortable: true,
  },
];

const fields = [
  { name: "tahun", label: "Tahun", type: "number", required: true },
  { name: "harga_uang_makan", label: "Harga Uang Makan (Rp)", type: "number", required: true },
];

export default function HargaUm() {
  return (
    <CrudPage
      title="Harga Uang Makan"
      subtitle="Master data tarif uang makan kuli per tahun"
      columns={columns}
      fields={fields}
      idKey="id"
      api={umApi}
      searchableKeys={["tahun"]}
      emptyForm={{ tahun: new Date().getFullYear(), harga_uang_makan: "" }}
      addLabel="Tambah Tarif"
    />
  );
}
