import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/pemindahan-barang-input.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "55px" },
  { name: "TANGGAL", selector: (r) => r.tanggal, sortable: true },
  { name: "LOKASI AWAL", selector: (r) => r.lokasi_awal },
  { name: "TUJUAN", selector: (r) => r.lokasi_tujuan },
  { name: "RITASE", selector: (r) => r.ritase, width: "90px" },
  {
    name: "TOTAL BIAYA",
    selector: (r) => r.total_biaya,
    format: (r) => `Rp ${Number(r.total_biaya).toLocaleString("id-ID")}`,
  },
];

const fields = [
  { name: "tanggal", label: "Tanggal", type: "date", required: true },
  { name: "lokasi_awal", label: "Lokasi Awal", required: true },
  { name: "lokasi_tujuan", label: "Lokasi Tujuan", required: true },
  { name: "jenis_kendaraan", label: "Jenis Kendaraan", required: true },
  { name: "no_polisi", label: "No Polisi", required: true },
  { name: "nama_supir", label: "Nama Supir", required: true },
  { name: "ritase", label: "Ritase", type: "number", required: true },
  { name: "biaya_retribusi", label: "Biaya Retribusi (Rp)", type: "number" },
  { name: "biaya_security", label: "Biaya Security (Rp)", type: "number" },
  { name: "biaya_parkir", label: "Biaya Parkir (Rp)", type: "number" },
  { name: "uang_jalan", label: "Uang Jalan (Rp)", type: "number" },
  { name: "total_biaya", label: "Total Biaya (Rp)", type: "number", required: true },
];

const initialData = [
  {
    no: 1,
    tanggal: "2026-08-19",
    lokasi_awal: "Gudang A",
    lokasi_tujuan: "Gudang C",
    ritase: 2,
    total_biaya: 250000,
  },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function PemindahanBarang() {
  return (
    <CrudPage
      title="Pemindahan Barang"
      subtitle="Entry ongkos non reguler — transaksi pemindahan barang antar lokasi"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["lokasi_awal", "lokasi_tujuan"]}
      emptyForm={{
        tanggal: "",
        lokasi_awal: "",
        lokasi_tujuan: "",
        jenis_kendaraan: "",
        no_polisi: "",
        nama_supir: "",
        ritase: "",
        biaya_retribusi: "",
        biaya_security: "",
        biaya_parkir: "",
        uang_jalan: "",
        total_biaya: "",
      }}
      addLabel="Tambah Pemindahan"
    />
  );
}
