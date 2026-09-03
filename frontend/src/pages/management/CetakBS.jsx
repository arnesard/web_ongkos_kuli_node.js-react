import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { managementApi } from "../../api/endpoints";

// ==========================================================================
// Disamakan 1:1 dengan resources/views/management/transaksi-bs.blade.php
// (ManagementController::bsReport).
//
// Catatan penting soal logic (ikut apa adanya seperti Laravel, bukan "diperbaiki"):
// baris "1." di tabel Uraian Kegiatan HANYA mengambil datas[0] (baris pertama saja),
// baris 2-7 selalu tampil "-" — walaupun no_doc yang sama punya beberapa baris
// uraian_kegiatan di halaman Approve BS. Itu memang begitu di Laravel-nya.
// ==========================================================================

const COST_CENTER = {
  APW: { text: " - PRODUCT. WAREHOUSE", cc: "61201 140100 8001000001" },
  BPW: { text: " - PRODUCT. WAREHOUSE", cc: "61202 140100 8001000002" },
  DPW: { text: " - PRODUCT. WAREHOUSE", cc: "61204 140100 8001000004" },
  RPW: { text: " - PRODUCT. WAREHOUSE", cc: "61231 140100 8001000010" },
  JMW: { text: " - MATERIAL. WAREHOUSE", cc: "94600 140501 8001000090" },
};

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

export default function CetakBS() {
  const { no_doc_b64 } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    managementApi
      .bsReport(no_doc_b64)
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
  if (error || !data || !data.datas?.length) {
    return <div style={{ padding: 40, textAlign: "center", color: "#c00" }}>{error || "Data tidak ditemukan."}</div>;
  }

  const { datas, shUser } = data;
  const first = datas[0];
  const total = Number(first.nilai || 0);
  const dummyRows = Array.from({ length: 6 }, (_, i) => i + 2); // No. 2 s/d 7
  const cc = COST_CENTER[first.warehouse] || { text: "", cc: "" };
  const sh1 = shUser?.[1];
  const sh2 = shUser?.[2];
  const statusBs = first.status_bs;

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
        <Link to="/approve-bongkarmuat?tab=bs" className="btn-neo ghost sm">
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
          <b>BON SEMENTARA</b>
        </p>

        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ width: "20%", padding: "2px 0" }}>1. Nomor Bon Sementara</td>
              <td style={{ width: "80%" }}>
                <span style={{ display: "block", width: "100%", borderBottom: "1px solid black" }}>: {first.no_doc || ""}</span>
              </td>
            </tr>
            <tr>
              <td style={{ width: "20%", padding: "2px 0" }}>2. Tanggal</td>
              <td style={{ width: "80%" }}>
                <span style={{ display: "block", width: "100%", borderBottom: "1px solid black" }}>: {formatTglPanjang(first.tgl)}</span>
              </td>
            </tr>
            <tr>
              <td style={{ width: "20%", padding: "2px 0" }}>3. Nama</td>
              <td style={{ width: "80%" }}>
                <span style={{ display: "block", width: "100%", borderBottom: "1px solid black" }}>
                  : {(sh1?.nama || "").toUpperCase()}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ width: "20%", padding: "2px 0" }}>4. Departemen</td>
              <td style={{ width: "70%" }}>
                <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "50%" }}>
                        <span style={{ display: "block", width: "100%", borderBottom: "1px solid black" }}>
                          : {first.warehouse || ""}
                          {cc.text}
                        </span>
                      </td>
                      <td style={{ width: "9%" }}> Cost Center</td>
                      <td style={{ width: "32%", textAlign: "right" }}>
                        <span style={{ display: "inline-block", textAlign: "left", borderBottom: "1px solid black", width: "100%" }}>
                          : {cc.cc}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style={{ width: "20%", padding: "2px 0" }}>5. Rincian Bon Sementara</td>
              <td style={{ width: "80%" }}>:</td>
            </tr>
          </tbody>
        </table>

        <table
          style={{ width: "94%", margin: "8px 0 0 5%", textAlign: "center", borderCollapse: "collapse", borderBottom: "none" }}
        >
          <thead className="cetak-table-header-bg" style={{ background: "#6e6e6e", color: "#fff" }}>
            <tr>
              <th style={{ width: "5%", border: "1px solid #000", padding: 2 }}>No.</th>
              <th style={{ width: "75%", border: "1px solid #000", padding: 2 }}>Uraian Kegiatan</th>
              <th style={{ width: "20%", border: "1px solid #000", padding: 2 }}>Nilai</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #000", padding: 2 }}>1</td>
              <td style={{ textAlign: "left", border: "1px solid #000", padding: 2 }}>{first.uraian_kegiatan}</td>
              <td style={{ textAlign: "right", border: "1px solid #000", padding: 2 }}>{rupiah(first.nilai)}</td>
            </tr>
            {dummyRows.map((no) => (
              <tr key={no}>
                <td style={{ border: "1px solid #000", padding: 2 }}>{no}</td>
                <td style={{ textAlign: "left", border: "1px solid #000", padding: 2 }}>-</td>
                <td style={{ textAlign: "right", border: "1px solid #000", padding: 2 }}>-</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} style={{ textAlign: "center", fontWeight: "bold", padding: 2 }}>
                Total Bon Sementara
              </td>
              <td style={{ textAlign: "right", fontWeight: "bold", border: "1px solid #000", padding: 2 }}>{rupiah(total)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "50%", marginTop: 0, borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ textAlign: "center", paddingTop: 1, width: "33.33%" }}>Diajukan oleh,</td>
              <td style={{ textAlign: "center", paddingTop: 1, width: "33.33%" }}>Diketahui oleh,</td>
              <td style={{ textAlign: "center", paddingTop: 1, width: "33.33%" }}>Disetujui oleh,</td>
            </tr>
            <tr>
              {statusBs === "approvebysh" && (
                <>
                  <td style={{ textAlign: "center" }}>{sh1 && <img className="ttd" src={ttdSrc(sh1.nama)} alt="" style={{ height: 80, width: 80 }} />}</td>
                  <td />
                  <td />
                </>
              )}
              {statusBs === "approvebydh" && (
                <>
                  <td style={{ textAlign: "center" }}>{sh1 && <img className="ttd" src={ttdSrc(sh1.nama)} alt="" style={{ height: 80, width: 80 }} />}</td>
                  <td style={{ textAlign: "center" }}>{sh2 && <img className="ttd" src={ttdSrc(sh2.nama)} alt="" style={{ height: 80, width: 80 }} />}</td>
                  <td />
                </>
              )}
              {statusBs === "approve" && (
                <>
                  <td style={{ textAlign: "center" }}>{sh1 && <img className="ttd" src={ttdSrc(sh1.nama)} alt="" style={{ height: 80, width: 80 }} />}</td>
                  <td style={{ textAlign: "center" }}>{sh2 && <img className="ttd" src={ttdSrc(sh2.nama)} alt="" style={{ height: 80, width: 80 }} />}</td>
                  <td style={{ textAlign: "center" }}>
                    <img className="ttd" src={ttdSrc("Edward Supandi")} alt="" style={{ height: 80, width: 80 }} />
                  </td>
                </>
              )}
              {!statusBs && (
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

        <p style={{ color: "#666", fontSize: 11, margin: 0, paddingTop: 4 }}>
          *) Bon Sementara Harus Segera Di Selesaikan Paling Lambat 5 Hari Setelah Selesai Kegiatan
        </p>
      </div>
      <p style={{ textAlign: "center", color: "#666", fontSize: 11 }}>SOP-PC-F01-Rev.0</p>
    </div>
  );
}
