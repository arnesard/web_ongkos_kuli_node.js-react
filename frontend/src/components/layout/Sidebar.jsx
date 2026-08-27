import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  PackagePlus,
  ShieldCheck,
  Database,
  LifeBuoy,
  ChevronDown,
  LogOut,
  Truck,
} from "lucide-react";
import { navConfig } from "../../config/navConfig";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

const ICONS = {
  LayoutDashboard,
  ClipboardList,
  PackagePlus,
  ShieldCheck,
  Database,
  LifeBuoy,
};

export default function Sidebar({ open, onClose, pendingCount = 0 }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const activeGroupKey = navConfig.find(
    (g) =>
      g.type === "group" &&
      g.children.some((c) => c.path === location.pathname),
  )?.key;

  const [openGroup, setOpenGroup] = useState(activeGroupKey);

  const handleLogout = () => {
    Swal.fire({
      title: "Konfirmasi Logout",
      text: "Yakin ingin keluar dari aplikasi Logistik Ongkos Kuli?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Logout Sekarang",
      cancelButtonText: "Batal",
      customClass: { popup: "neo-swal" },
      confirmButtonColor: "#ff5470",
      cancelButtonColor: "#1e2a45",
    }).then((res) => {
      if (res.isConfirmed) logout();
    });
  };

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">
          <img src="/images/logo-gt.png" alt="Logo GT" width={40} height={40} />
        </div>
        <h1>LOGISTIK ONGKOS KULI</h1>
        <p>LOLI Control Panel</p>
        <div className="sidebar-user">
          <b>{user?.nama || "Guest"}</b>
          <div>{user?.warehouse || "-"}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navConfig.map((item) => {
          if (item.type === "single") {
            const Icon = ICONS[item.icon];
            return (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `nav-single${isActive ? " active" : ""}`
                }
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          }

          const Icon = ICONS[item.icon];
          const isOpen = openGroup === item.key;
          const isGroupActive = item.children.some(
            (c) => c.path === location.pathname,
          );
          const showBadge = item.key === "management" && pendingCount > 0;

          return (
            <div className="nav-group" key={item.key}>
              <button
                type="button"
                className={`nav-group-btn${isGroupActive ? " active" : ""}`}
                onClick={() => setOpenGroup(isOpen ? null : item.key)}
              >
                <Icon size={17} />
                {item.label}
                {showBadge && (
                  <span className="badge-count">{pendingCount}</span>
                )}
                <ChevronDown
                  size={15}
                  className={`chevron${isOpen ? " open" : ""}`}
                />
              </button>
              <div className={`nav-subitems${isOpen ? " open" : ""}`}>
                {item.children.map((child) => (
                  <NavLink
                    key={child.key}
                    to={child.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `nav-sublink${isActive ? " active" : ""}`
                    }
                  >
                    {child.label}
                    {child.key === "approve-bongkarmuat" &&
                      pendingCount > 0 && (
                        <span className="badge-count">{pendingCount}</span>
                      )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-logout">
        <button
          className="btn-neo danger"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
