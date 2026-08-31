import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/bongkar-luar-input.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "60px" },
  { name: "JENIS KENDARAAN", selector: (r) => r.jenis_kendaraan },
  { name: "KUBIKASI", selector: (r) => r.kubikasi },
  { name: "NAMA KULI", selector: (r) => r.nama_kuli, grow: 1.2 },
  {
    name: "TOTAL",
    selector: (r) => r.total,
    format: (r) => `Rp ${Number(r.total).toLocaleString("id-ID")}`,
  },
];

const fields = [
  { name: "jenis_kendaraan", label: "Jenis Kendaraan", required: true },
  { name: "kubikasi", label: "Kubikasi", type: "number", required: true },
  { name: "nama_kuli", label: "Nama Kuli", required: true },
  { name: "total", label: "Total (Rp)", type: "number", required: true },
];

const initialData = [
  { no: 1, jenis_kendaraan: "Fuso", kubikasi: 15, nama_kuli: "Wahyudi", total: 200000 },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function BongkarLuar() {
  return (
    <div>
      <div
        className="glass-card"
        style={{
          padding: "12px 16px",
          marginBottom: 16,
          borderColor: "rgba(255,181,69,0.4)",
          color: "var(--warning)",
          fontSize: 13,
        }}
      >
        ⚠️ Halaman ini masih pakai data dummy. Route <code>/bongkar-luar</code> ada di Laravel, tapi controller-nya
        belum pernah diimplementasikan di project aslinya (tidak ada fungsi <code>bongkarLuar()</code> di
        OngkosController). Kasih tau skema tabel & business logic yang diinginkan biar bisa dibuatkan endpoint
        backend-nya.
      </div>
      <CrudPage
        wide
        title="Bongkar Luar"
        subtitle="Entry ongkos non reguler — transaksi bongkar muat pihak luar"
        columns={columns}
        fields={fields}
        initialData={initialData}
        searchableKeys={["nama_kuli", "jenis_kendaraan"]}
        emptyForm={{ jenis_kendaraan: "", kubikasi: "", nama_kuli: "", total: "" }}
        addLabel="Tambah Transaksi"
      />
    </div>
  );
}
