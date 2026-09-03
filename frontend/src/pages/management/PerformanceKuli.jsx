import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { Loader2, Printer, Search, RotateCcw, Receipt } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { managementApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { printHtmlTable, printNotaKuli } from "../../utils/printTable";

// ==========================================================================
// Disamakan dengan resources/views/management/performance-kuli.blade.php +
// components/performance-kuli-tabel.blade.php + ManagementController::
// performanceKuli & ::cetakNotaKuli.
//
// Kolom & urutan data SENGAJA disamakan persis dengan Laravel: NO, ID KULI,
// NAMA KULI, KEHADIRAN, HARI KERJA, %, PENDAPATAN (total gabungan — Laravel
// nggak mecah pendapatan per sumber di tabel utama, cuma di modal "Nota Kuli").
// ==========================================================================

const swalDark = { customClass: { popup: "neo-swal" } };
const WAREHOUSES = ["APW", "BPW", "DPW", "RPW", "JMW"];

export default function PerformanceKuli() {
  const { user } = useAuth();
  const isHighLevel = user?.level === "HOD" || user?.level === "Superuser";

  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [startTgl, setStartTgl] = useState("");
  const [endTgl, setEndTgl] = useState("");
  const [namaKuli, setNamaKuli] = useState("");

  const [data, setData] = useState([]);
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [requiresWarehouse, setRequiresWarehouse] = useState(false);
  const [loading, setLoading] = useState(true);

  const tableRef = useRef(null);

  const fetchData = async (params = {}) => {
    if (isHighLevel && !(params.warehouse ?? selectedWarehouse)) {
      setData([]);
      setDaysInMonth(0);
      setRequiresWarehouse(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await managementApi.performanceKuli({
        start_tgl: params.start_tgl ?? startTgl,
        end_tgl: params.end_tgl ?? endTgl,
        nama_kuli: params.nama_kuli ?? namaKuli,
        warehouse: params.warehouse ?? selectedWarehouse,
      });
      setData(res.data || []);
      setDaysInMonth(res.daysInMonth || 0);
      setRequiresWarehouse(!!res.requiresWarehouse);
    } catch (err) {
      console.error("[PerformanceKuli.fetchData]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal memuat data",
        text: err.response?.data?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickWarehouse = (wh) => {
    const next = selectedWarehouse === wh ? "" : wh;
    setSelectedWarehouse(next);
    fetchData({ warehouse: next });
  };

  const handleDetailKuli = (e) => {
    e.preventDefault();
    fetchData({});
  };

  const handleResetFilter = () => {
    setSelectedWarehouse("");
    setStartTgl("");
    setEndTgl("");
    setNamaKuli("");
    fetchData({ warehouse: "", start_tgl: "", end_tgl: "", nama_kuli: "" });
  };

  const handleCetak = () => {
    if (!tableRef.current || data.length === 0) {
      Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Tidak ada data yang akan dicetak.",
      });
      return;
    }
    printHtmlTable("Performance Kuli", tableRef.current.outerHTML);
  };

  // ==== Nota Kuli (struk per-kuli) ====
  const [notaOpen, setNotaOpen] = useState(false);
  const [notaLoading, setNotaLoading] = useState(false);
  const [notaData, setNotaData] = useState(null);
  const notaBodyRef = useRef(null);

  const handleShowNota = async () => {
    if (!startTgl)
      return Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Harap lengkapi Tanggal Mulai.",
      });
    if (!endTgl)
      return Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Harap lengkapi Tanggal Akhir.",
      });
    if (!namaKuli)
      return Swal.fire({
        ...swalDark,
        icon: "warning",
        title: "Harap lengkapi Nama Kuli.",
      });

    setNotaOpen(true);
    setNotaLoading(true);
    setNotaData(null);
    try {
      const res = await managementApi.cetakNotaKuli({
        start_tgl: startTgl,
        end_tgl: endTgl,
        nama_kuli: namaKuli,
        warehouse: selectedWarehouse,
      });
      setNotaData(res);
    } catch (err) {
      console.error("[PerformanceKuli.handleShowNota]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal mengambil rincian",
        text: err.response?.data?.message,
      });
      setNotaOpen(false);
    } finally {
      setNotaLoading(false);
    }
  };

  const handlePrintNota = () => {
    if (!notaBodyRef.current) return;
    printNotaKuli("Struk Nota Kuli", notaBodyRef.current.innerHTML);
  };

  return (
    <div>
      <div className="glass-card panel panel-elevated">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>
            <h6>Rekap kehadiran & pendapatan kuli per periode</h6>
            {selectedWarehouse && (
              <span className="badge-neo info" style={{ marginLeft: 8 }}>
                {selectedWarehouse}
              </span>
            )}
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" title="Cetak" onClick={handleCetak}>
              <Printer size={15} />
            </button>
            <button
              className="btn-neo ghost sm"
              onClick={() => setShowFilter((s) => !s)}
            >
              <Search size={13} /> Detail Data Kuli
            </button>
            <button className="btn-neo ghost sm" onClick={handleResetFilter}>
              <RotateCcw size={13} /> Reset Data
            </button>
          </div>
        </div>

        {isHighLevel && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            {WAREHOUSES.map((wh) => (
              <button
                key={wh}
                type="button"
                className={`btn-neo sm ${selectedWarehouse === wh ? "primary" : "ghost"}`}
                onClick={() => pickWarehouse(wh)}
              >
                {wh}
              </button>
            ))}
          </div>
        )}

        {showFilter && (
          <form
            className="search-inline"
            onSubmit={handleDetailKuli}
            style={{ marginBottom: 14, flexWrap: "wrap" }}
          >
            <div className="field">
              <label>Tgl</label>
              <input
                type="date"
                value={startTgl}
                onChange={(e) => setStartTgl(e.target.value)}
              />
            </div>
            <div className="field">
              <label>hingga</label>
              <input
                type="date"
                value={endTgl}
                onChange={(e) => setEndTgl(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Kuli</label>
              <input
                type="text"
                value={namaKuli}
                onChange={(e) => setNamaKuli(e.target.value)}
                placeholder="Nama kuli"
              />
            </div>
            <button type="submit" className="btn-neo primary sm">
              Detail Kuli
            </button>
            <button
              type="button"
              className="btn-neo success sm"
              onClick={handleShowNota}
            >
              <Receipt size={13} /> Nota Kuli
            </button>
          </form>
        )}

        {requiresWarehouse ? (
          <div className="empty-state">
            Pilih salah satu warehouse di atas dulu untuk menampilkan data.
          </div>
        ) : loading ? (
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
        ) : data.length === 0 ? (
          <div className="empty-state">Belum ada data untuk periode ini.</div>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: 620, overflowY: "auto" }}>
            <table
              ref={tableRef}
              className="table-bordered-neo"
              style={{ width: "100%", fontSize: 12.5 }}
            >
              <thead>
                <tr style={{ textAlign: "center" }}>
                  <th>NO</th>
                  <th>ID KULI</th>
                  <th>NAMA KULI</th>
                  <th>KEHADIRAN</th>
                  <th>HARI KERJA</th>
                  <th>%</th>
                  <th>PENDAPATAN</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, idx) => {
                  const persentase = daysInMonth
                    ? (d.hadir_hari / daysInMonth) * 100
                    : null;
                  return (
                    <tr key={d.id_kuli} style={{ textAlign: "center" }}>
                      <td>{idx + 1}</td>
                      <td>{d.id_kuli}</td>
                      <td>{d.nama_kuli}</td>
                      <td>{d.hadir_hari}</td>
                      <td>{daysInMonth}</td>
                      <td>
                        {persentase !== null
                          ? `${persentase.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                          : "-"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        Rp{" "}
                        {Number(d.total_pendapatan || 0).toLocaleString(
                          "id-ID",
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Modal Nota Kuli ===== */}
      {notaOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setNotaOpen(false)}
        >
          <div
            className="glass-card panel-elevated"
            style={{ maxWidth: 560, width: "100%", padding: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0 }}>Nota Kuli - Rincian Pendapatan</h3>
              <button className="icon-btn" onClick={() => setNotaOpen(false)}>
                ✕
              </button>
            </div>

            {notaLoading ? (
              <div
                className="empty-state"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Loader2 size={16} className="spin" /> Memuat data rincian...
              </div>
            ) : (
              <div ref={notaBodyRef}>
                <h6>
                  Periode Tanggal:{" "}
                  <strong>
                    {startTgl} - {endTgl}
                  </strong>
                </h6>
                <h6>
                  Nama Kuli: <strong>{namaKuli}</strong>
                </h6>
                <hr />
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "center" }}>
                      <th
                        style={{
                          border: "1px solid var(--glass-border)",
                          padding: 6,
                        }}
                      >
                        No
                      </th>
                      <th
                        style={{
                          border: "1px solid var(--glass-border)",
                          padding: 6,
                        }}
                      >
                        Jenis Truk
                      </th>
                      <th
                        style={{
                          border: "1px solid var(--glass-border)",
                          padding: 6,
                        }}
                      >
                        Qty
                      </th>
                      <th
                        style={{
                          border: "1px solid var(--glass-border)",
                          padding: 6,
                        }}
                      >
                        Pendapatan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!notaData || notaData.rincian.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            textAlign: "center",
                            padding: 10,
                            border: "1px solid var(--glass-border)",
                          }}
                        >
                          Tidak ada transaksi ditemukan untuk periode ini.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {notaData.rincian.map((r, i) => (
                          <tr key={i}>
                            <td
                              style={{
                                textAlign: "center",
                                border: "1px solid var(--glass-border)",
                                padding: 6,
                              }}
                            >
                              {i + 1}
                            </td>
                            <td
                              style={{
                                border: "1px solid var(--glass-border)",
                                padding: 6,
                              }}
                            >
                              {r.jenis}
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                border: "1px solid var(--glass-border)",
                                padding: 6,
                              }}
                            >
                              {r.qty}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                border: "1px solid var(--glass-border)",
                                padding: 6,
                              }}
                            >
                              {Math.round(r.pendapatan).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                        <tr className="total-row" style={{ fontWeight: 700 }}>
                          <td
                            colSpan={2}
                            style={{
                              textAlign: "right",
                              border: "1px solid var(--glass-border)",
                              padding: 6,
                            }}
                          >
                            Total
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              border: "1px solid var(--glass-border)",
                              padding: 6,
                            }}
                          >
                            {notaData.total_qty}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              border: "1px solid var(--glass-border)",
                              padding: 6,
                            }}
                          >
                            {Math.round(notaData.grand_total).toLocaleString(
                              "id-ID",
                            )}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 14,
              }}
            >
              <button
                className="btn-neo ghost sm"
                onClick={() => setNotaOpen(false)}
              >
                Tutup
              </button>
              <button
                className="btn-neo primary sm"
                onClick={handlePrintNota}
                disabled={notaLoading}
              >
                <Printer size={13} /> Cetak Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
