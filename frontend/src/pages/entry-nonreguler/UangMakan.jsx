import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import Swal from "sweetalert2";
import {
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Loader2,
  Check,
} from "lucide-react";
import { uangMakanApi } from "../../api/endpoints";

// ==========================================================================
// Disamakan 1:1 dengan project Laravel:
//   resources/views/components/uang-makan-input.blade.php -> form (inline, bukan modal) + tabel
//   OngkosController::indexUangMakan / storeUangMakan / updateUangMakan / destroyUangMakan
//
// Catatan: form Tambah/Edit di Laravel selalu ada di halaman utama (bukan modal), dan
// baris tabel selalu punya tombol Edit + Hapus — TIDAK ada proses approve/lock di sana.
// ==========================================================================

const swalDark = {
  customClass: { popup: "neo-swal" },
  confirmButtonColor: "#2f7dff",
  cancelButtonColor: "#1e2a45",
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { tgl: today(), id_kuli: "" };

export default function UangMakan() {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState([]);
  const [nk, setNk] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchParams, setSearchParams] = useState({ tgl: "", id_kuli: "" });
  const [appliedFilters, setAppliedFilters] = useState({});

  // ---- Dropdown Kuli: bisa diketik (filter) & bisa dipilih, tema sama kayak dropdown lain ----
  const [kuliSearchText, setKuliSearchText] = useState("");
  const [kuliOpen, setKuliOpen] = useState(false);
  const kuliBoxRef = useRef(null);

  const fetchList = async (filters = appliedFilters) => {
    setLoading(true);
    try {
      const payload = await uangMakanApi.meta(filters);
      setRows(payload.dataUangMakan || []);
      setNk(payload.nk || []);
    } catch (err) {
      console.error("[UangMakan.fetchList]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal memuat data",
        text:
          err.response?.data?.message ||
          "Terjadi kesalahan saat mengambil data dari server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (kuliBoxRef.current && !kuliBoxRef.current.contains(e.target))
        setKuliOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredKuli = useMemo(() => {
    const q = kuliSearchText.toUpperCase();
    if (!q) return nk;
    return nk.filter(
      (k) =>
        k.nama_kuli?.toUpperCase().includes(q) ||
        k.nik?.toUpperCase().includes(q),
    );
  }, [nk, kuliSearchText]);

  const pickKuli = (k) => {
    setForm((f) => ({ ...f, id_kuli: k.nik }));
    setKuliSearchText(`${k.nik} (${k.nama_kuli})`);
    setKuliOpen(false);
  };

  // Bisa ketik bebas juga (misal langsung ketik NIK-nya tanpa buka dropdown) —
  // teks yang diketik langsung jadi id_kuli, dropdown tetap nampilin saran yang cocok.
  const handleKuliTyping = (value) => {
    setKuliSearchText(value.toUpperCase());
    setForm((f) => ({ ...f, id_kuli: value.toUpperCase() }));
    setKuliOpen(true);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setKuliSearchText("");
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({ tgl: row.tgl, id_kuli: row.id_kuli });
    setKuliSearchText(`${row.id_kuli} (${row.nama_kuli})`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tgl || !form.id_kuli) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Tanggal dan Kuli wajib diisi.",
      });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await uangMakanApi.update(editingId, form);
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data berhasil diperbarui.",
          timer: 1300,
          showConfirmButton: false,
        });
      } else {
        await uangMakanApi.create(form);
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data berhasil ditambahkan.",
          timer: 1300,
          showConfirmButton: false,
        });
      }
      resetForm();
      await fetchList();
    } catch (err) {
      console.error("[UangMakan.submit]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: editingId ? "Gagal memperbarui data" : "Gagal menambahkan data",
        text:
          err.response?.data?.message ||
          "Data untuk kuli ini pada tanggal tersebut mungkin sudah ada.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row) => {
    Swal.fire({
      ...swalDark,
      icon: "warning",
      title: "Yakin hapus?",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ff5470",
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        await uangMakanApi.remove(row.id);
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data dihapus!",
          timer: 1200,
          showConfirmButton: false,
        });
        if (editingId === row.id) resetForm();
        await fetchList();
      } catch (err) {
        console.error("[UangMakan.delete]", err);
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Gagal menghapus data",
        });
      }
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchOpen(false);
    setAppliedFilters(searchParams);
    fetchList(searchParams);
  };

  const handleRefresh = () => {
    setSearchParams({ tgl: "", id_kuli: "" });
    setAppliedFilters({});
    fetchList({});
  };

  const handleExportExcel = () => {
    if (rows.length === 0) {
      Swal.fire({
        ...swalDark,
        icon: "info",
        title: "Tidak ada data untuk diexport",
      });
      return;
    }
    const sheetData = rows.map((r, i) => ({
      NO: i + 1,
      TANGGAL: r.tgl,
      "ID KULI": r.id_kuli,
      "NAMA KULI": r.nama_kuli,
      WAREHOUSE: r.warehouse,
      "JUMLAH UANG MAKAN": Number(r.jumlah_uang_makan || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Uang Makan");
    XLSX.writeFile(wb, `uang_makan_${today()}.xlsx`);
  };

  return (
    <div>
      {/* ===== FORM INPUT (inline di halaman utama, samain uang-makan-input.blade.php) ===== */}
      <div
        className="glass-card panel panel-elevated"
        style={{ marginBottom: 16, padding: 14 }}
      >
        <form className="form-neo form-compact" onSubmit={handleSubmit}>
          <div className="field-grid-compact">
            <div className="field">
              <label htmlFor="tgl">
                Tanggal <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="date"
                id="tgl"
                value={form.tgl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tgl: e.target.value }))
                }
                required
              />
            </div>

            <div
              className="field"
              ref={kuliBoxRef}
              style={{ position: "relative" }}
            >
              <label htmlFor="id_kuli_input">
                Kuli <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div
                className={`multiselect-neo${kuliOpen ? " open" : ""}`}
                onClick={() => setKuliOpen(true)}
              >
                <input
                  type="text"
                  id="id_kuli_input"
                  placeholder="Pilih atau ketik Kuli..."
                  autoComplete="off"
                  value={kuliSearchText}
                  onFocus={() => setKuliOpen(true)}
                  onChange={(e) => handleKuliTyping(e.target.value)}
                  style={{
                    flex: "1 1 90px",
                    minWidth: 90,
                    border: "none",
                    background: "transparent",
                    padding: "4px 2px",
                  }}
                />
              </div>
              {kuliOpen && filteredKuli.length > 0 && (
                <div
                  className="dropdown-neo"
                  style={{
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {filteredKuli.map((k) => {
                    const picked = form.id_kuli === k.nik;
                    return (
                      <div
                        key={k.nik}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickKuli(k)}
                        className={`dropdown-neo-item${picked ? " active" : ""}`}
                      >
                        {k.nik} ({k.nama_kuli}) {picked && <Check size={13} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="field" style={{ alignSelf: "end" }}>
              <button
                type="submit"
                className="btn-neo primary sm"
                disabled={saving}
                style={{ width: "100%" }}
              >
                {saving ? "Menyimpan..." : editingId ? "Update" : "Tambah"}
              </button>
            </div>
          </div>

          {editingId && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn-neo ghost sm"
                onClick={resetForm}
              >
                Batal Edit
              </button>
            </div>
          )}
          <small
            style={{
              display: "block",
              marginTop: 6,
              opacity: 0.6,
              fontSize: 11,
            }}
          >
            <b>Note :</b> Tolong Isi Data Dengan Benar
          </small>
        </form>
      </div>

      {/* ===== TABEL (samain uang-makan-input.blade.php) ===== */}
      <div className="glass-card panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h5 style={{ margin: 0 }}>Daftar Uang Makan Kuli</h5>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="icon-btn"
              title="Export Excel"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet size={16} />
            </button>
            <button
              className="icon-btn"
              title="Cari"
              onClick={() => setSearchOpen((s) => !s)}
            >
              <Search size={16} />
            </button>
            <button
              className="icon-btn"
              title="Refresh (hari ini)"
              onClick={handleRefresh}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {searchOpen && (
          <form
            className="form-neo search-inline"
            onSubmit={handleSearch}
            style={{ marginBottom: 14 }}
          >
            <div className="field">
              <label>Tanggal</label>
              <input
                type="date"
                value={searchParams.tgl}
                onChange={(e) =>
                  setSearchParams((s) => ({ ...s, tgl: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>ID Kuli</label>
              <input
                type="text"
                placeholder="NIK Kuli"
                value={searchParams.id_kuli}
                onChange={(e) =>
                  setSearchParams((s) => ({ ...s, id_kuli: e.target.value }))
                }
              />
            </div>
            <button type="submit" className="btn-neo primary">
              Cari
            </button>
          </form>
        )}

        {loading ? (
          <div
            className="empty-state"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Loader2 size={16} className="spin" /> Memuat data...
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">Tidak ada data Uang Makan Kuli.</div>
        ) : (
          <div className="table-scroll-neo" style={{ overflow: "auto" }}>
            <table className="table-bordered-neo" style={{ fontSize: 12.5 }}>
              <thead className="sticky-thead">
                <tr style={{ textAlign: "center", opacity: 0.85 }}>
                  <th style={{ padding: "8px 6px" }}>NO</th>
                  <th style={{ padding: "8px 6px" }}>TANGGAL</th>
                  <th style={{ padding: "8px 6px" }}>ID KULI</th>
                  <th style={{ padding: "8px 6px" }}>NAMA KULI</th>
                  <th style={{ padding: "8px 6px" }}>JUMLAH UANG MAKAN</th>
                  <th style={{ padding: "8px 6px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ textAlign: "center" }}>
                    <td style={{ padding: "8px 6px" }}>{i + 1}</td>
                    <td style={{ padding: "8px 6px" }}>{r.tgl}</td>
                    <td style={{ padding: "8px 6px" }}>{r.id_kuli}</td>
                    <td style={{ padding: "8px 6px" }}>{r.nama_kuli}</td>
                    <td style={{ padding: "8px 6px" }}>
                      Rp{" "}
                      {Number(r.jumlah_uang_makan || 0).toLocaleString("id-ID")}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      <div
                        className="row-actions"
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "center",
                        }}
                      >
                        <button
                          className="icon-btn"
                          title="Edit"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-btn danger"
                          title="Hapus"
                          onClick={() => handleDelete(r)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
