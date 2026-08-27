import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Lock, LogIn } from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO (fase backend): panggil POST /api/auth/login (samakan query dengan AuthController Laravel)
      await login(username, password);
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      Swal.fire({
        customClass: { popup: "neo-swal" },
        icon: "error",
        title: "Login gagal",
        text: err.message || "Username atau password salah",
        confirmButtonColor: "#2f7dff",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-grid-bg" />
      <div className="login-card">
        <div className="login-logo">
          <img src="/images/logo-gt.png" alt="Logo GT" width={40} height={40} />
        </div>
        <h5>PT GAJAH TUNGGAL TBK</h5>
        <div className="subtitle">Logistik Ongkos Kuli</div>

        <form className="form-neo" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <div className="input-icon-wrap">
              <User size={16} />
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                required
                autoFocus
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-icon-wrap">
              <Lock size={16} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-neo primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
            disabled={loading}
          >
            <LogIn size={16} />
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="login-footer">© 2026 SCM & Logistic Department </div>
      </div>
    </div>
  );
}
