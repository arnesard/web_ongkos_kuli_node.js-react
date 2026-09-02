import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx-js-style";
import {
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import Combobox from "../../components/common/Combobox";
import SelectNeo from "../../components/common/SelectNeo";
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

const MARKET_OPTIONS = [
  "-",
  "Export",
  "Import",
  "OEM",
  "Repl. Dalam Kota",
  "Repl. Luar Kota",
];
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
  const [selectedKuli, setSelectedKuli] = useState([]); // [{ nik, nama_kuli }] — bisa lebih dari 1
  const [kuliSearchText, setKuliSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedTrip, setExpandedTrip] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchParams, setSearchParams] = useState({
    tgl: "",
    customer: "",
    no_trip: "",
  });
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
        text:
          err.response?.data?.message ||
          "Terjadi kesalahan saat mengambil data dari server.",
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
    lookupApi
      .customer({ market: form.market })
      .then((d) => setCustomerList(d.last_kode || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.market]);

  // ---- Autocomplete kota berdasarkan customer ----
  useEffect(() => {
    if (!form.customer) return;
    lookupApi
      .customer({ customer: form.customer })
      .then((d) => setCityList(d.city || []));
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

  const handleChange = (name, value) =>
    setForm((f) => ({ ...f, [name]: value }));

  const filteredKuli = useMemo(() => {
    const q = kuliSearchText.toUpperCase();
    if (!q) return kuliList;
    return kuliList.filter(
      (k) =>
        k.nama_kuli?.toUpperCase().includes(q) ||
        k.nik?.toUpperCase().includes(q),
    );
  }, [kuliList, kuliSearchText]);

  // Mode edit cuma boleh 1 kuli per baris (karena 1 row = 1 id_kuli di DB).
  // Mode tambah baru boleh pilih lebih dari 1 kuli sekaligus — nanti dikirim
  // sebagai beberapa transaksi terpisah (1 request per kuli) saat submit.
  const pickKuli = (k) => {
    setKuliSearchText("");
    setSelectedKuli((prev) => {
      if (editingId) return [k];
      if (prev.some((p) => p.nik === k.nik)) return prev; // udah dipilih
      return [...prev, k];
    });
    if (editingId) setKuliOpen(false);
  };

  const removeKuli = (nik) => {
    setSelectedKuli((prev) => prev.filter((p) => p.nik !== nik));
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (kuliBoxRef.current && !kuliBoxRef.current.contains(e.target))
        setKuliOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setOracleDisplay(emptyOracleDisplay);
    setSelectedKuli([]);
    setKuliSearchText("");
    setEditingId(null);
  };

  const openEdit = (row) => {
    // Samain dengan editMuatFG: no_trip dilepas prefix tanggalnya (6 digit dmy) buat ditampilkan
    const rawNoTrip = /^\d{6}(.+)/.test(row.no_trip)
      ? row.no_trip.match(/^\d{6}(.+)/)[1]
      : row.no_trip;
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
    setSelectedKuli([
      matchKuli || { nik: row.id_kuli, nama_kuli: row.id_kuli },
    ]);
    setKuliSearchText("");
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
        : emptyOracleDisplay,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedKuli.length === 0) {
      Swal.fire({ ...swalDark, icon: "warning", title: "Kuli wajib dipilih" });
      return;
    }
    // SelectNeo (Jenis Truk / Keterangan / Market) bukan <select> native lagi,
    // jadi validasi "required"-nya dicek manual di sini.
    if (!form.market) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Market wajib dipilih",
      });
      return;
    }
    if (!form.jenis_truk) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Jenis Truk wajib dipilih",
      });
      return;
    }
    if (!form.ket) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Keterangan wajib dipilih",
      });
      return;
    }

    setSaving(true);
    const basePayload = {
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
    };
    try {
      if (editingId) {
        await muatFgApi.update(editingId, {
          ...basePayload,
          id_kuli: selectedKuli[0].nik,
        });
      } else {
        // Kuli dipilih lebih dari 1 -> bikin 1 baris transaksi per kuli,
        // dikirim berurutan biar gampang dilacak kalau ada yang gagal.
        for (const k of selectedKuli) {
          await muatFgApi.create({ ...basePayload, id_kuli: k.nik });
        }
      }
      Swal.fire({
        ...swalDark,
        icon: "success",
        title: editingId
          ? "Data berhasil diperbarui!"
          : selectedKuli.length > 1
            ? `${selectedKuli.length} data berhasil disimpan!`
            : "Data berhasil disimpan!",
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
        text:
          err.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan data.",
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
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data dihapus",
          timer: 1200,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error("[MuatFg.handleDelete]", err);
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Gagal menghapus",
          text:
            err.response?.data?.message ||
            "Terjadi kesalahan saat menghapus data.",
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

  // ---- Export ke Excel (samain data yang tampil di tabel Daftar Transaksi Muat) ----
  const handleExportExcel = () => {
    if (grouped.length === 0) {
      Swal.fire({
        ...swalDark,
        icon: "info",
        title: "Tidak ada data untuk diexport",
      });
      return;
    }

    const headerFill = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2F7DFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "999999" } },
        bottom: { style: "thin", color: { rgb: "999999" } },
        left: { style: "thin", color: { rgb: "999999" } },
        right: { style: "thin", color: { rgb: "999999" } },
      },
    };
    const cellBorder = {
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } },
      },
    };

    // ---- Sheet 1: Ringkasan per No. Trip ----
    const summaryHeader = [
      "NO",
      "Tanggal",
      "Market",
      "Customer",
      "No. Trip",
      "Qty | Jenis Truk",
      "Volume",
      "Weight",
      "No Polisi",
      "Gudang",
      "Nilai (Rp)",
      "Total Kuli",
      "Total Muatan",
    ];
    const summaryRows = grouped.map(([trip, records], idx) => {
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
      return [
        idx + 1,
        first.tgl,
        first.market,
        first.customer,
        trip,
        `${first.qty_truk} | ${first.jenis_truk}`,
        oracle?.volume ?? "-",
        oracle?.weight ?? "-",
        first.nopol,
        first.warehouse ?? "-",
        Number(first.total_biaya) || 0,
        jumlahKuli,
        totalMuatan,
      ];
    });
    const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
    summaryHeader.forEach((_, c) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c });
      if (wsSummary[ref]) wsSummary[ref].s = headerFill;
    });
    summaryRows.forEach((row, r) => {
      row.forEach((v, c) => {
        const ref = XLSX.utils.encode_cell({ r: r + 1, c });
        if (wsSummary[ref]) wsSummary[ref].s = cellBorder;
      });
    });
    wsSummary["!cols"] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 16 },
      { wch: 28 },
      { wch: 14 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 8 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
    ];

    // ---- Sheet 2: Detail per Kuli ----
    const detailHeader = [
      "NO",
      "Tanggal",
      "Market",
      "Customer",
      "No. Trip",
      "Qty | Jenis Truk",
      "No Polisi",
      "Keterangan",
      "ID Kuli",
      "Tire",
      "Tube",
      "Flap",
      "Rimband",
      "Valve",
      "Other",
    ];
    const detailRows = [];
    grouped.forEach(([trip, records]) => {
      const oracle = oracleByTrip[trip];
      records.forEach((r, i) => {
        detailRows.push([
          i + 1,
          r.tgl,
          r.market,
          r.customer,
          trip,
          `${r.qty_truk} | ${r.jenis_truk}`,
          r.nopol,
          r.ket || "-",
          r.id_kuli,
          Number(oracle?.tire_qty) || 0,
          Number(oracle?.tube_qty) || 0,
          Number(oracle?.flap_qty) || 0,
          Number(oracle?.rimband_qty) || 0,
          Number(oracle?.valve_qty) || 0,
          Number(oracle?.other_qty) || 0,
        ]);
      });
    });
    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
    detailHeader.forEach((_, c) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c });
      if (wsDetail[ref]) wsDetail[ref].s = headerFill;
    });
    detailRows.forEach((row, r) => {
      row.forEach((v, c) => {
        const ref = XLSX.utils.encode_cell({ r: r + 1, c });
        if (wsDetail[ref]) wsDetail[ref].s = cellBorder;
      });
    });
    wsDetail["!cols"] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 16 },
      { wch: 28 },
      { wch: 14 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 7 },
      { wch: 7 },
      { wch: 7 },
      { wch: 9 },
      { wch: 7 },
      { wch: 7 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detail");

    const tglLabel = (
      appliedFilters.tgl || new Date().toISOString().slice(0, 10)
    ).replaceAll("-", "");
    XLSX.writeFile(wb, `Daftar_Transaksi_Muat_${tglLabel}.xlsx`);
  };

  return (
    <div>
      {/* ===== FORM INPUT (samain dengan muat-fg-input.blade.php, versi kecil) ===== */}
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
                readOnly={!!editingId}
                required
              />
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
                onChange={(e) =>
                  handleChange("no_trip", e.target.value.toUpperCase())
                }
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
              <label htmlFor="jenis_truk">
                Jenis Truk <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <SelectNeo
                id="jenis_truk"
                name="jenis_truk"
                value={form.jenis_truk}
                onChange={handleChange}
                options={jenisTrukList.map((t) => t.nama_kendaraan)}
                placeholder="-- Pilih Jenis Truk --"
                disabled={!!editingId}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="ket">
                Keterangan <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <SelectNeo
                id="ket"
                name="ket"
                value={form.ket}
                onChange={handleChange}
                options={KET_OPTIONS}
                disabled={!!editingId}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="market">
                Market <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <SelectNeo
                id="market"
                name="market"
                value={form.market}
                onChange={handleChange}
                options={MARKET_OPTIONS}
                placeholder="-- Pilih Market --"
                disabled={!!editingId}
                required
              />
            </div>

            <div
              className="field"
              ref={kuliBoxRef}
              style={{ position: "relative" }}
            >
              <label htmlFor="id_kuli_input">
                Kuli {"( bisa pilih lebih dari 1 )"}
                <span style={{ color: "var(--danger)" }}>*</span>
                {!editingId && selectedKuli.length > 0 && (
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
                        {k.nama_kuli} ({k.nik}){picked && <Check size={13} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="nopol">
                No. Polisi <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="nopol"
                value={form.nopol}
                onChange={(e) =>
                  handleChange("nopol", e.target.value.toUpperCase())
                }
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
              {saving ? "Menyimpan..." : editingId ? "Update" : "Tambah"}
            </button>
            <button
              type="button"
              className="btn-neo success sm"
              onClick={resetForm}
              disabled={saving}
            >
              Reset
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
            <b>Note:</b> Tolong Isi Data Dengan Benar
          </small>
        </form>
      </div>

      {/* ===== DAFTAR TRANSAKSI MUAT (samain dengan muat-fg-tabel.blade.php) ===== */}
      <div className="glass-card panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h5 style={{ margin: 0 }}>Daftar Transaksi Muat</h5>
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
              onClick={handleRefreshToday}
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
              <label>Customer</label>
              <input
                type="text"
                placeholder="Nama Customer"
                value={searchParams.customer}
                onChange={(e) =>
                  setSearchParams((s) => ({ ...s, customer: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>No. Trip</label>
              <input
                type="text"
                placeholder="No Trip"
                value={searchParams.no_trip}
                onChange={(e) =>
                  setSearchParams((s) => ({ ...s, no_trip: e.target.value }))
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
        ) : grouped.length === 0 ? (
          <div className="empty-state">Belum ada data.</div>
        ) : (
          <div className="table-scroll-neo" style={{ overflow: "auto" }}>
            <table className="table-bordered-neo" style={{ fontSize: 12.5 }}>
              <thead className="sticky-thead">
                <tr style={{ textAlign: "center", opacity: 0.85 }}>
                  <th style={{ padding: "8px 6px" }}>NO</th>
                  <th style={{ padding: "8px 6px" }}>Tanggal</th>
                  <th style={{ padding: "8px 6px" }}>Market</th>
                  <th style={{ padding: "8px 6px" }}>Customer</th>
                  <th style={{ padding: "8px 6px" }}>No. Trip</th>
                  <th style={{ padding: "8px 6px" }}>Qty | Jenis Truk</th>
                  <th style={{ padding: "8px 6px" }}>Volume</th>
                  <th style={{ padding: "8px 6px" }}>Weight</th>
                  <th style={{ padding: "8px 6px" }}>No Polisi</th>
                  <th style={{ padding: "8px 6px" }}>Gudang</th>
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
function FragmentRow({
  idx,
  trip,
  first,
  oracle,
  jumlahKuli,
  totalMuatan,
  isOpen,
  onToggle,
  records,
  onEdit,
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
        <td style={{ padding: "8px 6px" }}>{first.market}</td>
        <td style={{ padding: "8px 6px" }}>{first.customer}</td>
        <td style={{ padding: "8px 6px", fontWeight: 600 }}>{trip}</td>
        <td style={{ padding: "8px 6px" }}>
          {first.qty_truk} | {first.jenis_truk}
        </td>
        <td style={{ padding: "8px 6px" }}>{oracle?.volume ?? "-"}</td>
        <td style={{ padding: "8px 6px" }}>{oracle?.weight ?? "-"}</td>
        <td style={{ padding: "8px 6px" }}>{first.nopol}</td>
        <td style={{ padding: "8px 6px" }}>{first.warehouse ?? "-"}</td>
        <td style={{ padding: "8px 6px" }}>{rupiah(first.total_biaya)}</td>
        <td style={{ padding: "8px 6px" }}>{jumlahKuli}</td>
        <td style={{ padding: "8px 6px" }}>
          {totalMuatan.toLocaleString("id-ID")}
        </td>
      </tr>

      {isOpen && (
        <tr className="row-detail-wrap">
          <td colSpan={13} style={{ padding: "10px 6px" }}>
            <table
              className="table-bordered-neo table-detail-neo"
              style={{ fontSize: 12 }}
            >
              <thead>
                <tr style={{ textAlign: "center", opacity: 0.85 }}>
                  <th style={{ padding: "6px 4px" }}>NO</th>
                  <th style={{ padding: "6px 4px" }}>Tanggal</th>
                  <th style={{ padding: "6px 4px" }}>Market</th>
                  <th style={{ padding: "6px 4px" }}>Customer</th>
                  <th style={{ padding: "6px 4px" }}>No. Trip</th>
                  <th style={{ padding: "6px 4px" }}>Qty | Jenis Truk</th>
                  <th style={{ padding: "6px 4px" }}>No Polisi</th>
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
              <tbody className="detail-body">
                {records.map((r, i) => (
                  <tr key={r.id} style={{ textAlign: "center" }}>
                    <td style={{ padding: "6px 4px" }}>{i + 1}</td>
                    <td style={{ padding: "6px 4px" }}>{r.tgl}</td>
                    <td style={{ padding: "6px 4px" }}>{r.market}</td>
                    <td style={{ padding: "6px 4px" }}>{r.customer}</td>
                    <td style={{ padding: "6px 4px" }}>{trip}</td>
                    <td style={{ padding: "6px 4px" }}>
                      {r.qty_truk} | {r.jenis_truk}
                    </td>
                    <td style={{ padding: "6px 4px" }}>{r.nopol}</td>
                    <td style={{ padding: "6px 4px" }}>{r.ket || "-"}</td>
                    <td style={{ padding: "6px 4px" }}>{r.id_kuli}</td>
                    <td style={{ padding: "6px 4px" }}>
                      {oracle?.tire_qty ?? "-"}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      {oracle?.tube_qty ?? "-"}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      {oracle?.flap_qty ?? "-"}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      {oracle?.rimband_qty ?? "-"}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      {oracle?.valve_qty ?? "-"}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      {oracle?.other_qty ?? "-"}
                    </td>
                    <td style={{ padding: "6px 4px" }}>
                      <div
                        className="row-actions"
                        style={{ justifyContent: "center" }}
                      >
                        <button
                          className="icon-btn"
                          title="Edit"
                          onClick={() => onEdit(r)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="icon-btn danger"
                          title="Hapus"
                          onClick={() => onDelete(r)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
