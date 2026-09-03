import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { managementApi } from "../../api/endpoints";

// ==========================================================================
// Disamakan 1:1 dengan resources/views/management/transaksi-lpbs.blade.php
// (ManagementController::lpbsReport).
//
// Beda dengan BS: di sini SEMUA baris uraian (breakdown bongkar/muat, uang makan,
// susun lantai, pemindahan barang) ditampilkan lewat @foreach, sisanya diisi "-"
// sampai 7 baris. Total Pengeluaran pakai nilai pembulatan (ke ratusan), Total Bon
// Sementara pakai act_nilai (nilai yang diajukan awal), Selisih = act_nilai - pembulatan.
// ==========================================================================

function formatTglPanjang(tgl) {
  if (!tgl) return "";
  const d = new Date(tgl);
  if (Number.isNaN(d.getTime())) return tgl;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function rupiah(v) {
  return `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
}

function ttdSrc(nama) {
  return `/img/ttd/${nama}.png`;
}

export default function CetakLPBS() {
  const { no_doc_b64 } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    managementApi
      .lpbsReport(no_doc_b64)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch((err) => {
        if (alive) setError(err.response?.data?.message || "Data tidak ditemukan.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [no_doc_b64]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 60 }}>
        <Loader2 size={18} className="spin" /> Memuat data...
      </div>
    );
  }
  if (error || !data) {
    return <div style={{ padding: 40, textAlign: "center", color: "#c00" }}>{error || "Data tidak ditemukan."}</div>;
  }

  const { datas, shUser, no_doc, tanggal, status, act_nilai, pembulatan } = data;
  const totalRaw = datas.reduce((sum, d) => sum + Number(d.nilai || 0), 0);
  const dummyRowCount = Math.max(0, 7 - datas.length);
  const dummyStart = datas.length + 1;
  const selisihLebih = Number(act_nilai || 0) - totalRaw > 0;
  const sh1 = shUser?.[1];
  const sh2 = shUser?.[2];

  return (
    <div className="cetak-doc-page">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0mm 4mm 123mm 1mm; }
          body { font-size: 10px; color: #000; }
          .no-print, .sidebar, .topbar { display: none !important; visibility: hidden; }
          .cetak-table-header-bg { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: #6e6e6e !important; color: #fff !important; }
          .cetak-doc-page img.ttd { height: 80px; width: 80px; }
        }
      `}</style>

      <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "10px 16px" }}>
        <Link to="/approve-bongkarmuat?tab=lpbs" className="btn-neo ghost sm">
          ← Kembali
        </Link>
        <button className="btn-neo primary sm" onClick={() => window.print()}>
          Cetak
        </button>
      </div>

      <div
        style={{
          maxWidth: 800,
          margin: "0 auto 30px",
          background: "#fff",
          color: "#000",
          border: "3px solid black",
          padding: 15,
          fontFamily: "Arial, sans-serif",
          fontSize: 12,
        }}
      >
        <p style={{ textAlign: "center", marginBottom: 25, marginTop: 0, textDecoration: "underline" }}>
          <b>LAPORAN PENYELESAIAN BON SEMENTARA</b>
        </p>

        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ width: "20%", padding: "2px 0" }}>1. Tanggal</td>
              <td style={{ width: "80%" }}>
                <span style={{ display: "block", width: "100%", borderBottom: "1px solid black" }}>: {formatTglPanjang(tanggal)}</span>
              </td>
            </tr>
            <tr>
              <td style={{ width: "20%", padding: "2px 0" }}>2. Nomor Bon Sementara</td>
              <td style={{ width: "80%" }}>
                <span style={{ display: "block", width: "100%", borderBottom: "1px solid black" }}>: {no_doc}</span>
              </td>
            </tr>
            <tr>
              <td style={{ width: "20%", padding: "2px 0" }}>3. Rincian Pengeluaran</td>
              <td style={{ width: "70%" }}>:</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "100%", textAlign: "center", borderCollapse: "collapse", marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={{ width: "5%" }}></th>
              <th className="cetak-table-header-bg" style={{ width: "5%", border: "1px solid #000", padding: 2 }}>No.</th>
              <th className="cetak-table-header-bg" style={{ width: "75%", border: "1px solid #000", padding: 2 }}>Rincian</th>
              <th className="cetak-table-header-bg" style={{ width: "15%", border: "1px solid #000", padding: 2 }}>Nilai</th>
            </tr>
          </thead>
          <tbody>
            {datas.map((d, i) => (
              <tr key={i}>
                <td></td>
                <td style={{ textAlign: "center", border: "1px solid #000", padding: 2 }}>{i + 1}</td>
                <td
                  style={{
                    textAlign: "left",
                    border: "1px solid #000",
                    padding: 2,
                    maxWidth: 400,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {d.uraian_kegiatan}
                </td>
                <td style={{ textAlign: "right", border: "1px solid #000", padding: 2 }}>{rupiah(d.nilai)}</td>
              </tr>
            ))}
            {Array.from({ length: dummyRowCount }, (_, i) => (
              <tr key={`dummy-${i}`}>
                <td></td>
                <td style={{ border: "1px solid #000", padding: 2 }}>{dummyStart + i}</td>
                <td style={{ textAlign: "left", border: "1px solid #000", padding: 2 }}>-</td>
                <td style={{ textAlign: "right", border: "1px solid #000", padding: 2 }}>-</td>
              </tr>
            ))}

            <tr>
              <td></td>
              <td colSpan={2} style={{ textAlign: "left", padding: "2px 0 2px 0" }}>
                Total Pengeluaran
              </td>
              <td style={{ textAlign: "right", border: "1px solid #000", padding: 2 }}>{rupiah(pembulatan)}</td>
            </tr>
            <tr>
              <td colSpan={3} style={{ textAlign: "left", paddingLeft: 10, padding: 2 }}>
                4. Total Bon Sementara
              </td>
              <td style={{ textAlign: "right", border: "1px solid #000", padding: 2 }}>{rupiah(act_nilai)}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: "left", paddingLeft: 10, padding: 2 }}>
                5. Selisih
              </td>
              <td style={{ padding: 2 }}>
                <div style={{ textAlign: "left", paddingLeft: 10 }}>
                  <span style={{ paddingLeft: 40 }}>
                    {selisihLebih ? "☑ Lebih bayar \u00A0 ☐ Kurang bayar" : "☐ Lebih bayar \u00A0 ☑ Kurang bayar"}
                  </span>
                </div>
              </td>
              <td style={{ textAlign: "right", border: "1px solid #000", padding: 2 }}>
                {rupiah(Number(act_nilai || 0) - Number(pembulatan || 0))}
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "50%", marginTop: 3, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <td colSpan={3}></td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>Diajukan oleh,</td>
              <td style={{ textAlign: "center" }}>Diketahui oleh,</td>
              <td style={{ textAlign: "center" }}>Disetujui oleh,</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              {status === "approvebysh" && (
                <>
                  <td style={{ textAlign: "center" }}>{sh1 && <img className="ttd" src={ttdSrc(sh1.nama)} alt="Tanda Tangan" style={{ height: 80, width: 80 }} />}</td>
                  <td />
                  <td />
                </>
              )}
              {status === "approvebydh" && (
                <>
                  <td style={{ textAlign: "center" }}>{sh1 && <img className="ttd" src={ttdSrc(sh1.nama)} alt="Tanda Tangan" style={{ height: 80, width: 80 }} />}</td>
                  <td style={{ textAlign: "center" }}>{sh2 && <img className="ttd" src={ttdSrc(sh2.nama)} alt="Tanda Tangan" style={{ height: 80, width: 80 }} />}</td>
                  <td />
                </>
              )}
              {status === "approve" && (
                <>
                  <td style={{ textAlign: "center" }}>{sh1 && <img className="ttd" src={ttdSrc(sh1.nama)} alt="Tanda Tangan" style={{ height: 80, width: 80 }} />}</td>
                  <td style={{ textAlign: "center" }}>{sh2 && <img className="ttd" src={ttdSrc(sh2.nama)} alt="Tanda Tangan" style={{ height: 80, width: 80 }} />}</td>
                  <td style={{ textAlign: "center" }}>
                    <img className="ttd" src={ttdSrc("Edward Supandi")} alt="Tanda Tangan" style={{ height: 80, width: 80 }} />
                  </td>
                </>
              )}
              {!status && (
                <>
                  <td />
                  <td />
                  <td />
                </>
              )}
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>({sh1?.nama})</td>
              <td style={{ textAlign: "center" }}>({sh2?.nama})</td>
              <td style={{ textAlign: "center" }}>(Edward Supandi)</td>
            </tr>
          </tbody>
        </table>

        <p style={{ color: "#666", fontSize: 11, marginTop: 8 }}>*) Dokumen asli penggunaan/pembayaran harus dilampirkan</p>
      </div>
      <p style={{ textAlign: "center", color: "#666", fontSize: 11 }}>SOP-PC-F02-Rev.0</p>
    </div>
  );
}
