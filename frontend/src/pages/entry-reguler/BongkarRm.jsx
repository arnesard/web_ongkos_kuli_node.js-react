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
import { bongkarRmApi, lookupApi } from "../../api/endpoints";

// ==========================================================================
// Disamakan 1:1 dengan project Laravel:
//   resources/views/components/bongkar-rm-input.blade.php  -> form input
//   resources/views/components/bongkar-rm-tabel.blade.php  -> tabel + accordion
//   public/js/bongkarRM.js                                 -> info kode terakhir
//   OngkosController::indexBongkarrm / storeBongkarrm / editBongkarrm / updateBongkarrm
//
// Beda dengan Muat FG:
// - Tidak ada lookup Oracle (no volume/weight/tire dkk) — RM warehouse murni
//   dari data_transaksi_tbl join data_barang_tbl (kolom "ongkos", bukan "biaya_truk").
// - Market di Laravel cuma punya 1 opsi ("-"), jadi di sini juga dikunci ke "-".
// - Customer (Supplier) input teks biasa, TIDAK ada autocomplete (Laravel juga
//   nggak wire autocomplete customer untuk form bongkar-rm ini).
// - Kota tidak ditampilkan sebagai field (dikirim tetap "-", sama seperti hidden
//   input di Blade). pa/driver/jam_masuk/jam_bongkar juga hidden "-".
// - No. Trip pakai prefix huruf Z tetap + 2 digit (pattern ^Z[0-9]{2}$).
// - Field Kuli TETAP bisa diedit walau row lain sedang mode edit (di Blade,
//   select id_kuli nggak punya atribut disabled saat edit) — beda dari field lain.
// - Fitur lock "APPROVE": begitu Bon Sementara tanggal itu sudah berstatus
//   (status_bs terisi), tombol edit/hapus di baris detail diganti label APPROVE,
//   samain kondisi `$status == null && $status == ''` di Blade (intinya: locked
//   kalau $status truthy).
// ==========================================================================

const swalDark = {
  customClass: { popup: "neo-swal" },
  confirmButtonColor: "#2f7dff",
  cancelButtonColor: "#1e2a45",
};

const MARKET_OPTIONS = ["-"];
const KET_OPTIONS = ["-", "Muat", "Bongkar", "Muat Kembali"];

const emptyForm = {
  tgl: new Date().toISOString().slice(0, 10),
  qty_truk: "",
  market: "-",
  jenis_truk: "",
  no_trip: "",
  nopol: "",
  customer: "",
  ket: "",
};

const rupiah = (v) => `Rp ${Number(v || 0).toLocaleString("id-ID")}`;

// Samain dengan logic total_biaya per trip di bongkar-rm-tabel.blade.php:
// kalau semua baris punya `ket` yang sama, ambil total_biaya baris pertama saja
// (karena hasil join * qty sama semua); kalau ket beda-beda, ambil satu baris
// per ket lalu dijumlahkan (biar nggak dobel-hitung antar kuli yang ket-nya sama).
function calcTotalBiaya(records) {
  const uniqueKet = [...new Set(records.map((r) => r.ket))];
  if (uniqueKet.length === 1) {
    return Number(records[0]?.total_biaya) || 0;
  }
  const seenKet = new Set();
  let sum = 0;
  for (const r of records) {
    if (!seenKet.has(r.ket)) {
      seenKet.add(r.ket);
      sum += Number(r.total_biaya) || 0;
    }
  }
  return sum;
}

export default function BongkarRm() {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [datas, setDatas] = useState([]);
  const [countKuliPerTrip, setCountKuliPerTrip] = useState({});
  const [jenisBarangList, setJenisBarangList] = useState([]);
  const [status, setStatus] = useState(null); // status_bs Bon Sementara di tanggal yg lagi tampil
  const [customerList, setCustomerList] = useState([]);
  const [kuliList, setKuliList] = useState([]);
  const [selectedKuli, setSelectedKuli] = useState([]); // [{ nik, nama_kuli }] — bisa lebih dari 1
  const [kuliSearchText, setKuliSearchText] = useState("");
  const [lastKodeInfo, setLastKodeInfo] = useState("");
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

  // Terkunci kalau Bon Sementara tanggal ybs sudah punya status (di-approve
  // sebagian/seluruhnya) — samain `$status == null && $status == ''` di Blade.
  const isLocked = !!status;

  // ---- Load daftar transaksi (+ meta jenis_barang/status) ----
  const fetchList = async (filters = appliedFilters) => {
    setLoading(true);
    try {
      const payload = await bongkarRmApi.meta(filters);
      setDatas(payload.datas || []);
      setCountKuliPerTrip(payload.countKuliPerTrip || {});
      setJenisBarangList(payload.jenis_barang || []);
      setStatus(payload.status ?? null);
      if (payload.datas) setCustomerListFallback(payload.datas);
    } catch (err) {
      console.error("[BongkarRm.fetchList]", err);
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

  // Fallback daftar customer buat combobox, diambil dari data yang udah pernah
  // masuk (karena Laravel nggak wire autocomplete customer khusus utk form ini).
  const setCustomerListFallback = (rows) => {
    const names = [
      ...new Set(rows.map((r) => r.customer).filter(Boolean)),
    ].sort();
    setCustomerList((prev) => (names.length >= prev.length ? names : prev));
  };

  useEffect(() => {
    fetchList({});
    lookupApi.kuliList().then((d) => setKuliList(d.kuli || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Info "terakhir: XXX" berdasarkan tanggal, samain public/js/bongkarRM.js ----
  useEffect(() => {
    if (!form.tgl) return;
    const timer = setTimeout(() => {
      lookupApi
        .getLastKode({ tgl: form.tgl, jenis: "bongkar_rm" })
        .then((d) => {
          if (!d.last_kode) return setLastKodeInfo("");
          const suffix = String(d.last_kode).slice(-3);
          setLastKodeInfo(suffix);
        })
        .catch((err) => console.error("[BongkarRm.getLastKode]", err));
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tgl]);

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

  // Mode edit cuma boleh 1 kuli per baris (1 row = 1 id_kuli di DB). Mode tambah
  // baru boleh pilih lebih dari 1 kuli sekaligus -> dikirim sebagai beberapa
  // transaksi terpisah (1 request per kuli) saat submit.
  const pickKuli = (k) => {
    setKuliSearchText("");
    setSelectedKuli((prev) => {
      if (editingId) return [k];
      if (prev.some((p) => p.nik === k.nik)) return prev;
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
    setSelectedKuli([]);
    setKuliSearchText("");
    setEditingId(null);
  };

  const openEdit = (row) => {
    // Samain editBongkarrm: no_trip dilepas prefix tanggalnya (6 digit dmy) buat ditampilkan
    const rawNoTrip = /^\d{6}(.+)/.test(row.no_trip)
      ? row.no_trip.match(/^\d{6}(.+)/)[1]
      : row.no_trip;
    setEditingId(row.id);
    setForm({
      tgl: row.tgl,
      qty_truk: row.qty_truk,
      market: row.market || "-",
      jenis_truk: row.jenis_truk,
      no_trip: rawNoTrip,
      nopol: row.nopol,
      customer: row.customer,
      ket: row.ket || "",
    });
    const matchKuli = kuliList.find((k) => k.nik === row.id_kuli);
    setSelectedKuli([
      matchKuli || { nik: row.id_kuli, nama_kuli: row.id_kuli },
    ]);
    setKuliSearchText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedKuli.length === 0) {
      Swal.fire({ ...swalDark, icon: "warning", title: "Kuli wajib dipilih" });
      return;
    }
    if (!form.jenis_truk) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Jenis Angkutan wajib dipilih",
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
    // Hidden fields di Blade (pa/driver/jam_masuk/jam_bongkar/kota) selalu "-".
    const basePayload = {
      tgl: form.tgl,
      market: "-",
      customer: form.customer.toUpperCase(),
      kota: "-",
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
        await bongkarRmApi.update(editingId, {
          ...basePayload,
          id_kuli: selectedKuli[0].nik,
        });
      } else {
        for (const k of selectedKuli) {
          await bongkarRmApi.create({ ...basePayload, id_kuli: k.nik });
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
      console.error("[BongkarRm.handleSubmit]", err);
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
        await bongkarRmApi.remove(row.id);
        await fetchList();
        Swal.fire({
          ...swalDark,
          icon: "success",
          title: "Data dihapus",
          timer: 1200,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error("[BongkarRm.handleDelete]", err);
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

  // ---- Export ke Excel (samain data yang tampil di tabel Daftar Transaksi Bongkar Muat) ----
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
      "Qty | Jenis Angkutan",
      "No Polisi",
      "Gudang",
      "Nilai (Rp)",
      "Total Kuli",
    ];
    const summaryRows = grouped.map(([trip, records], idx) => {
      const first = records[0];
      const jumlahKuli = countKuliPerTrip[trip] ?? records.length;
      return [
        idx + 1,
        first.tgl,
        first.market,
        first.customer,
        trip,
        `${first.qty_truk} | ${first.jenis_truk}`,
        first.nopol,
        first.warehouse ?? "-",
        calcTotalBiaya(records),
        jumlahKuli,
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
      { wch: 10 },
      { wch: 28 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 8 },
      { wch: 14 },
      { wch: 10 },
    ];

    // ---- Sheet 2: Detail per Kuli ----
    const detailHeader = [
      "NO",
      "Tanggal",
      "Market",
      "Customer",
      "No. Trip",
      "Qty | Jenis Angkutan",
      "No Polisi",
      "Keterangan",
      "ID Kuli",
    ];
    const detailRows = [];
    grouped.forEach(([trip, records]) => {
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
      { wch: 10 },
      { wch: 28 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detail");

    const tglLabel = (
      appliedFilters.tgl || new Date().toISOString().slice(0, 10)
    ).replaceAll("-", "");
    XLSX.writeFile(wb, `Daftar_Transaksi_Bongkar_RM_${tglLabel}.xlsx`);
  };

  return (
    <div>
      {/* ===== FORM INPUT (samain dengan bongkar-rm-input.blade.php) ===== */}
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
              <label htmlFor="qty_truk">
                Qty <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                id="qty_truk"
                placeholder="Contoh: 0,25"
                inputMode="decimal"
                pattern="^(0|[1-9]\d*)(\,\d{1,2})?$"
                title="Masukkan angka positif dengan koma sebagai pemisah desimal, maksimal 2 digit. Contoh: 0,25 atau 1,50"
                value={form.qty_truk}
                onChange={(e) => handleChange("qty_truk", e.target.value)}
                readOnly={!!editingId}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="market">Market</label>
              <SelectNeo
                id="market"
                name="market"
                value={form.market}
                onChange={handleChange}
                options={MARKET_OPTIONS}
                disabled
                required
              />
            </div>

            <div className="field">
              <label htmlFor="jenis_truk">
                Jenis Angkutan <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <SelectNeo
                id="jenis_truk"
                name="jenis_truk"
                value={form.jenis_truk}
                onChange={handleChange}
                options={jenisBarangList.map((b) => b.jenis)}
                placeholder="-- Pilih Jenis Truk --"
                disabled={!!editingId}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="no_trip">
                Id Transaksi <span style={{ color: "var(--danger)" }}>*</span>
                {lastKodeInfo && (
                  <span
                    style={{
                      opacity: 0.7,
                      fontWeight: 500,
                      textTransform: "none",
                    }}
                  >
                    {" "}
                    terakhir:{" "}
                    <span style={{ color: "var(--danger)", fontWeight: 700 }}>
                      {lastKodeInfo}
                    </span>
                  </span>
                )}
              </label>
              <input
                type="text"
                id="no_trip"
                placeholder="Start Trip Z01"
                pattern="^Z[0-9]{2}$"
                title="Format harus 1 huruf Z diikuti 2 digit angka"
                value={form.no_trip}
                onChange={(e) =>
                  handleChange("no_trip", e.target.value.toUpperCase())
                }
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
                onChange={(e) =>
                  handleChange("nopol", e.target.value.toUpperCase())
                }
                readOnly={!!editingId}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="customer">
                Supplier <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <Combobox
                id="customer"
                name="customer"
                value={form.customer}
                onChange={(name, value) =>
                  handleChange(name, value.toUpperCase())
                }
                options={customerList}
                placeholder="Pilih atau ketik Customer..."
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
                placeholder="-- Pilih Keterangan --"
                disabled={!!editingId}
                required
              />
            </div>

            {/* Field Kuli TETAP editable walau row lagi diedit, samain Blade */}
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

      {/* ===== DAFTAR TRANSAKSI BONGKAR MUAT (samain bongkar-rm-tabel.blade.php) ===== */}
      <div className="glass-card panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h5 style={{ margin: 0 }}>Daftar Transaksi Bongkar Muat</h5>
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
                  <th style={{ padding: "8px 6px" }}>No Polisi</th>
                  <th style={{ padding: "8px 6px" }}>Gudang</th>
                  <th style={{ padding: "8px 6px" }}>Nilai (Rp)</th>
                  <th style={{ padding: "8px 6px" }}>Total Kuli</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([trip, records], idx) => {
                  const first = records[0];
                  const jumlahKuli = countKuliPerTrip[trip] ?? records.length;
                  const totalBiaya = calcTotalBiaya(records);
                  const isOpen = expandedTrip === trip;

                  return (
                    <FragmentRow
                      key={trip}
                      idx={idx}
                      trip={trip}
                      first={first}
                      jumlahKuli={jumlahKuli}
                      totalBiaya={totalBiaya}
                      isOpen={isOpen}
                      onToggle={() => setExpandedTrip(isOpen ? null : trip)}
                      records={records}
                      isLocked={isLocked}
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
// sama seperti struktur accordion di bongkar-rm-tabel.blade.php. Kalau isLocked
// (Bon Sementara tanggal ybs sudah berstatus), tombol edit/hapus diganti label
// APPROVE — samain kondisi `$status == null && $status == ''` di Blade.
function FragmentRow({
  idx,
  trip,
  first,
  jumlahKuli,
  totalBiaya,
  isOpen,
  onToggle,
  records,
  isLocked,
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
        <td style={{ padding: "8px 6px" }}>{first.nopol}</td>
        <td style={{ padding: "8px 6px" }}>{first.warehouse ?? "-"}</td>
        <td style={{ padding: "8px 6px" }}>{rupiah(totalBiaya)}</td>
        <td style={{ padding: "8px 6px" }}>{jumlahKuli}</td>
      </tr>

      {isOpen && (
        <tr className="row-detail-wrap">
          <td colSpan={10} style={{ padding: "10px 6px" }}>
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
                      {isLocked ? (
                        <p
                          style={{
                            margin: 0,
                            color: "var(--success)",
                            fontWeight: 700,
                          }}
                        >
                          APPROVE
                        </p>
                      ) : (
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
                      )}
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
