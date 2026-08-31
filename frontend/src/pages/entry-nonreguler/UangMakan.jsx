import CrudPage from "../../components/common/CrudPage";
import { uangMakanApi } from "../../api/endpoints";

// Backend join data_transaksi_uangmakankuli_tbl + data_kuli_tbl + harga tahun berjalan
const columns = [
  { name: "TANGGAL", selector: (r) => r.tgl, sortable: true },
  { name: "ID KULI", selector: (r) => r.id_kuli },
  { name: "NAMA KULI", selector: (r) => r.nama_kuli, grow: 1.2 },
  {
    name: "JUMLAH UANG MAKAN",
    selector: (r) => r.jumlah_uang_makan,
    format: (r) => `Rp ${Number(r.jumlah_uang_makan || 0).toLocaleString("id-ID")}`,
  },
];

const fields = [
  { name: "tgl", label: "Tanggal", type: "date", required: true },
  { name: "id_kuli", label: "ID Kuli (NIK)", required: true },
];

export default function UangMakan() {
  return (
    <CrudPage
      wide
      title="Uang Makan Kuli"
      subtitle="Entry ongkos non reguler — transaksi uang makan"
      columns={columns}
      fields={fields}
      idKey="id"
      api={uangMakanApi}
      searchableKeys={["id_kuli", "nama_kuli"]}
      emptyForm={{ tgl: "", id_kuli: "" }}
      addLabel="Tambah Uang Makan"
    />
  );
}
