import {
  LifeBuoy,
  Mail,
  Phone,
  MessageCircleQuestion,
  FileSignature,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  UserCheck,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const faqs = [
  {
    q: "Bagaimana cara mengajukan Bon Sementara?",
    a: "Buka menu Entry Ongkos Reguler > Permintaan Bon Sementara, lalu klik tombol Ajukan Bon Sementara dan isi form yang tersedia.",
  },
  {
    q: "Kenapa transaksi saya belum ter-approve?",
    a: "Setiap dokumen bon sementara / LPBS perlu diverifikasi secara berjenjang oleh Management (SH > DH > HOD) pada menu Approve Bongkarmuat sebelum berstatus Approved.",
  },
  {
    q: "Bagaimana jika pejabat penandatangan berhalangan hadir?",
    a: "Persetujuan approval dokumen otomatis dapat didelegasikan sesuai Matriks Otorisasi Pengganti Sementara (Memo Otorisasi) di bawah ini.",
  },
  {
    q: "Bagaimana cara menambah data kuli baru?",
    a: "Masuk ke menu Master Data > Daftar Nama Kuli, klik Tambah Kuli, isi ID, nama, status, dan bagian.",
  },
];

const delegationRules = [
  {
    role: "Section Head (SH)",
    tag: "Diajukan oleh",
    utama: "Section Head Definitif",
    badgeUtama: "SH",
    delegasiUtama: "Team Leader",
    delegasiAlt: "Admin Gudang",
    keterangan: "Dapat memverifikasi rincian transaksi fisik",
  },
  {
    role: "Department Head (DH)",
    tag: "Diketahui oleh",
    utama: "Department Head Definitif",
    badgeUtama: "DH",
    delegasiUtama: "Assistant DH (ADH)",
    delegasiAlt: "Section Head (SH)",
    keterangan: "Memeriksa kesesuaian anggaran & verifikasi operasional",
  },
  {
    role: "Head of Department (HOD)",
    tag: "Disetujui oleh",
    utama: "Head of Department Definitif",
    badgeUtama: "HOD",
    delegasiUtama: "Assistant HOD (AHOD)",
    delegasiAlt: "Department Head (DH)",
    keterangan: "Otorisasi final pencairan dana kas Bon Sementara & LPBS",
  },
];

export default function Bantuan() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title="Bantuan & Pusat Informasi"
        subtitle="Panduan operasional dan pedoman otorisasi sistem Logistik Ongkos Kuli"
      />

      {/* ===== PANEL 1: MATRIKS DELEGASI & MEMO OTORISASI ===== */}
      <div className="glass-card panel">
        <div
          className="panel-title"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            borderBottom: "1px solid var(--glass-border)",
            paddingBottom: 12,
            marginBottom: 16,
          }}
        >
          <h3
            style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}
          >
            <FileSignature size={18} style={{ color: "var(--accent-2)" }} />
            Matriks Autorisasi & Delegasi Tanda Tangan (Memo)
          </h3>
          <span
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 20,
              background: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              fontWeight: 600,
            }}
          >
            SOP-PC-AUTH-Rev.0
          </span>
        </div>

        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          Pedoman pengalihan wewenang persetujuan (*Approval Delegation*)
          apabila pejabat penandatangan berhalangan hadir (Cuti / Izin / Dinas
          Luar) guna memastikan kelancaran operasional pengeluaran dana Ongkos
          Kuli.
        </p>

        {/* Tabel Matriks Delegasi */}
        <div style={{ overflowX: "auto", marginBottom: 16 }}>
          <table
            className="table-bordered-neo"
            style={{ width: "100%", fontSize: 13, textAlign: "left" }}
          >
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={{ width: "22%", padding: "10px 12px" }}>
                  Jenjang / Posisi
                </th>
                <th style={{ width: "24%", padding: "10px 12px" }}>
                  Pejabat Utama
                </th>
                <th style={{ width: "32%", padding: "10px 12px" }}>
                  Delegasi / Pelaksana Tugas (Plt.)
                </th>
                <th style={{ width: "22%", padding: "10px 12px" }}>
                  Kewenangan
                </th>
              </tr>
            </thead>
            <tbody>
              {delegationRules.map((rule, idx) => (
                <tr key={idx}>
                  <td style={{ padding: "12px" }}>
                    <div
                      style={{ fontWeight: 600, color: "var(--text-primary)" }}
                    >
                      {rule.role}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      ({rule.tag})
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span className="badge-neo info" style={{ fontSize: 11 }}>
                        {rule.badgeUtama}
                      </span>
                      <span>{rule.utama}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: "rgba(34, 197, 94, 0.1)",
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid rgba(34, 197, 94, 0.25)",
                        }}
                      >
                        <UserCheck size={14} style={{ color: "#4ade80" }} />
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#86efac",
                            fontSize: 12,
                          }}
                        >
                          {rule.delegasiUtama}
                        </span>
                      </div>
                      <ArrowRight
                        size={13}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          background: "rgba(255,255,255,0.04)",
                          padding: "4px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {rule.delegasiAlt}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                    }}
                  >
                    {rule.keterangan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kotak Catatan Kebijakan Delegasi */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "rgba(234, 179, 8, 0.08)",
              border: "1px solid rgba(234, 179, 8, 0.2)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Clock
              size={16}
              style={{ color: "#facc15", marginTop: 2, flexShrink: 0 }}
            />
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              <b style={{ color: "#fef08a" }}>Masa Berlaku Delegasi:</b>{" "}
              Pengalihan wewenang berlaku maksimal selama masa cuti/absen
              pejabat definitif dan wajib dikoordinasikan via memo/email
              internal.
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <ShieldCheck
              size={16}
              style={{ color: "#34d399", marginTop: 2, flexShrink: 0 }}
            />
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              <b style={{ color: "#a7f3d0" }}>Validitas Audit Trail:</b> Setiap
              klik persetujuan delegasi tetap tercatat atas akun user yang login
              beserta stempel waktu asli sistem (Digital Signature).
            </div>
          </div>
        </div>
      </div>

      {/* ===== PANEL 2: FAQ ===== */}
      <div className="glass-card panel">
        <div className="panel-title">
          <h3>
            <LifeBuoy
              size={16}
              style={{
                marginRight: 8,
                verticalAlign: "-3px",
                color: "var(--accent-2)",
              }}
            />
            Pertanyaan Umum (FAQ)
          </h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map((f, i) => (
            <div
              key={i}
              style={{
                padding: 14,
                borderRadius: 10,
                border: "1px solid var(--glass-border)",
                background: "rgba(16,26,51,0.4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--text-primary)",
                }}
              >
                <MessageCircleQuestion
                  size={16}
                  style={{
                    color: "var(--accent-2)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                {f.q}
              </div>
              <div
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  paddingLeft: 24,
                }}
              >
                {f.a}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== PANEL 3: KONTAK TIM LOGISTIK ===== */}
      <div className="glass-card panel">
        <div className="panel-title">
          <h3>Hubungi Tim Logistik</h3>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            <Mail size={16} style={{ color: "var(--accent-2)" }} />
            gudangban.b@gt-tires.com
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            <Phone size={16} style={{ color: "var(--accent-2)" }} />
            Ext. 7423 / +62 811-9518-095
          </div>
        </div>
      </div>
    </div>
  );
}
