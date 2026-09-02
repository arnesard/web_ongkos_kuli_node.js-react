import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { Pencil, Trash2, ChevronDown, ChevronUp, Search, RefreshCw, Loader2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Combobox from "../../components/common/Combobox";
import { muatFgApi, lookupApi } from "../../api/endpoints";

// ==========================================================================
// Disamakan 1:1 dengan project Laravel:
//   resources/views/components/muat-fg-input.blade.php  -> form input
//   resources/views/components/muat-fg-tabel.blade.php  -> tabel + accordion
//   public/js/muatFG.js + getDataTrip.js                -> autocomplete & autofill
//   OngkosController::createMuatFG / storeMuatFG / getTripData
//
// PENTING: Volume, Weight, Qty Tire/Tube/Flap/Rimband/Valve/Other BUKAN kolom
// yang disimpan ke data_transaksi_tbl. Field-field itu cuma tampilan (readonly),
// hasil lookup ke DB KEDUA (gt_ora_shipment_trans / data Oracle shipment)
// berdasarkan no_trip -> lihat backend/src/controllers/helpers/lookupController.js
// (getTripData) dan muatFgController.js (fetchOracleByTrip).
// ==========================================================================

const swalDark = {
  customClass: { popup: "neo-swal" },
  confirmButtonColor: "#2f7dff",
  cancelButtonColor: "#1e2a45",
};

const MARKET_OPTIONS = ["-", "Export", "Import", "OEM", "Repl. Dalam Kota", "Repl. Luar Kota"];
const KET_OPTIONS = ["-", "Muat", "Bongkar", "Muat Kembali"];

const emptyForm = {
  tgl: new Date().toISOString().slice(0, 10),
  id_kuli: "",
  no_trip: "",
  nopol: "",
  qty_truk: "",
  customer: "",
  kota: "",
  jenis_truk: "",
  market: "",
  ket: "Muat",
};

const emptyOracleDisplay = {
  volume: "",
  weight: "",
  tire_qty: "",
  tube_qty: "",
  flap_qty: "",
  rimband_qty: "",
  valve_qty: "",
  other_qty: "",
};

const rupiah = (v) => `Rp ${Number(v || 0).toLocaleString("id-ID")}`;

export default function MuatFg() {
  const [form, setForm] = useState(emptyForm);
  const [oracleDisplay, setOracleDisplay] = useState(emptyOracleDisplay);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [datas, setDatas] = useState([]);
  const [countKuliPerTrip, setCountKuliPerTrip] = useState({});
  const [oracleByTrip, setOracleByTrip] = useState({});
  const [customerList, setCustomerList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [jenisTrukList, setJenisTrukList] = useState([]);
  const [kuliList, setKuliList] = useState([]);
  const [kuliInputText, setKuliInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedTrip, setExpandedTrip] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchParams, setSearchParams] = useState({ tgl: "", customer: "", no_trip: "" });
  const [appliedFilters, setAppliedFilters] = useState({});

  const kuliBoxRef = useRef(null);
  const [kuliOpen, setKuliOpen] = useState(false);

  // ---- Load daftar transaksi (+ meta customer/jenis_truk/kota/oracle) ----
  const fetchList = async (filters = appliedFilters) => {
    setLoading(true);
    try {
      const payload = await muatFgApi.meta(filters);
      setDatas(payload.datas || []);
      setCountKuliPerTrip(payload.countKuliPerTrip || {});
      setOracleByTrip(payload.oracle || {});
      if (payload.customer) setCustomerListFallback(payload.customer);
      if (payload.jenis_truk) setJenisTrukList(payload.jenis_truk);
    } catch (err) {
      console.error("[MuatFg.fetchList]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal memuat data",
        text: err.response?.data?.message || "Terjadi kesalahan saat mengambil data dari server.",
      });
    } finally {
      setLoading(false);
    }
  };

  // fallback list customer (dari tabel data_kota_tbl) kalau autocomplete /helpers/customer belum dipanggil
  const setCustomerListFallback = (rows) => {
    const names = [...new Set(rows.map((r) => r.customer))].sort();
    setCustomerList((prev) => (prev.length ? prev : names));
  };

  useEffect(() => {
    fetchList({});
    lookupApi.kuliList().then((d) => setKuliList(d.kuli || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Autocomplete customer berdasarkan market ----
  useEffect(() => {
    if (!form.market) return;
    lookupApi.customer({ market: form.market }).then((d) => setCustomerList(d.last_kode || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.market]);

  // ---- Autocomplete kota berdasarkan customer ----
  useEffect(() => {
    if (!form.customer) return;
    lookupApi.customer({ customer: form.customer }).then((d) => setCityList(d.city || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customer]);

  // ---- Autofill dari data Oracle (get-trip-data) begitu tgl & no_trip lengkap ----
  useEffect(() => {
    const tgl = form.tgl;
    const noTrip = form.no_trip.trim();
    if (!tgl || !noTrip) return;

    const timer = setTimeout(async () => {
      try {
        const result = await lookupApi.getTripData({ tgl, no_trip: noTrip });
        if (result.status === "found") {
          const d = result.data;
          setForm((f) => ({
            ...f,
            nopol: d.no_truk ?? f.nopol,
            market: f.market || d.cust_type || f.market,
            customer: d.customer ?? f.customer,
            kota: d.region ?? f.kota,
            qty_truk: d.qty_truk ?? f.qty_truk,
          }));
          setOracleDisplay({
            volume: d.volume ?? "",
            weight: d.weight ?? "",
            tire_qty: d.tire_qty ?? "",
            tube_qty: d.tube_qty ?? "",
            flap_qty: d.flap_qty ?? "",
            rimband_qty: d.rimband_qty ?? "",
            valve_qty: d.valve_qty ?? "",
            other_qty: d.other_qty ?? "",
          });
        } else {
          setOracleDisplay(emptyOracleDisplay);
        }
      } catch (err) {
        console.error("[MuatFg.getTripData]", err);
      }
    }, 450); // debounce, biar gak nembak request tiap ketikan

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tgl, form.no_trip]);

  const handleChange = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const filteredKuli = useMemo(() => {
    const q = kuliInputText.toUpperCase();
    if (!q) return kuliList;
    return kuliList.filter(
      (k) => k.nama_kuli?.toUpperCase().includes(q) || k.nik?.toUpperCase().includes(q)
    );
  }, [kuliList, kuliInputText]);

  const pickKuli = (k) => {
    setKuliInputText(`${k.nama_kuli} (${k.nik})`);
    handleChange("id_kuli", k.nik);
    setKuliOpen(false);
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (kuliBoxRef.current && !kuliBoxRef.current.contains(e.target)) setKuliOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setOracleDisplay(emptyOracleDisplay);
    setKuliInputText("");
    setEditingId(null);
  };

  const openEdit = (row) => {
    // Samain dengan editMuatFG: no_trip dilepas prefix tanggalnya (6 digit dmy) buat ditampilkan
    const rawNoTrip = /^\d{6}(.+)/.test(row.no_trip) ? row.no_trip.match(/^\d{6}(.+)/)[1] : row.no_trip;
    setEditingId(row.id);
    setForm({
      tgl: row.tgl,
      id_kuli: row.id_kuli,
      no_trip: rawNoTrip,
      nopol: row.nopol,
      qty_truk: row.qty_truk,
      customer: row.customer,
      kota: row.kota,
      jenis_truk: row.jenis_truk,
      market: row.market,
      ket: row.ket || "Muat",
    });
    const matchKuli = kuliList.find((k) => k.nik === row.id_kuli);
    setKuliInputText(matchKuli ? `${matchKuli.nama_kuli} (${matchKuli.nik})` : row.id_kuli);
    const oracle = oracleByTrip[row.no_trip];
    setOracleDisplay(
      oracle
        ? {
            volume: oracle.volume ?? "",
            weight: oracle.weight ?? "",
            tire_qty: oracle.tire_qty ?? "",
            tube_qty: oracle.tube_qty ?? "",
            flap_qty: oracle.flap_qty ?? "",
            rimband_qty: oracle.rimband_qty ?? "",
            valve_qty: oracle.valve_qty ?? "",
            other_qty: oracle.other_qty ?? "",
          }
        : emptyOracleDisplay
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_kuli) {
      Swal.fire({ ...swalDark, icon: "warning", title: "Kuli wajib dipilih" });
      return;
    }
    setSaving(true);
    const payload = {
      tgl: form.tgl,
      market: form.market,
      customer: form.customer,
      kota: form.kota,
      jam_bongkar: "-",
      no_trip: form.no_trip.toUpperCase(),
      qty_truk: String(form.qty_truk).replace(",", "."),
      jenis_truk: form.jenis_truk,
      pa: "-",
      nopol: form.nopol.toUpperCase(),
      driver: "-",
      jam_masuk: "-",
      ket: form.ket,
      id_kuli: form.id_kuli,
    };
    try {
      if (editingId) {
        await muatFgApi.update(editingId, payload);
      } else {
        await muatFgApi.create(payload);
      }
      Swal.fire({
        ...swalDark,
        icon: "success",
        title: editingId ? "Data berhasil diperbarui!" : "Data berhasil disimpan!",
        timer: 1300,
        showConfirmButton: false,
      });
      resetForm();
      await fetchList();
    } catch (err) {
      console.error("[MuatFg.handleSubmit]", err);
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
        await muatFgApi.remove(row.id);
        await fetchList();
        Swal.fire({ ...swalDark, icon: "success", title: "Data dihapus", timer: 1200, showConfirmButton: false });
      } catch (err) {
        console.error("[MuatFg.handleDelete]", err);
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Gagal menghapus",
          text: err.response?.data?.message || "Terjadi kesalahan saat menghapus data.",
        });
      }
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedFilters(searchParams);
    fetchList(searchParams);
    setSearchOpen(false);
  };

  const handleRefreshToday = () => {
    setAppliedFilters({});
    setSearchParams({ tgl: "", customer: "", no_trip: "" });
    fetchList({});
  };

  // ---- Grouping per no_trip, sama seperti $datas->groupBy('no_trip') di Blade ----
  const grouped = useMemo(() => {
    const map = new Map();
    datas.forEach((row) => {
      if (!map.has(row.no_trip)) map.set(row.no_trip, []);
      map.get(row.no_trip).push(row);
    });
    return [...map.entries()];
  }, [datas]);

  return (
    <div>
      <PageHeader title="Muat Barang FG Warehouse" subtitle="Entry ongkos reguler — transaksi muat barang jadi (FG)" />

      {/* ===== FORM INPUT (samain dengan muat-fg-input.blade.php) ===== */}
      <div className="glass-card panel" style={{ marginBottom: 16 }}>
        <form className="form-neo" onSubmit={handleSubmit}>
          <div className="field-grid-2">
            <div className="field">
              <label htmlFor="tgl">
                Tanggal <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="date"
                id="tgl"
                value={form.tgl}
                onChange={(e) => handleChange("tgl", e.target.value)}
                readOnly={!!editingId}
                required
              />
            </div>

            <div className="field" ref={kuliBoxRef} style={{ position: "relative" }}>
              <label htmlFor="id_kuli_input">
                Kuli <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="id_kuli_input"
                placeholder="Pilih atau ketik Kuli..."
                autoComplete="off"
                value={kuliInputText}
                onFocus={() => setKuliOpen(true)}
                onChange={(e) => {
                  setKuliInputText(e.target.value.toUpperCase());
                  setKuliOpen(true);
                }}
                required
              />
              {kuliOpen && filteredKuli.length > 0 && (
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                    maxHeight: 220, overflowY: "auto", background: "rgba(10,16,32,0.98)",
                    border: "1px solid var(--glass-border)", borderRadius: 9, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  {filteredKuli.map((k) => (
                    <div
                      key={k.nik}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickKuli(k)}
                      style={{ padding: "8px 12px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      {k.nama_kuli} ({k.nik})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="no_trip">
                No. Trip <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="no_trip"
                placeholder="Contoh: D01"
                pattern="[A-Za-z]\d{2,3}"
                title="Format: 1 huruf diikuti 2-3 digit angka, contoh D01 / D200"
                value={form.no_trip}
                onChange={(e) => handleChange("no_trip", e.target.value.toUpperCase())}
                readOnly={!!editingId}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="nopol">
                No. Polisi <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="nopol"
                value={form.nopol}
                onChange={(e) => handleChange("nopol", e.target.value.toUpperCase())}
                readOnly={!!editingId}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="qty_truk">
                Qty Truk <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="qty_truk"
                placeholder="Contoh: 0.25"
                inputMode="decimal"
                pattern="^(0|[1-9]\d*)(\.\d{1,2})?$"
                value={form.qty_truk}
                onChange={(e) => handleChange("qty_truk", e.target.value)}
                readOnly={!!editingId}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="customer">
                Customer <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <Combobox
                id="customer"
                name="customer"
                value={form.customer}
                onChange={handleChange}
                options={customerList}
                placeholder="Pilih atau ketik Customer..."
                required
              />
            </div>

            <div className="field">
              <label htmlFor="jenis_truk">
                Jenis Truk <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                id="jenis_truk"
                value={form.jenis_truk}
                onChange={(e) => handleChange("jenis_truk", e.target.value)}
                disabled={!!editingId}
                required
              >
                <option value="">-- Pilih Jenis Truk --</option>
                {jenisTrukList.map((t) => (
                  <option key={t.nama_kendaraan} value={t.nama_kendaraan}>
                    {t.nama_kendaraan}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="kota">
                Kota <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <Combobox
                id="kota"
                name="kota"
                value={form.kota}
                onChange={handleChange}
                options={cityList}
                placeholder="Pilih atau ketik Kota..."
                required
              />
            </div>

            <div className="field">
              <label htmlFor="market">
                Market <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                id="market"
                value={form.market}
                onChange={(e) => handleChange("market", e.target.value)}
                disabled={!!editingId}
                required
              >
                <option value="">-- Pilih Market --</option>
                {MARKET_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="ket">
                Keterangan <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                id="ket"
                value={form.ket}
                onChange={(e) => handleChange("ket", e.target.value)}
                disabled={!!editingId}
                required
              >
                {KET_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            {/* ---- Field readonly hasil lookup Oracle (bukan disimpan ke DB) ---- */}
            <div className="field">
              <label>Volume</label>
              <input type="text" value={oracleDisplay.volume} disabled />
            </div>
            <div className="field">
              <label>Weight</label>
              <input type="text" value={oracleDisplay.weight} disabled />
            </div>
            {oracleDisplay.tire_qty !== "" && (
              <div className="field">
                <label>Qty Tire</label>
                <input type="text" value={oracleDisplay.tire_qty} disabled />
              </div>
            )}
            {oracleDisplay.tube_qty !== "" && (
              <div className="field">
                <label>Qty Tube</label>
                <input type="text" value={oracleDisplay.tube_qty} disabled />
              </div>
            )}
            {oracleDisplay.flap_qty !== "" && (
              <div className="field">
                <label>Qty Flap</label>
                <input type="text" value={oracleDisplay.flap_qty} disabled />
              </div>
            )}
            {oracleDisplay.rimband_qty !== "" && (
              <div className="field">
                <label>Qty Rimband</label>
                <input type="text" value={oracleDisplay.rimband_qty} disabled />
              </div>
            )}
            {oracleDisplay.valve_qty !== "" && (
              <div className="field">
                <label>Qty Valve</label>
                <input type="text" value={oracleDisplay.valve_qty} disabled />
              </div>
            )}
            {oracleDisplay.other_qty !== "" && (
              <div className="field">
                <label>Qty Other</label>
                <input type="text" value={oracleDisplay.other_qty} disabled />
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ justifyContent: "flex-start", gap: 10, marginTop: 6 }}>
            <button type="submit" className="btn-neo primary" disabled={saving}>
              {saving ? "Menyimpan..." : editingId ? "Update" : "Tambah"}
            </button>
            <button type="button" className="btn-neo ghost" onClick={resetForm} disabled={saving}>
              Reset
            </button>
          </div>
          <small style={{ display: "block", marginTop: 8, opacity: 0.6 }}>
            <b>Note:</b> Tolong Isi Data Dengan Benar
          </small>
        </form>
      </div>

      {/* ===== DAFTAR TRANSAKSI MUAT (samain dengan muat-fg-tabel.blade.php) ===== */}
      <div className="glass-card panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Daftar Transaksi Muat</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="icon-btn" title="Cari" onClick={() => setSearchOpen((s) => !s)}>
              <Search size={16} />
            </button>
            <button className="icon-btn" title="Refresh (hari ini)" onClick={handleRefreshToday}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {searchOpen && (
          <form className="form-neo field-grid-2" onSubmit={handleSearch} style={{ marginBottom: 14 }}>
            <div className="field">
              <label>Tanggal</label>
              <input
                type="date"
                value={searchParams.tgl}
                onChange={(e) => setSearchParams((s) => ({ ...s, tgl: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Customer</label>
              <input
                type="text"
                placeholder="Nama Customer"
                value={searchParams.customer}
                onChange={(e) => setSearchParams((s) => ({ ...s, customer: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>No. Trip</label>
              <input
                type="text"
                placeholder="No Trip"
                value={searchParams.no_trip}
                onChange={(e) => setSearchParams((s) => ({ ...s, no_trip: e.target.value }))}
              />
            </div>
            <div className="field" style={{ alignSelf: "end" }}>
              <button type="submit" className="btn-neo primary">
                Cari
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="empty-state" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} className="spin" /> Memuat data...
          </div>
        ) : grouped.length === 0 ? (
          <div className="empty-state">Belum ada data.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "center", opacity: 0.7 }}>
                  <th style={{ padding: "8px 6px" }}>NO</th>
                  <th style={{ padding: "8px 6px" }}>Tanggal</th>
                  <th style={{ padding: "8px 6px" }}>Market</th>
                  <th style={{ padding: "8px 6px" }}>Customer</th>
                  <th style={{ padding: "8px 6px" }}>No. Trip</th>
                  <th style={{ padding: "8px 6px" }}>Qty | Jenis Truk</th>
                  <th style={{ padding: "8px 6px" }}>Volume</th>
                  <th style={{ padding: "8px 6px" }}>Weight</th>
                  <th style={{ padding: "8px 6px" }}>No Polisi</th>
                  <th style={{ padding: "8px 6px" }}>Nilai (Rp)</th>
                  <th style={{ padding: "8px 6px" }}>Total Kuli</th>
                  <th style={{ padding: "8px 6px" }}>Total Muatan</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([trip, records], idx) => {
                  const first = records[0];
                  const oracle = oracleByTrip[trip];
                  const jumlahKuli = countKuliPerTrip[trip] ?? records.length;
                  const totalMuatan =
                    (Number(oracle?.tire_qty) || 0) +
                    (Number(oracle?.tube_qty) || 0) +
                    (Number(oracle?.flap_qty) || 0) +
                    (Number(oracle?.rimband_qty) || 0) +
                    (Number(oracle?.valve_qty) || 0) +
                    (Number(oracle?.other_qty) || 0);
                  const isOpen = expandedTrip === trip;

                  return (
                    <FragmentRow
                      key={trip}
                      idx={idx}
                      trip={trip}
                      first={first}
                      oracle={oracle}
                      jumlahKuli={jumlahKuli}
                      totalMuatan={totalMuatan}
                      isOpen={isOpen}
                      onToggle={() => setExpandedTrip(isOpen ? null : trip)}
                      records={records}
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

// Baris ringkasan per No. Trip + baris detail (bisa di-expand/collapse) per Kuli,
// sama seperti struktur accordion di muat-fg-tabel.blade.php.
function FragmentRow({ idx, trip, first, oracle, jumlahKuli, totalMuatan, isOpen, onToggle, records, onEdit, onDelete }) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ textAlign: "center", cursor: "pointer", background: isOpen ? "rgba(47,125,255,0.08)" : "transparent" }}
      >
        <td style={{ padding: "8px 6px" }}>
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {idx + 1}
        </td>
        <td style={{ padding: "8px 6px" }}>{first.tgl}</td>
        <td style={{ padding: "8px 6px" }}>{first.market}</td>
        <td style={{ padding: "8px 6px" }}>{first.customer}</td>
        <td style={{ padding: "8px 6px", fontWeight: 600 }}>{trip}</td>
        <td style={{ padding: "8px 6px" }}>
          {first.qty_truk} | {first.jenis_truk}
        </td>
        <td style={{ padding: "8px 6px" }}>{oracle?.volume ?? "-"}</td>
        <td style={{ padding: "8px 6px" }}>{oracle?.weight ?? "-"}</td>
        <td style={{ padding: "8px 6px" }}>{first.nopol}</td>
        <td style={{ padding: "8px 6px" }}>{rupiah(first.total_biaya)}</td>
        <td style={{ padding: "8px 6px" }}>{jumlahKuli}</td>
        <td style={{ padding: "8px 6px" }}>{totalMuatan.toLocaleString("id-ID")}</td>
      </tr>

      {isOpen && (
        <tr>
          <td colSpan={12} style={{ padding: 0 }}>
            <div style={{ padding: 12, borderTop: "1px solid var(--glass-border)" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "center", opacity: 0.7 }}>
                    <th style={{ padding: "6px 4px" }}>NO</th>
                    <th style={{ padding: "6px 4px" }}>Keterangan</th>
                    <th style={{ padding: "6px 4px" }}>ID Kuli</th>
                    <th style={{ padding: "6px 4px" }}>Tire</th>
                    <th style={{ padding: "6px 4px" }}>Tube</th>
                    <th style={{ padding: "6px 4px" }}>Flap</th>
                    <th style={{ padding: "6px 4px" }}>Rimband</th>
                    <th style={{ padding: "6px 4px" }}>Valve</th>
                    <th style={{ padding: "6px 4px" }}>Other</th>
                    <th style={{ padding: "6px 4px" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} style={{ textAlign: "center" }}>
                      <td style={{ padding: "6px 4px" }}>{i + 1}</td>
                      <td style={{ padding: "6px 4px" }}>{r.ket || "-"}</td>
                      <td style={{ padding: "6px 4px" }}>{r.id_kuli}</td>
                      <td style={{ padding: "6px 4px" }}>{oracle?.tire_qty ?? "-"}</td>
                      <td style={{ padding: "6px 4px" }}>{oracle?.tube_qty ?? "-"}</td>
                      <td style={{ padding: "6px 4px" }}>{oracle?.flap_qty ?? "-"}</td>
                      <td style={{ padding: "6px 4px" }}>{oracle?.rimband_qty ?? "-"}</td>
                      <td style={{ padding: "6px 4px" }}>{oracle?.valve_qty ?? "-"}</td>
                      <td style={{ padding: "6px 4px" }}>{oracle?.other_qty ?? "-"}</td>
                      <td style={{ padding: "6px 4px" }}>
                        <div className="row-actions" style={{ justifyContent: "center" }}>
                          <button className="icon-btn" title="Edit" onClick={() => onEdit(r)}>
                            <Pencil size={13} />
                          </button>
                          <button className="icon-btn danger" title="Hapus" onClick={() => onDelete(r)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
