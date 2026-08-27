import { useState } from "react";
import Swal from "sweetalert2";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "./PageHeader";
import NeoTable from "./NeoTable";
import NeoModal from "./NeoModal";
import FormField from "./FormField";

const swalDark = {
  customClass: { popup: "neo-swal" },
  confirmButtonColor: "#2f7dff",
  cancelButtonColor: "#1e2a45",
};

/**
 * CrudPage: komponen generik untuk halaman master/entry yang punya pola
 * tabel + tambah/edit/hapus. Saat ini pakai state lokal (mock data) karena
 * fokus di frontend dulu — nanti tinggal ganti `handleCreate/handleUpdate/handleDelete`
 * dengan pemanggilan axios ke endpoint backend Node.js yang query-nya sama
 * dengan controller Laravel terkait.
 */
export default function CrudPage({
  title,
  subtitle,
  columns,
  fields,
  initialData = [],
  idKey = "id",
  searchableKeys = [],
  emptyForm = {},
  addLabel = "Tambah Data",
  readOnly = false,
  extraToolbar,
}) {
  const [rows, setRows] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm(row);
    setModalOpen(true);
  };

  const handleChange = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      setRows((rs) => rs.map((r) => (r[idKey] === editing[idKey] ? { ...r, ...form } : r)));
      Swal.fire({ ...swalDark, icon: "success", title: "Data diperbarui", timer: 1300, showConfirmButton: false });
    } else {
      const newId = rows.length ? Math.max(...rows.map((r) => Number(r[idKey]) || 0)) + 1 : 1;
      setRows((rs) => [...rs, { ...form, [idKey]: newId }]);
      Swal.fire({ ...swalDark, icon: "success", title: "Data tersimpan", timer: 1300, showConfirmButton: false });
    }
    setModalOpen(false);
  };

  const handleDelete = (row) => {
    Swal.fire({
      ...swalDark,
      icon: "warning",
      title: "Hapus data ini?",
      text: "Data yang sudah dihapus tidak dapat dikembalikan.",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ff5470",
    }).then((res) => {
      if (res.isConfirmed) {
        setRows((rs) => rs.filter((r) => r[idKey] !== row[idKey]));
        Swal.fire({ ...swalDark, icon: "success", title: "Data dihapus", timer: 1200, showConfirmButton: false });
      }
    });
  };

  const tableColumns = [
    ...columns,
    ...(readOnly
      ? []
      : [
          {
            name: "ACTION",
            width: "110px",
            cell: (row) => (
              <div className="row-actions">
                <button className="icon-btn" title="Edit" onClick={() => openEdit(row)}>
                  <Pencil size={14} />
                </button>
                <button className="icon-btn danger" title="Hapus" onClick={() => handleDelete(row)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]),
  ];

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          !readOnly && (
            <button className="btn-neo primary" onClick={openCreate}>
              <Plus size={16} />
              {addLabel}
            </button>
          )
        }
      />

      <div className="glass-card panel">
        <NeoTable
          columns={tableColumns}
          data={rows}
          searchableKeys={searchableKeys}
          toolbarLeft={extraToolbar}
        />
      </div>

      <NeoModal open={modalOpen} title={editing ? `Edit ${title}` : addLabel} onClose={() => setModalOpen(false)}>
        <form className="form-neo" onSubmit={handleSubmit}>
          {fields.map((field) => (
            <FormField key={field.name} field={field} value={form[field.name]} onChange={handleChange} />
          ))}
          <div className="modal-footer">
            <button type="button" className="btn-neo ghost" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-neo primary">
              Simpan
            </button>
          </div>
        </form>
      </NeoModal>
    </div>
  );
}
