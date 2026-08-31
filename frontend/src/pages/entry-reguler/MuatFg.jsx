import CrudPage from "../../components/common/CrudPage";
import { muatFgApi } from "../../api/endpoints";

// Disamakan dengan data_transaksi_tbl (join data_kendaraan_tbl -> biaya_truk)
const columns = [
  { name: "TANGGAL", selector: (r) => r.tgl, sortable: true },
  { name: "MARKET", selector: (r) => r.market, width: "100px" },
  { name: "CUSTOMER", selector: (r) => r.customer, grow: 1.3 },
  { name: "NO. TRIP", selector: (r) => r.no_trip },
  { name: "JENIS TRUK", selector: (r) => r.jenis_truk },
  { name: "NO POLISI", selector: (r) => r.nopol },
  { name: "QTY TRUK", selector: (r) => r.qty_truk, width: "90px" },
  {
    name: "TOTAL BIAYA",
    selector: (r) => r.total_biaya,
    format: (r) => `Rp ${Number(r.total_biaya || 0).toLocaleString("id-ID")}`,
  },
];

// Catatan: idealnya customer/jenis_truk/kota berupa dropdown dinamis dari
// lookupApi.customer() & muatFgApi.meta() (data_kota_tbl, data_kendaraan_tbl).
// Untuk sekarang pakai input teks dulu; gampang diupgrade ke <select> nanti.
const fields = [
  { name: "tgl", label: "Tanggal", type: "date", required: true },
  {
    name: "market",
    label: "Market",
    type: "select",
    required: true,
    options: ["Lokal", "Export", "Import"],
  },
  { name: "customer", label: "Customer", required: true },
  { name: "kota", label: "Kota Tujuan", required: true },
  { name: "jam_bongkar", label: "Jam Bongkar", type: "time", required: true },
  { name: "no_trip", label: "No. Trip (tanpa prefix tanggal)", required: true },
  { name: "qty_truk", label: "Qty Truk", type: "number", required: true },
  { name: "jenis_truk", label: "Jenis Truk / Kendaraan", required: true },
  { name: "pa", label: "PA", required: true },
  { name: "nopol", label: "No Polisi", required: true },
  { name: "driver", label: "Nama Driver", required: true },
  { name: "jam_masuk", label: "Jam Masuk", type: "time", required: true },
  { name: "id_kuli", label: "ID Kuli", required: true },
  { name: "ket", label: "Keterangan" },
];

export default function MuatFg() {
  return (
    <CrudPage
      wide
      title="Muat Barang FG Warehouse"
      subtitle="Entry ongkos reguler — transaksi muat barang jadi (FG)"
      columns={columns}
      fields={fields}
      idKey="id"
      api={muatFgApi}
      searchableKeys={["customer", "no_trip", "nopol"]}
      emptyForm={{
        tgl: "", market: "", customer: "", kota: "", jam_bongkar: "", no_trip: "",
        qty_truk: "", jenis_truk: "", pa: "", nopol: "", driver: "", jam_masuk: "", id_kuli: "", ket: "",
      }}
      addLabel="Tambah Transaksi Muat FG"
    />
  );
}
