import { useState } from "react";
import Swal from "sweetalert2";
import { Send } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

export default function Masukan() {
  const [form, setForm] = useState({ subjek: "", pesan: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO (fase backend): POST /api/masukan
    Swal.fire({
      customClass: { popup: "neo-swal" },
      icon: "success",
      title: "Masukan terkirim",
      text: "Terima kasih atas masukan Anda.",
      confirmButtonColor: "#2f7dff",
    });
    setForm({ subjek: "", pesan: "" });
  };

  return (
    <div>
      <PageHeader title="Masukan" subtitle="Sampaikan saran atau kendala penggunaan aplikasi" />

      <div className="glass-card panel" style={{ maxWidth: 640 }}>
        <form className="form-neo" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="subjek">Subjek</label>
            <input
              id="subjek"
              value={form.subjek}
              onChange={(e) => setForm((f) => ({ ...f, subjek: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, pesan: e.target.value }))}
              placeholder="Tuliskan masukan Anda di sini..."
              required
            />
          </div>
          <button type="submit" className="btn-neo primary">
            <Send size={16} />
            Kirim Masukan
          </button>
        </form>
      </div>
    </div>
  );
}
