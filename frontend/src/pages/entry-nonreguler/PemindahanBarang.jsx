import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx-js-style";
import Swal from "sweetalert2";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import SelectNeo from "../../components/common/SelectNeo";
import { pemindahanBarangApi } from "../../api/endpoints";

// ==========================================================================
// Disamakan 1:1 dengan project Laravel:
//   resources/views/components/pemindahan-barang-input.blade.php -> form (inline, 3 baris) + tabel accordion
//   OngkosController::pemindahanBarang / store / update / destroy / exportCSV
//
// Form: Baris 1 = Tanggal / Lokasi Awal / Lokasi Tujuan / tombol Simpan
//       Baris 2 = Jenis Kendaraan / No Polisi / Nama Supir / Ritase
//       Baris 3 = 4 field Biaya (label sama "Biaya", dibedain lewat placeholder)
// Tabel: 1 baris ringkasan (NO/TANGGAL/LOKASI AWAL/TUJUAN/RITASE/TOTAL BIAYA) yang bisa
// diklik untuk expand -> detail label:value (Tanggal/Lokasi Awal/Lokasi Tujuan/Action,
// Jenis Kendaraan/No Polisi/Nama Supir/Ritase, lalu 4 komponen Biaya).
// Tidak ada proses approve/lock (kondisi $status di Laravel gak pernah kepakai).
// ==========================================================================

const swalDark = {
  customClass: { popup: "neo-swal" },
  confirmButtonColor: "#2f7dff",
  cancelButtonColor: "#1e2a45",
};

const today = () => new Date().toISOString().slice(0, 10);
const rupiah = (v) => `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
const totalBiaya = (r) =>
  (Number(r.biaya_retribusi) || 0) +
  (Number(r.biaya_security) || 0) +
  (Number(r.biaya_parkir) || 0) +
  (Number(r.biaya_uangjalan) || 0);

// Samain formatAngka() di public/js/number-formatter.js: tampilan pakai titik ribuan,
// nilai bersih (tanpa titik) yang disimpan ke form/dikirim ke backend.
const formatRibuan = (raw) => {
  const digitsOnly = String(raw || "").replace(/[^0-9]/g, "");
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const emptyForm = {
  tgl: today(),
  lokasi_awal: "",
  lokasi_tujuan: "",
  jenis_truk: "",
  nopol: "",
  driver: "",
  ritase: "",
  biaya_retribusi: "",
  biaya_security: "",
  biaya_parkir: "",
  biaya_uangjalan: "",
};

export default function PemindahanBarang() {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState([]);
  const [kendaraan, setKendaraan] = useState([]);
  const [tanggal, setTanggal] = useState(today());
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchList = async (tgl = tanggal) => {
    setLoading(true);
    try {
      const payload = await pemindahanBarangApi.meta({ tgl });
      setRows(payload.dataPemindahan || []);
      setKendaraan(payload.kendaraan || []);
      setTanggal(payload.tanggalDipilih || tgl);
    } catch (err) {
      console.error("[PemindahanBarang.fetchList]", err);
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
    fetchList(today());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (name, value) =>
    setForm((f) => ({ ...f, [name]: value }));
  const handleBiayaChange = (name, value) =>
    setForm((f) => ({ ...f, [name]: formatRibuan(value) }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      tgl: row.tgl,
      lokasi_awal: row.lokasi_awal,
      lokasi_tujuan: row.lokasi_tujuan,
      jenis_truk: row.jenis_truk,
      nopol: row.nopol,
      driver: row.driver,
      ritase: row.ritase,
      biaya_retribusi: formatRibuan(row.biaya_retribusi),
      biaya_security: formatRibuan(row.biaya_security),
      biaya_parkir: formatRibuan(row.biaya_parkir),
      biaya_uangjalan: formatRibuan(row.biaya_uangjalan),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = [
      "tgl",
      "lokasi_awal",
      "lokasi_tujuan",
      "jenis_truk",
      "nopol",
      "driver",
      "ritase",
    ];
    if (required.some((f) => !form[f])) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Semua field wajib diisi.",
      });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await pemindahanBarangApi.update(editingId, form);
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data berhasil diupdate!",
          timer: 1300,
          showConfirmButton: false,
        });
      } else {
        await pemindahanBarangApi.create(form);
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data berhasil disimpan!",
          timer: 1300,
          showConfirmButton: false,
        });
      }
      resetForm();
      await fetchList(form.tgl);
    } catch (err) {
      console.error("[PemindahanBarang.submit]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: editingId ? "Gagal mengupdate data" : "Gagal menyimpan data",
        text: err.response?.data?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row) => {
    Swal.fire({
      ...swalDark,
      icon: "warning",
      title: "Yakin mau hapus data ini?",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ff5470",
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        await pemindahanBarangApi.remove(row.id);
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data dihapus!",
          timer: 1200,
          showConfirmButton: false,
        });
        if (editingId === row.id) resetForm();
        await fetchList(tanggal);
      } catch (err) {
        console.error("[PemindahanBarang.delete]", err);
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
    fetchList(tanggal);
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
      "LOKASI AWAL": r.lokasi_awal,
      TUJUAN: r.lokasi_tujuan,
      "JENIS TRUK": r.jenis_truk,
      "NO POLISI": r.nopol,
      DRIVER: r.driver,
      RITASE: r.ritase,
      "BIAYA RETRIBUSI": Number(r.biaya_retribusi || 0),
      "BIAYA SECURITY": Number(r.biaya_security || 0),
      "BIAYA PARKIR": Number(r.biaya_parkir || 0),
      "UANG JALAN": Number(r.biaya_uangjalan || 0),
      "TOTAL BIAYA": totalBiaya(r),
      WAREHOUSE: r.warehouse,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pemindahan Barang");
    XLSX.writeFile(wb, `pemindahan_barang_${tanggal}.xlsx`);
  };

  return (
    <div>
      {/* ===== FORM INPUT (samain 3 baris di pemindahan-barang-input.blade.php) ===== */}
      <div
        className="glass-card panel panel-elevated"
        style={{ marginBottom: 16, padding: 14 }}
      >
        <form className="form-neo form-compact" onSubmit={handleSubmit}>
          {/* Baris 1 */}
          <div className="field-grid-compact">
            <div className="field">
              <label htmlFor="tgl">Tanggal</label>
              <input
                type="date"
                id="tgl"
                value={form.tgl}
                onChange={(e) => handleChange("tgl", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="lokasi_awal">Lokasi Awal</label>
              <input
                type="text"
                id="lokasi_awal"
                value={form.lokasi_awal}
                onChange={(e) => handleChange("lokasi_awal", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="lokasi_tujuan">Lokasi Tujuan</label>
              <input
                type="text"
                id="lokasi_tujuan"
                value={form.lokasi_tujuan}
                onChange={(e) => handleChange("lokasi_tujuan", e.target.value)}
                required
              />
            </div>
            <div className="field" style={{ alignSelf: "end" }}>
              <button
                type="submit"
                className="btn-neo primary sm"
                disabled={saving}
                style={{ width: "100%" }}
              >
                {saving ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
              </button>
            </div>
          </div>

          {/* Baris 2 */}
          <div className="field-grid-compact" style={{ marginTop: 10 }}>
            <div className="field">
              <label htmlFor="jenis_truk">Jenis Kendaraan</label>
              <SelectNeo
                id="jenis_truk"
                name="jenis_truk"
                value={form.jenis_truk}
                onChange={handleChange}
                options={kendaraan}
                placeholder="-- Pilih Kendaraan --"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="nopol">No Polisi</label>
              <input
                type="text"
                id="nopol"
                value={form.nopol}
                onChange={(e) =>
                  handleChange("nopol", e.target.value.toUpperCase())
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="driver">Nama Supir</label>
              <input
                type="text"
                id="driver"
                value={form.driver}
                onChange={(e) => handleChange("driver", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="ritase">Ritase</label>
              <input
                type="text"
                id="ritase"
                value={form.ritase}
                onChange={(e) => handleChange("ritase", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Baris 3 — 4 field Biaya, dibedain lewat placeholder (samain Laravel) */}
          <div className="field-grid-compact" style={{ marginTop: 10 }}>
            <div className="field">
              <label htmlFor="biaya_retribusi">Biaya</label>
              <input
                type="text"
                id="biaya_retribusi"
                placeholder="Retribusi"
                inputMode="numeric"
                value={form.biaya_retribusi}
                onChange={(e) =>
                  handleBiayaChange("biaya_retribusi", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label htmlFor="biaya_security">Biaya</label>
              <input
                type="text"
                id="biaya_security"
                placeholder="Security"
                inputMode="numeric"
                value={form.biaya_security}
                onChange={(e) =>
                  handleBiayaChange("biaya_security", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label htmlFor="biaya_parkir">Biaya</label>
              <input
                type="text"
                id="biaya_parkir"
                placeholder="TPR Kampung"
                inputMode="numeric"
                value={form.biaya_parkir}
                onChange={(e) =>
                  handleBiayaChange("biaya_parkir", e.target.value)
                }
              />
            </div>
            <div className="field">
              <label htmlFor="biaya_uangjalan">Biaya</label>
              <input
                type="text"
                id="biaya_uangjalan"
                placeholder="Uang Jalan"
                inputMode="numeric"
                value={form.biaya_uangjalan}
                onChange={(e) =>
                  handleBiayaChange("biaya_uangjalan", e.target.value)
                }
              />
            </div>
          </div>

          {editingId && (
            <div style={{ marginTop: 10 }}>
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
              marginTop: 8,
              opacity: 0.6,
              fontSize: 11,
            }}
          >
            <b>Note:</b> Tolong isi data dengan benar.
          </small>
        </form>
      </div>

      {/* ===== TABEL (accordion, samain pemindahan-barang-input.blade.php) ===== */}
      <div className="glass-card panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h5 style={{ margin: 0 }}>Daftar Pemindahan Barang</h5>
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
              onClick={() => fetchList(today())}
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
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
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
          <div className="empty-state">Tidak ada data pemindahan barang.</div>
        ) : (
          <div className="table-scroll-neo" style={{ overflow: "auto" }}>
            <table className="table-bordered-neo" style={{ fontSize: 12.5 }}>
              <thead className="sticky-thead">
                <tr style={{ textAlign: "center", opacity: 0.85 }}>
                  <th style={{ padding: "8px 6px" }}>NO</th>
                  <th style={{ padding: "8px 6px" }}>TANGGAL</th>
                  <th style={{ padding: "8px 6px" }}>LOKASI AWAL</th>
                  <th style={{ padding: "8px 6px" }}>TUJUAN</th>
                  <th style={{ padding: "8px 6px" }}>RITASE</th>
                  <th style={{ padding: "8px 6px" }}>TOTAL BIAYA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const isOpen = expandedRow === r.id;
                  return (
                    <PemindahanRow
                      key={r.id}
                      idx={idx}
                      row={r}
                      isOpen={isOpen}
                      onToggle={() => setExpandedRow(isOpen ? null : r.id)}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Baris ringkasan + detail label:value (expand/collapse), sama seperti struktur
// accordion Bootstrap `collapse` di pemindahan-barang-input.blade.php.
function PemindahanRow({ idx, row, isOpen, onToggle, onEdit, onDelete }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`row-summary${isOpen ? " open" : ""}`}
        style={{ textAlign: "center", cursor: "pointer" }}
      >
        <td style={{ padding: "8px 6px" }}>
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{" "}
          {idx + 1}
        </td>
        <td style={{ padding: "8px 6px" }}>{row.tgl}</td>
        <td style={{ padding: "8px 6px" }}>{row.lokasi_awal}</td>
        <td style={{ padding: "8px 6px" }}>{row.lokasi_tujuan}</td>
        <td style={{ padding: "8px 6px" }}>{row.ritase}</td>
        <td style={{ padding: "8px 6px" }}>{rupiah(totalBiaya(row))}</td>
      </tr>

      {isOpen && (
        <tr className="row-detail-wrap">
          <td colSpan={6} style={{ padding: "10px 6px" }}>
            <table
              className="table-bordered-neo table-detail-neo"
              style={{ fontSize: 12 }}
            >
              <tbody>
                <tr>
                  <th
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      width: "12%",
                    }}
                  >
                    Tanggal
                  </th>
                  <td style={{ padding: "6px 8px" }}>{row.tgl}</td>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Lokasi Awal
                  </th>
                  <td style={{ padding: "6px 8px" }}>{row.lokasi_awal}</td>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Lokasi Tujuan
                  </th>
                  <td style={{ padding: "6px 8px" }}>{row.lokasi_tujuan}</td>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Action
                  </th>
                  <td style={{ padding: "6px 8px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Hapus"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Jenis Kendaraan
                  </th>
                  <td style={{ padding: "6px 8px" }}>{row.jenis_truk}</td>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    No Polisi
                  </th>
                  <td style={{ padding: "6px 8px" }}>{row.nopol}</td>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Nama Supir
                  </th>
                  <td style={{ padding: "6px 8px" }}>{row.driver}</td>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Ritase
                  </th>
                  <td style={{ padding: "6px 8px" }}>{row.ritase}</td>
                </tr>
                <tr>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Biaya Retribusi
                  </th>
                  <td style={{ padding: "6px 8px" }}>
                    {rupiah(row.biaya_retribusi)}
                  </td>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Biaya Security
                  </th>
                  <td style={{ padding: "6px 8px" }}>
                    {rupiah(row.biaya_security)}
                  </td>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Biaya Parkir
                  </th>
                  <td style={{ padding: "6px 8px" }}>
                    {rupiah(row.biaya_parkir)}
                  </td>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>
                    Uang Jalan
                  </th>
                  <td style={{ padding: "6px 8px" }}>
                    {rupiah(row.biaya_uangjalan)}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
