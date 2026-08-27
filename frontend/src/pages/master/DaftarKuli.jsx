import CrudPage from "../../components/common/CrudPage";

// Kolom & field ini disamakan dengan components/daftar-kuli-tabel.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "70px" },
  { name: "ID KULI", selector: (r) => r.id_kuli, sortable: true },
  { name: "NAMA KULI", selector: (r) => r.nama_kuli, sortable: true },
  {
    name: "STATUS",
    selector: (r) => r.status,
    cell: (r) => (
      <span className={`badge-neo ${r.status === "Aktif" ? "success" : "danger"}`}>{r.status}</span>
    ),
  },
  { name: "BAGIAN", selector: (r) => r.bagian, sortable: true },
];

const fields = [
  { name: "id_kuli", label: "ID Kuli", required: true },
  { name: "nama_kuli", label: "Nama Kuli", required: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: ["Aktif", "Non Aktif"],
  },
  {
    name: "bagian",
    label: "Bagian",
    type: "select",
    required: true,
    options: ["FG Warehouse", "RM Warehouse", "Non Reguler"],
  },
];

const initialData = [
  { no: 1, id_kuli: "KL-001", nama_kuli: "Sutrisno", status: "Aktif", bagian: "FG Warehouse" },
  { no: 2, id_kuli: "KL-002", nama_kuli: "Budiman", status: "Aktif", bagian: "RM Warehouse" },
  { no: 3, id_kuli: "KL-003", nama_kuli: "Agus Salim", status: "Non Aktif", bagian: "FG Warehouse" },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function DaftarKuli() {
  return (
    <CrudPage
      title="Daftar Nama Kuli"
      subtitle="Master data kuli / tenaga bongkar muat"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["id_kuli", "nama_kuli", "bagian"]}
      emptyForm={{ id_kuli: "", nama_kuli: "", status: "Aktif", bagian: "" }}
      addLabel="Tambah Kuli"
    />
  );
}
