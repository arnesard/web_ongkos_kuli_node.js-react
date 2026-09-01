import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Search, Loader2, Lock, ArrowLeft } from "lucide-react";
import NeoModal from "../../components/common/NeoModal";
import { bonSementaraApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

const swalDark = {
  customClass: { popup: "neo-swal" },
  confirmButtonColor: "#2f7dff",
  cancelButtonColor: "#1e2a45",
};

const rupiah = (v) => `Rp ${Number(v || 0).toLocaleString("id-ID")}`;

const statusBadge = (s) => {
  const val = s || "";
  const cls = val.includes("reject") ? "danger" : val === "approvebyhod" ? "success" : val ? "warning" : "info";
  const label = !val ? "Menunggu SH" : val.includes("reject") ? "Ditolak" : val === "approvebyhod" ? "Disetujui" : val;
  return <span className={`badge-neo ${cls}`}>{label}</span>;
};

/**
 * Modal "Cari No Dokumen & Isi Nilai Aktual".
 * - Begitu dibuka, langsung nampilin data terbaru (bukan kosong) -> `recentList`.
 * - Ada filter bulan yang baca bagian MM/YYYY di EKOR no_doc (format
 *   ".../MM/YYYY", contoh "981/GAC/09/2026" -> "09/2026"), bukan kolom tgl.
 * - Klik salah satu baris di daftar terbaru -> otomatis "cari" dokumen itu
 *   dan masuk ke tampilan detail (total nilai, status, input nilai aktual).
 * - Semua level bisa cari & lihat dokumen; input nilai aktual cuma tampil
 *   buat level 'superuser' (approved atau belum, backend jadi penjaga utama).
 */
export default function CariAktualModal({ open, onClose, onSaved }) {
  const { user } = useAuth();
  const isSuperUser = String(user?.level || "").toLowerCase() === "superuser";

  const [noDoc, setNoDoc] = useState("");
  const [bulanKode, setBulanKode] = useState(""); // format input type=month -> "YYYY-MM"
  const [recentList, setRecentList] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null); // { dataCari, totalNilai, totalActNilai, statusBS }
  const [actNilai, setActNilai] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRecent = async (kode) => {
    setLoadingRecent(true);
    try {
      const rows = await bonSementaraApi.recent({ limit: 20, bulanKode: kode || undefined });
      setRecentList(rows);
    } catch (err) {
      console.error("[CariAktualModal.loadRecent]", err);
    } finally {
      setLoadingRecent(false);
    }
  };

  // Begitu modal dibuka -> langsung load data terbaru
  useEffect(() => {
    if (open) {
      reset();
      loadRecent("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = () => {
    setNoDoc("");
    setBulanKode("");
    setResult(null);
    setActNilai("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBulanChange = (kode) => {
    setBulanKode(kode);
    loadRecent(kode);
  };

  const doSearch = async (docToSearch) => {
    if (!docToSearch.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      const payload = await bonSementaraApi.cariNoDoc(docToSearch.trim());
      if (!payload.dataCari || payload.dataCari.length === 0) {
        Swal.fire({ ...swalDark, icon: "info", title: "Tidak ditemukan", text: `No dokumen "${docToSearch}" tidak ada di data kamu.` });
        return;
      }
      setResult(payload);
      setActNilai(payload.totalActNilai ? String(payload.totalActNilai) : "");
    } catch (err) {
      console.error("[CariAktualModal.search]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal mencari",
        text: err.response?.data?.message || "Terjadi kesalahan saat mencari dokumen.",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    doSearch(noDoc);
  };

  const handlePickRecent = (row) => {
    setNoDoc(row.no_doc);
    doSearch(row.no_doc);
  };

  const handleSaveAktual = async () => {
    if (!actNilai) return;
    setSaving(true);
    try {
      await bonSementaraApi.inputAktual({ no_doc: noDoc.trim(), act_nilai: actNilai });
      Swal.fire({ ...swalDark, icon: "success", title: "Nilai aktual tersimpan", timer: 1300, showConfirmButton: false });
      onSaved?.();
      handleClose();
    } catch (err) {
      console.error("[CariAktualModal.saveAktual]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal menyimpan",
        text: err.response?.data?.message || "Terjadi kesalahan saat menyimpan nilai aktual.",
      });
    } finally {
      setSaving(false);
    }
  };

  const isLocked = !!result?.statusBS;

  return (
    <NeoModal open={open} title="Cari No Dokumen" onClose={handleClose} width={920}>
      <form className="form-neo" onSubmit={handleSearchSubmit} style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            placeholder="Ketik No Dokumen lalu Enter..."
            value={noDoc}
            onChange={(e) => setNoDoc(e.target.value)}
            style={{ flex: 1 }}
            autoFocus
          />
          <button type="submit" className="btn-neo primary" disabled={searching || !noDoc.trim()}>
            {searching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
            Cari
          </button>
        </div>
        {!result && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <label htmlFor="bulanKode" style={{ margin: 0, fontSize: 12, whiteSpace: "nowrap" }}>
              Filter Bulan (dari no dokumen)
            </label>
            <input
              id="bulanKode"
              type="month"
              value={bulanKode}
              onChange={(e) => handleBulanChange(e.target.value)}
              style={{ maxWidth: 160 }}
            />
          </div>
        )}
      </form>

      {/* ===== Mode default: daftar data terbaru, klik baris buat lihat detail ===== */}
      {!result && (
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: 9 }}>
            {loadingRecent ? (
              <div style={{ padding: 20, textAlign: "center", opacity: 0.6, fontSize: 13 }}>
                <Loader2 size={16} className="spin" /> Memuat data terbaru...
              </div>
            ) : recentList.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", opacity: 0.6, fontSize: 13 }}>
                Tidak ada data{bulanKode ? " di bulan ini" : ""}.
              </div>
            ) : (
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", opacity: 0.7, position: "sticky", top: 0, background: "rgba(10,16,32,0.98)" }}>
                    <th style={{ padding: "8px 10px" }}>Tanggal</th>
                    <th style={{ padding: "8px 10px" }}>No Dokumen</th>
                    <th style={{ padding: "8px 10px" }}>Uraian</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Nilai</th>
                    <th style={{ padding: "8px 10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentList.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => handlePickRecent(r)}
                      style={{ cursor: "pointer", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(47, 125, 255, 0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "8px 10px" }}>{r.tgl}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{r.no_doc}</td>
                      <td style={{ padding: "8px 10px", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.uraian_kegiatan}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{rupiah(r.nilai)}</td>
                      <td style={{ padding: "8px 10px" }}>{statusBadge(r.status_bs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ===== Mode hasil pencarian / detail dokumen ===== */}
      {result && (
        <div className="form-neo" style={{ padding: "0 20px 20px" }}>
          <button
            type="button"
            onClick={() => setResult(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
              marginBottom: 12,
            }}
          >
            <ArrowLeft size={14} /> Kembali ke daftar terbaru
          </button>

          <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 16, border: "1px solid var(--glass-border)", borderRadius: 9 }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.7 }}>
                  <th style={{ padding: "8px 10px" }}>Tanggal</th>
                  <th style={{ padding: "8px 10px" }}>Uraian Kegiatan</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Nilai</th>
                </tr>
              </thead>
              <tbody>
                {result.dataCari.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "8px 10px" }}>{r.tgl}</td>
                    <td style={{ padding: "8px 10px" }}>{r.uraian_kegiatan}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{rupiah(r.nilai)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 14 }}>
            <span>
              Total Bon Sementara: <b>{rupiah(result.totalNilai)}</b>
            </span>
            {isLocked && (
              <span className="badge-neo success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Lock size={12} /> Sudah Di-Approve SH
              </span>
            )}
          </div>

          {/* Isi nilai aktual — murni berdasarkan role: SuperUser selalu bisa (approved
              atau belum), level lain (termasuk admin) sama sekali nggak bisa */}
          {isSuperUser ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                placeholder="Nilai Aktual (Rp)"
                value={actNilai}
                onChange={(e) => setActNilai(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-neo primary" onClick={handleSaveAktual} disabled={saving || !actNilai}>
                {saving ? "Menyimpan..." : "Simpan Aktual"}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>
              Hanya SuperUser yang dapat mengisi nilai aktual.
            </p>
          )}
        </div>
      )}
    </NeoModal>
  );
}
