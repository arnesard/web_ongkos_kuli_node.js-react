import CrudPage from "../../components/common/CrudPage";
import { userApi } from "../../api/endpoints";

// Disamakan dengan data_user_tbl (nip, nama, level, user, email, warehouse, password)
const columns = [
  { name: "NIP", selector: (r) => r.nip, sortable: true },
  { name: "NAMA", selector: (r) => r.nama, sortable: true },
  {
    name: "LEVEL",
    selector: (r) => r.level,
    cell: (r) => <span className="badge-neo info">{r.level}</span>,
  },
  { name: "USERNAME", selector: (r) => r.user },
  { name: "EMAIL", selector: (r) => r.email },
  { name: "WAREHOUSE", selector: (r) => r.warehouse, width: "110px" },
];

const fields = [
  { name: "nip", label: "NIP", required: true },
  { name: "nama", label: "Nama", required: true },
  {
    name: "level",
    label: "Level",
    type: "select",
    required: true,
    options: ["SH", "DH", "HOD", "Super_User"],
  },
  { name: "user", label: "Username", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "warehouse", label: "Warehouse", required: true },
  {
    name: "password",
    label: "Password (kosongkan jika tidak diubah)",
    type: "password",
    placeholder: "Minimal 4 karakter",
  },
];

export default function DataUser() {
  return (
    <CrudPage
      wide
      title="Data User"
      subtitle="Master data pengguna aplikasi"
      columns={columns}
      fields={fields}
      idKey="id"
      api={userApi}
      searchableKeys={["nip", "nama", "user", "warehouse"]}
      emptyForm={{ nip: "", nama: "", level: "", user: "", email: "", warehouse: "", password: "" }}
      addLabel="Tambah User"
    />
  );
}
