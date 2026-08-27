import CrudPage from "../../components/common/CrudPage";

// Disamakan dengan components/data-user-tabel.blade.php
const columns = [
  { name: "NO", selector: (r) => r.no, width: "60px" },
  { name: "NIP", selector: (r) => r.nip, sortable: true },
  { name: "NAMA", selector: (r) => r.nama, sortable: true },
  {
    name: "LEVEL",
    selector: (r) => r.level,
    cell: (r) => <span className="badge-neo info">{r.level}</span>,
  },
  { name: "USERNAME", selector: (r) => r.username },
  { name: "EMAIL", selector: (r) => r.email },
  { name: "WH", selector: (r) => r.warehouse, width: "90px" },
];

const fields = [
  { name: "nip", label: "NIP", required: true },
  { name: "nama", label: "Nama", required: true },
  {
    name: "level",
    label: "Level",
    type: "select",
    required: true,
    options: ["Admin", "Supervisor", "Staff"],
  },
  { name: "username", label: "Username", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "warehouse", label: "Warehouse", required: true },
];

const initialData = [
  {
    no: 1,
    nip: "EMP-001",
    nama: "Dedi Prasetyo",
    level: "Admin",
    username: "dedi.p",
    email: "dedi.p@company.com",
    warehouse: "JKT",
  },
  {
    no: 2,
    nip: "EMP-002",
    nama: "Rina Marlina",
    level: "Supervisor",
    username: "rina.m",
    email: "rina.m@company.com",
    warehouse: "SBY",
  },
].map((r, i) => ({ ...r, id: i + 1 }));

export default function DataUser() {
  return (
    <CrudPage
      title="Data User"
      subtitle="Master data pengguna aplikasi"
      columns={columns}
      fields={fields}
      initialData={initialData}
      searchableKeys={["nip", "nama", "username", "warehouse"]}
      emptyForm={{ nip: "", nama: "", level: "", username: "", email: "", warehouse: "" }}
      addLabel="Tambah User"
    />
  );
}
