import CrudPage from "../../components/common/CrudPage";
import { kuliApi } from "../../api/endpoints";

function calcUsia(tglLahir) {
  if (!tglLahir) return "-";
  const birth = new Date(tglLahir);
  if (isNaN(birth.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Kolom & field disamakan dengan skema asli data_kuli_tbl:
// nik, nama_kuli, status (dipakai sbg tanggal lahir!), warehouse
const columns = [
  { name: "NIK", selector: (r) => r.nik, sortable: true },
  { name: "NAMA KULI", selector: (r) => r.nama_kuli, sortable: true, grow: 1.4 },
  { name: "TGL LAHIR", selector: (r) => r.status, width: "120px" },
  { name: "USIA", selector: (r) => calcUsia(r.status), width: "80px" },
  { name: "WAREHOUSE", selector: (r) => r.warehouse, sortable: true },
];

const fields = [
  { name: "nik", label: "NIK / ID Kuli", required: true },
  { name: "nama_kuli", label: "Nama Kuli", required: true },
  { name: "status", label: "Tanggal Lahir", type: "date", required: true },
  { name: "warehouse", label: "Warehouse", required: true },
];

export default function DaftarKuli() {
  return (
    <CrudPage
      title="Daftar Nama Kuli"
      subtitle="Master data kuli / tenaga bongkar muat"
      columns={columns}
      fields={fields}
      idKey="id"
      api={kuliApi}
      searchableKeys={["nik", "nama_kuli", "warehouse"]}
      emptyForm={{ nik: "", nama_kuli: "", status: "", warehouse: "" }}
      addLabel="Tambah Kuli"
    />
  );
}
