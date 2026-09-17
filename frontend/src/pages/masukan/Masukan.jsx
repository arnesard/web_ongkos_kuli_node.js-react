import { useState } from "react";
import Swal from "sweetalert2";
import { Send } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { masukanApi } from "../../api/endpoints";

export default function Masukan() {
  const [form, setForm] = useState({ subjek: "", pesan: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await masukanApi.create(form);
      Swal.fire({
        customClass: { popup: "neo-swal" },
        icon: "success",
        title: "Masukan terkirim",
        text: "Terima kasih atas masukan Anda.",
        confirmButtonColor: "#2f7dff",
      });
      setForm({ subjek: "", pesan: "" });
    } catch (err) {
      console.error("[Masukan.handleSubmit]", err);
      Swal.fire({
        customClass: { popup: "neo-swal" },
        icon: "error",
        title: "Gagal mengirim",
        text: err.response?.data?.message || "Terjadi kesalahan saat mengirim masukan.",
        confirmButtonColor: "#2f7dff",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Masukan"
        subtitle="Sampaikan saran atau kendala penggunaan Web"
      />

      <div className="glass-card panel" style={{ maxWidth: 640 }}>
        <form className="form-neo" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="subjek">Subjek</label>
            <input
              id="subjek"
              value={form.subjek}
              onChange={(e) =>
                setForm((f) => ({ ...f, subjek: e.target.value }))
              }
              placeholder="Contoh: Saran fitur export PDF"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pesan">Pesan</label>
            <textarea
              id="pesan"
              rows={5}
              value={form.pesan}
              onChange={(e) =>
                setForm((f) => ({ ...f, pesan: e.target.value }))
              }
              placeholder="Tuliskan masukan Anda di sini..."
              required
            />
          </div>
          <button type="submit" className="btn-neo primary" disabled={sending}>
            <Send size={16} />
            {sending ? "Mengirim..." : "Kirim Masukan"}
          </button>
        </form>
      </div>
    </div>
  );
}
