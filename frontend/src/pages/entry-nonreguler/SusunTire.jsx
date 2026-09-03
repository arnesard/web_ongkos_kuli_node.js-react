import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import Swal from "sweetalert2";
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Search,
  RefreshCw,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import SelectNeo from "../../components/common/SelectNeo";
import { susunTireApi } from "../../api/endpoints";

// ==========================================================================
// Disamakan 1:1 dengan project Laravel:
//   resources/views/components/susun-tire-input.blade.php -> form + tabel accordion
//   public/js/susunLantai.js                               -> hint "kode transaksi terakhir"
//   OngkosController::indexSusunTire / susunLantai / deleteSusunLantai / getLastKode
//
// PENTING soal penyajian data: tabel di-GROUP per kode_transaksi (1 trip = 1 baris
// ringkasan + detail per kuli yang bisa di-expand), BUKAN flat per-row seperti CrudPage
// generik. total_biaya & jumlah kuli dihitung sekali per trip, bukan diulang per baris.
// Laravel juga cuma expose tombol Hapus di baris detail (tidak ada Edit di tabel ini).
// ==========================================================================

const swalDark = {
  customClass: { popup: "neo-swal" },
  confirmButtonColor: "#2f7dff",
  cancelButtonColor: "#1e2a45",
};

const rupiah = (v) => `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  tgl: today(),
  kode: "",
  jenis_truk: "",
  item: "",
  pcs: "",
  kubikasi: "",
};

export default function SusunTire() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [datas, setDatas] = useState([]);
  const [countKuliPerTrip, setCountKuliPerTrip] = useState({});
  const [namaKendaraan, setNamaKendaraan] = useState([]);
  const [nk, setNk] = useState([]);
  const [tanggal, setTanggal] = useState(today());
  const [loading, setLoading] = useState(true);
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastKodeInfo, setLastKodeInfo] = useState("");

  // ---- Kuli: boleh pilih lebih dari 1 sekaligus (samain pola kuli-picker di Muat FG) ----
  const [selectedKuli, setSelectedKuli] = useState([]); // [{ nik, nama_kuli }]
  const [kuliSearchText, setKuliSearchText] = useState("");
  const [kuliOpen, setKuliOpen] = useState(false);
  const kuliBoxRef = useRef(null);

  const fetchList = async (tgl = tanggal) => {
    setLoading(true);
    try {
      const payload = await susunTireApi.meta({ tanggal: tgl });
      setDatas(payload.datas || []);
      setCountKuliPerTrip(payload.countKuliPerTrip || {});
      setNamaKendaraan(
        (payload.nama_kendaraan || []).map((k) => k.nama_kendaraan),
      );
      setNk(payload.nk || []);
      setTanggal(payload.tanggal || tgl);
    } catch (err) {
      console.error("[SusunTire.fetchList]", err);
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

  // Hint "transaksi terakhir" — samain dengan public/js/susunLantai.js
  // (highlight 2 digit terakhir dari kode_transaksi terakhir di tanggal itu).
  useEffect(() => {
    if (!form.tgl) {
      setLastKodeInfo("");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { last_kode } = await susunTireApi.getLastKode({
          tgl: form.tgl,
          jenis: "susun_lantai",
        });
        setLastKodeInfo(last_kode || null);
      } catch (err) {
        console.error("[SusunTire.getLastKode]", err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [form.tgl]);

  const handleChange = (name, value) =>
    setForm((f) => ({ ...f, [name]: value }));

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
    setKuliSearchText("");
    setSelectedKuli((prev) =>
      prev.some((p) => p.nik === k.nik) ? prev : [...prev, k],
    );
  };

  const removeKuli = (nik) => {
    setSelectedKuli((prev) => prev.filter((p) => p.nik !== nik));
  };

  const grouped = useMemo(() => {
    const map = new Map();
    datas.forEach((row) => {
      if (!map.has(row.kode_transaksi)) map.set(row.kode_transaksi, []);
      map.get(row.kode_transaksi).push(row);
    });
    return [...map.entries()];
  }, [datas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.tgl ||
      !form.kode ||
      !form.jenis_truk ||
      !form.item ||
      form.pcs === "" ||
      form.kubikasi === "" ||
      selectedKuli.length === 0
    ) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Semua field wajib diisi, termasuk minimal 1 Kuli.",
      });
      return;
    }
    setSaving(true);
    try {
      // Boleh pilih lebih dari 1 kuli -> dikirim sebagai beberapa transaksi terpisah
      // (1 request per kuli), sama seperti pola di halaman Muat FG.
      let failedCount = 0;
      for (const k of selectedKuli) {
        try {
          await susunTireApi.create({ ...form, id_kuli: k.nik });
        } catch {
          failedCount += 1;
        }
      }
      if (failedCount === 0) {
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data berhasil ditambahkan.",
          timer: 1300,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          ...swalDark,
          icon: "warning",
          title: `${selectedKuli.length - failedCount} dari ${selectedKuli.length} kuli berhasil ditambahkan`,
          text: "Sebagian mungkin sudah pernah diinput untuk transaksi ini.",
        });
      }
      // Field lain tetap terisi biar gampang input kuli berikutnya untuk trip yang sama,
      // Kuli dikosongkan lagi (samain withInput($request->except('id_kuli')) di Laravel).
      setSelectedKuli([]);
      await fetchList(form.tgl);
    } catch (err) {
      console.error("[SusunTire.submit]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal menambahkan data",
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
        await susunTireApi.remove(row.id);
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data dihapus!",
          timer: 1200,
          showConfirmButton: false,
        });
        await fetchList(tanggal);
      } catch (err) {
        console.error("[SusunTire.delete]", err);
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
    if (datas.length === 0) {
      Swal.fire({
        ...swalDark,
        icon: "info",
        title: "Tidak ada data untuk diexport",
      });
      return;
    }
    const sheetData = datas.map((r, i) => ({
      NO: i + 1,
      TANGGAL: r.tgl,
      "KODE TRANSAKSI": r.kode_transaksi,
      "ID KULI": r.id_kuli,
      PCS: r.pcs,
      "JENIS TRUK": r.jenis_truk,
      ITEM: r.item,
      WAREHOUSE: r.warehouse,
      KUBIKASI: r.kubikasi,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Susun Tire");
    XLSX.writeFile(wb, `data-susunlantai-${tanggal}.xlsx`);
  };

  return (
    <div>
      {/* ===== FORM INPUT (samain dengan susun-tire-input.blade.php) ===== */}
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
                onChange={(e) => handleChange("tgl", e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="kode">
                Kode Transaksi <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="kode"
                placeholder="Contoh: 00"
                value={form.kode}
                onChange={(e) => handleChange("kode", e.target.value)}
                required
              />
              <small style={{ display: "block", marginTop: 4, opacity: 0.7 }}>
                {lastKodeInfo === null ? (
                  "Belum ada transaksi di tanggal ini."
                ) : lastKodeInfo ? (
                  <>
                    Transaksi terakhir: {lastKodeInfo.slice(0, -2)}
                    <span style={{ color: "var(--danger)", fontWeight: 700 }}>
                      {lastKodeInfo.slice(-2)}
                    </span>
                  </>
                ) : null}
              </small>
            </div>

            <div className="field">
              <label htmlFor="jenis_truk">
                Jenis Kendaraan{" "}
                <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <SelectNeo
                id="jenis_truk"
                name="jenis_truk"
                value={form.jenis_truk}
                onChange={handleChange}
                options={namaKendaraan}
                placeholder="-- Pilih Kendaraan --"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="item">
                Item Code <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="item"
                value={form.item}
                onChange={(e) => handleChange("item", e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="pcs">
                Qty (Pcs) <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="pcs"
                inputMode="decimal"
                value={form.pcs}
                onChange={(e) => handleChange("pcs", e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="kubikasi">
                Qty Truck <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="kubikasi"
                inputMode="decimal"
                value={form.kubikasi}
                onChange={(e) => handleChange("kubikasi", e.target.value)}
                required
              />
            </div>

            <div
              className="field"
              ref={kuliBoxRef}
              style={{ position: "relative" }}
            >
              <label htmlFor="id_kuli_input">
                ID Kuli {"( bisa pilih lebih dari 1 )"}{" "}
                <span style={{ color: "var(--danger)" }}>*</span>
                {selectedKuli.length > 0 && (
                  <span
                    style={{
                      opacity: 0.55,
                      fontWeight: 500,
                      textTransform: "none",
                    }}
                  >
                    {" "}
                    ({selectedKuli.length} dipilih)
                  </span>
                )}
              </label>
              <div
                className={`multiselect-neo${kuliOpen ? " open" : ""}`}
                onClick={() => setKuliOpen(true)}
              >
                {selectedKuli.map((k) => (
                  <span
                    key={k.nik}
                    className="chip-neo"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {k.nama_kuli} ({k.nik})
                    <button
                      type="button"
                      onClick={() => removeKuli(k.nik)}
                      title="Hapus"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  id="id_kuli_input"
                  placeholder={
                    selectedKuli.length ? "" : "Pilih atau ketik Kuli..."
                  }
                  autoComplete="off"
                  value={kuliSearchText}
                  onFocus={() => setKuliOpen(true)}
                  onChange={(e) => {
                    setKuliSearchText(e.target.value.toUpperCase());
                    setKuliOpen(true);
                  }}
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
                    const picked = selectedKuli.some((s) => s.nik === k.nik);
                    return (
                      <div
                        key={k.nik}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickKuli(k)}
                        className={`dropdown-neo-item${picked ? " active" : ""}`}
                      >
                        {k.nama_kuli} ({k.nik}) {picked && <Check size={13} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div
            className="modal-footer"
            style={{
              justifyContent: "flex-start",
              gap: 8,
              marginTop: 4,
              paddingTop: 10,
            }}
          >
            <button
              type="submit"
              className="btn-neo primary sm"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Tambah"}
            </button>
          </div>
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

      {/* ===== TABEL TRANSAKSI (group per kode_transaksi, samain susun-tire-input.blade.php) ===== */}
      <div className="glass-card panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h5 style={{ margin: 0 }}>Daftar Transaksi Susun Tire</h5>
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
        ) : grouped.length === 0 ? (
          <div className="empty-state">
            Tidak ada data Susun Tire Lantai / Rack.
          </div>
        ) : (
          <div className="table-scroll-neo" style={{ overflow: "auto" }}>
            <table className="table-bordered-neo" style={{ fontSize: 12.5 }}>
              <thead className="sticky-thead">
                <tr style={{ textAlign: "center", opacity: 0.85 }}>
                  <th style={{ padding: "8px 6px" }}>NO</th>
                  <th style={{ padding: "8px 6px" }}>Tanggal</th>
                  <th style={{ padding: "8px 6px" }}>Kode Transaksi</th>
                  <th style={{ padding: "8px 6px" }}>Jenis Truk</th>
                  <th style={{ padding: "8px 6px" }}>Item</th>
                  <th style={{ padding: "8px 6px" }}>Kubikasi</th>
                  <th style={{ padding: "8px 6px" }}>Nilai (Rp)</th>
                  <th style={{ padding: "8px 6px" }}>Total Kuli</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([kode, records], idx) => {
                  const first = records[0];
                  const jumlahKuli = countKuliPerTrip[kode] ?? records.length;
                  const isOpen = expandedTrip === kode;
                  return (
                    <TripRow
                      key={kode}
                      idx={idx}
                      kode={kode}
                      first={first}
                      jumlahKuli={jumlahKuli}
                      isOpen={isOpen}
                      onToggle={() => setExpandedTrip(isOpen ? null : kode)}
                      records={records}
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

// Baris ringkasan per kode_transaksi + baris detail per kuli (expand/collapse) —
// sama seperti struktur accordion di susun-tire-input.blade.php.
function TripRow({
  idx,
  kode,
  first,
  jumlahKuli,
  isOpen,
  onToggle,
  records,
  onDelete,
}) {
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
        <td style={{ padding: "8px 6px" }}>{first.tgl}</td>
        <td style={{ padding: "8px 6px", fontWeight: 600 }}>{kode}</td>
        <td style={{ padding: "8px 6px" }}>{first.jenis_truk}</td>
        <td style={{ padding: "8px 6px" }}>{first.item}</td>
        <td style={{ padding: "8px 6px" }}>{first.kubikasi}</td>
        <td style={{ padding: "8px 6px" }}>{rupiah(first.total_biaya)}</td>
        <td style={{ padding: "8px 6px" }}>{jumlahKuli}</td>
      </tr>

      {isOpen && (
        <tr className="row-detail-wrap">
          <td colSpan={8} style={{ padding: "10px 6px" }}>
            <table
              className="table-bordered-neo table-detail-neo"
              style={{ fontSize: 12 }}
            >
              <thead>
                <tr style={{ textAlign: "center", opacity: 0.85 }}>
                  <th style={{ padding: "6px 4px" }}>No</th>
                  <th style={{ padding: "6px 4px" }}>Tanggal</th>
                  <th style={{ padding: "6px 4px" }}>Kode Transaksi</th>
                  <th style={{ padding: "6px 4px" }}>Jenis Truk</th>
                  <th style={{ padding: "6px 4px" }}>Item</th>
                  <th style={{ padding: "6px 4px" }}>Kubikasi</th>
                  <th style={{ padding: "6px 4px" }}>ID Kuli</th>
                  <th style={{ padding: "6px 4px" }}>Action</th>
                </tr>
              </thead>
              <tbody className="detail-body">
                {records.map((r, i) => (
                  <tr key={r.id} style={{ textAlign: "center" }}>
                    <td style={{ padding: "6px 4px" }}>{i + 1}</td>
                    <td style={{ padding: "6px 4px" }}>{r.tgl}</td>
                    <td style={{ padding: "6px 4px" }}>{r.kode_transaksi}</td>
                    <td style={{ padding: "6px 4px" }}>{r.jenis_truk}</td>
                    <td style={{ padding: "6px 4px" }}>{r.item}</td>
                    <td style={{ padding: "6px 4px" }}>{r.kubikasi}</td>
                    <td style={{ padding: "6px 4px" }}>{r.id_kuli}</td>
                    <td style={{ padding: "6px 4px" }}>
                      <button
                        className="icon-btn danger"
                        title="Hapus"
                        onClick={() => onDelete(r)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
