import { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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
 * CrudPage: komponen generik untuk halaman master/entry dengan pola
 * tabel + tambah/edit/hapus.
 *
 * Dua mode:
 * 1. Mode API (prop `api` diisi) -> data ditarik & disimpan ke backend Node.js beneran.
 *    api = {
 *      list: async () => Array<row>,
 *      create: async (formValues) => void,
 *      update: async (id, formValues) => void,
 *      remove: async (id) => void,
 *    }
 * 2. Mode mock (prop `initialData` diisi, `api` kosong) -> pakai state lokal saja.
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
  api = null, // { list, create, update, remove }
  wide = false, // modal lebar + form 2 kolom, buat field yang banyak biar gak perlu scroll
  renderActions, // opsional: (row, { onEdit, onDelete }) => JSX — override tombol action per-baris
  headerActions, // opsional: JSX tombol tambahan, dirender di header sebelah tombol utama (addLabel)
}) {
  const [rows, setRows] = useState(initialData);
  const [loading, setLoading] = useState(!!api);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!api?.list) return;
    setLoading(true);
    try {
      const data = await api.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[CrudPage.fetchData]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal memuat data",
        text: err.response?.data?.message || "Terjadi kesalahan saat mengambil data dari server.",
      });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (api) {
        // ---- Mode API asli ----
        if (editing) {
          await api.update(editing[idKey], form);
        } else {
          await api.create(form);
        }
        await fetchData();
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: editing ? "Data diperbarui" : "Data tersimpan",
          timer: 1300,
          showConfirmButton: false,
        });
        setModalOpen(false);
      } else {
        // ---- Mode mock lokal ----
        if (editing) {
          setRows((rs) => rs.map((r) => (r[idKey] === editing[idKey] ? { ...r, ...form } : r)));
        } else {
          const newId = rows.length ? Math.max(...rows.map((r) => Number(r[idKey]) || 0)) + 1 : 1;
          setRows((rs) => [...rs, { ...form, [idKey]: newId }]);
        }
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: editing ? "Data diperbarui" : "Data tersimpan",
          timer: 1300,
          showConfirmButton: false,
        });
        setModalOpen(false);
      }
    } catch (err) {
      console.error("[CrudPage.handleSubmit]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal menyimpan",
        text: err.response?.data?.message || "Terjadi kesalahan saat menyimpan data.",
      });
    } finally {
      setSaving(false);
    }
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
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        if (api) {
          await api.remove(row[idKey]);
          await fetchData();
        } else {
          setRows((rs) => rs.filter((r) => r[idKey] !== row[idKey]));
        }
        Swal.fire({ ...swalDark, icon: "success", title: "Data dihapus", timer: 1200, showConfirmButton: false });
      } catch (err) {
        console.error("[CrudPage.handleDelete]", err);
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Gagal menghapus",
          text: err.response?.data?.message || "Terjadi kesalahan saat menghapus data.",
        });
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
            cell: (row) =>
              renderActions ? (
                renderActions(row, { onEdit: () => openEdit(row), onDelete: () => handleDelete(row) })
              ) : (
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
          <>
            {headerActions}
            {!readOnly && (
              <button className="btn-neo primary" onClick={openCreate}>
                <Plus size={16} />
                {addLabel}
              </button>
            )}
          </>
        }
      />

      <div className="glass-card panel">
        {loading ? (
          <div className="empty-state" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} className="spin" /> Memuat data...
          </div>
        ) : (
          <NeoTable
            columns={tableColumns}
            data={rows}
            searchableKeys={searchableKeys}
            toolbarLeft={extraToolbar}
          />
        )}
      </div>

      <NeoModal
        open={modalOpen}
        title={editing ? `Edit ${title}` : addLabel}
        onClose={() => setModalOpen(false)}
        width={wide ? 880 : 560}
      >
        <form className="form-neo" onSubmit={handleSubmit}>
          <div className={wide ? "field-grid-2" : undefined}>
            {fields.map((field) => (
              <FormField key={field.name} field={field} value={form[field.name]} onChange={handleChange} />
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-neo ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="btn-neo primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </NeoModal>
    </div>
  );
}
