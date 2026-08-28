import CrudPage from "../../components/common/CrudPage";
import { susunTireApi } from "../../api/endpoints";

// Disamakan dengan data_transaksi_susunlantai_tbl (join data_kendaraan_tbl -> biaya_truk)
const columns = [
  { name: "TANGGAL", selector: (r) => r.tgl, sortable: true },
  { name: "KODE TRANSAKSI", selector: (r) => r.kode_transaksi },
  { name: "JENIS TRUK", selector: (r) => r.jenis_truk },
  { name: "ITEM", selector: (r) => r.item },
  { name: "PCS", selector: (r) => r.pcs, width: "80px" },
  { name: "KUBIKASI", selector: (r) => r.kubikasi, width: "90px" },
  {
    name: "TOTAL BIAYA",
    selector: (r) => r.total_biaya,
    format: (r) => `Rp ${Number(r.total_biaya || 0).toLocaleString("id-ID")}`,
  },
];

// Catatan: `kode` di form ini adalah bagian angka saja — backend akan
// menggabungkannya jadi kode_transaksi = <ddmmyy>S<kode> otomatis.
const fields = [
  { name: "tgl", label: "Tanggal", type: "date", required: true },
  { name: "kode", label: "Kode Transaksi (angka urut)", type: "number", required: true },
  { name: "jenis_truk", label: "Jenis Truk", required: true },
  { name: "item", label: "Item", required: true },
  { name: "pcs", label: "Jumlah Pcs", type: "number", required: true },
  { name: "kubikasi", label: "Kubikasi", type: "number", required: true },
  { name: "id_kuli", label: "ID Kuli", required: true },
];

export default function SusunTire() {
  return (
    <CrudPage
      title="Susun Tire Lantai / Rak"
      subtitle="Entry ongkos non reguler — transaksi susun tire"
      columns={columns}
      fields={fields}
      idKey="id"
      api={susunTireApi}
      searchableKeys={["kode_transaksi", "item"]}
      emptyForm={{ tgl: "", kode: "", jenis_truk: "", item: "", pcs: "", kubikasi: "", id_kuli: "" }}
      addLabel="Tambah Transaksi"
    />
  );
}
