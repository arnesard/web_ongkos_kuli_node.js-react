import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/bongkar-rm-tabel.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "55px" },
  { name: "TANGGAL", selector: (r) => r.tanggal, sortable: true },
  { name: "MARKET", selector: (r) => r.market },
  { name: "CUSTOMER", selector: (r) => r.customer, grow: 1.4 },
  { name: "NO. TRIP", selector: (r) => r.no_trip },
  { name: "JENIS TRUK", selector: (r) => r.jenis_truk },
  { name: "NO POLISI", selector: (r) => r.no_polisi },
  { name: "GUDANG", selector: (r) => r.gudang },
  {
    name: "NILAI (RP)",
    selector: (r) => r.nilai,
    format: (r) => `Rp ${Number(r.nilai).toLocaleString("id-ID")}`,
  },
  { name: "TOTAL KULI", selector: (r) => r.total_kuli, width: "100px" },
];

const fields = [
  { name: "tanggal", label: "Tanggal", type: "date", required: true },
  { name: "market", label: "Market", required: true },
  { name: "customer", label: "Customer", required: true },
  { name: "no_trip", label: "No. Trip", required: true },
  { name: "jenis_truk", label: "Jenis Truk", required: true },
  { name: "no_polisi", label: "No Polisi", required: true },
  { name: "gudang", label: "Gudang", required: true },
  { name: "nilai", label: "Nilai (Rp)", type: "number", required: true },
  { name: "total_kuli", label: "Total Kuli", type: "number", required: true },
];

const initialData = [
  {
    no: 1,
    tanggal: "2026-08-22",
    market: "Ekspor",
    customer: "PT Cahaya Abadi",
    no_trip: "TRP-2003",
    jenis_truk: "Colt Diesel",
    no_polisi: "D 5678 ABC",
    gudang: "RM-2",
    nilai: 300000,
    total_kuli: 3,
  },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function BongkarRm() {
  return (
    <CrudPage
      title="Bongkar Muat Barang RM Warehouse"
      subtitle="Entry ongkos reguler — transaksi bongkar barang mentah (RM)"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["customer", "no_trip", "no_polisi"]}
      emptyForm={{
        tanggal: "",
        market: "",
        customer: "",
        no_trip: "",
        jenis_truk: "",
        no_polisi: "",
        gudang: "",
        nilai: "",
        total_kuli: "",
      }}
      addLabel="Tambah Transaksi Bongkar RM"
    />
  );
}
