import CrudPage from "../../components/common/CrudPage";
import { pemindahanBarangApi } from "../../api/endpoints";

// Disamakan dengan data_transaksi_pemindahanbarang_tbl
const columns = [
  { name: "TANGGAL", selector: (r) => r.tgl, sortable: true },
  { name: "LOKASI AWAL", selector: (r) => r.lokasi_awal },
  { name: "TUJUAN", selector: (r) => r.lokasi_tujuan },
  { name: "JENIS TRUK", selector: (r) => r.jenis_truk },
  { name: "RITASE", selector: (r) => r.ritase, width: "90px" },
  { name: "NO POLISI", selector: (r) => r.nopol },
  { name: "DRIVER", selector: (r) => r.driver },
];

const fields = [
  { name: "tgl", label: "Tanggal", type: "date", required: true },
  { name: "lokasi_awal", label: "Lokasi Awal", required: true },
  { name: "lokasi_tujuan", label: "Lokasi Tujuan", required: true },
  { name: "jenis_truk", label: "Jenis Kendaraan", required: true },
  { name: "nopol", label: "No Polisi", required: true },
  { name: "driver", label: "Nama Driver", required: true },
  { name: "ritase", label: "Ritase", type: "number", required: true },
  { name: "biaya_retribusi", label: "Biaya Retribusi (Rp)", type: "number" },
  { name: "biaya_security", label: "Biaya Security (Rp)", type: "number" },
  { name: "biaya_parkir", label: "Biaya Parkir (Rp)", type: "number" },
  { name: "biaya_uangjalan", label: "Uang Jalan (Rp)", type: "number" },
];

export default function PemindahanBarang() {
  return (
    <CrudPage
      wide
      title="Pemindahan Barang"
      subtitle="Entry ongkos non reguler — transaksi pemindahan barang antar lokasi"
      columns={columns}
      fields={fields}
      idKey="id"
      api={pemindahanBarangApi}
      searchableKeys={["lokasi_awal", "lokasi_tujuan"]}
      emptyForm={{
        tgl: "", lokasi_awal: "", lokasi_tujuan: "", jenis_truk: "", nopol: "", driver: "",
        ritase: "", biaya_retribusi: "", biaya_security: "", biaya_parkir: "", biaya_uangjalan: "",
      }}
      addLabel="Tambah Pemindahan"
    />
  );
}
