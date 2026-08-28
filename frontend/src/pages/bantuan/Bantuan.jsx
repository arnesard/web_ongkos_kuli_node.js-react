import { LifeBuoy, Mail, Phone, MessageCircleQuestion } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const faqs = [
  {
    q: "Bagaimana cara mengajukan Bon Sementara?",
    a: "Buka menu Entry Ongkos Reguler > Permintaan Bon Sementara, lalu klik tombol Ajukan Bon Sementara dan isi form yang tersedia.",
  },
  {
    q: "Kenapa transaksi saya belum ter-approve?",
    a: "Setiap dokumen bon sementara / LPBS perlu diverifikasi oleh Management pada menu Approve Bongkarmuat sebelum berstatus Approved.",
  },
  {
    q: "Bagaimana cara menambah data kuli baru?",
    a: "Masuk ke menu Master Data > Daftar Nama Kuli, klik Tambah Kuli, isi ID, nama, status, dan bagian.",
  },
];

export default function Bantuan() {
  return (
    <div>
      <PageHeader
        title="Bantuan"
        subtitle="Panduan penggunaan Web Logistik Ongkos Kuli"
      />

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
            Pertanyaan Umum
          </h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {faqs.map((f, i) => (
            <div
              key={i}
              style={{
                padding: 16,
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
                }}
              >
                <MessageCircleQuestion
                  size={16}
                  style={{ color: "var(--accent-2)" }}
                />
                {f.q}
              </div>
              <div
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13.5,
                  lineHeight: 1.6,
                }}
              >
                {f.a}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card panel">
        <div className="panel-title">
          <h3>Hubungi Tim IT / Logistic</h3>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "var(--text-secondary)",
            }}
          >
            <Mail size={16} style={{ color: "var(--accent-2)" }} />{" "}
            gudangban.b@gt-tires.com
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "var(--text-secondary)",
            }}
          >
            <Phone size={16} style={{ color: "var(--accent-2)" }} /> 08119518095
          </div>
        </div>
      </div>
    </div>
  );
}
