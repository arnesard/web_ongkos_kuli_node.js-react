import { Menu, Wifi, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function Topbar({ title, subtitle, onToggleSidebar }) {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="menu-toggle" onClick={onToggleSidebar} aria-label="Toggle menu">
          <Menu size={18} />
        </button>
        <div>
          <h2>{title}</h2>
          {subtitle && <div className="topbar-sub">{subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-chip">
          <Clock size={14} />
          {now.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" })} ·{" "}
          {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="topbar-chip">
          <span className="dot" />
          {user?.warehouse || "Warehouse"}
        </div>
        <div className="topbar-chip">
          <Wifi size={14} />
          {user?.nama || "Guest"}
        </div>
      </div>
    </header>
  );
}
