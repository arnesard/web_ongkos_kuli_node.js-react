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

// open: true = sidebar penuh (lengkap teks). false = mengecil (icon doang).
// onExpand: dipanggil buat melebarin sidebar (klik item apapun pas lagi kecil).
// onCollapse: dipanggil setelah navigasi lewat menu (klik item pas lagi lebar).
export default function Sidebar({
  open,
  onExpand,
  onCollapse,
  pendingCount = 0,
}) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const visibleNav = navConfig.filter(
    (item) => !(item.hideForRoles || []).includes(user?.level),
  );

  const activeGroupKey = visibleNav.find(
    (g) =>
      g.type === "group" &&
      g.children.some((c) => c.path === location.pathname),
  )?.key;

  const [openGroup, setOpenGroup] = useState(activeGroupKey);

  const handleLogout = () => {
    Swal.fire({
      title: "Konfirmasi Logout",
      text: "Yakin ingin keluar dari Web Logistik Ongkos Kuli?",
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

  // Pas lagi kecil (collapsed), klik di mana aja area sidebar langsung melebarin,
  // nggak perlu pas-pasan ngeklik iconnya doang.
  const handleSidebarClick = () => {
    if (!open) onExpand();
  };

  return (
    <aside
      className={`sidebar${open ? "" : " collapsed"}`}
      onClick={handleSidebarClick}
    >
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
        {visibleNav.map((item) => {
          if (item.type === "single") {
            const Icon = ICONS[item.icon];
            const isActive = location.pathname === item.path;

            // Sidebar lagi kecil -> klik cuma buat melebarin, BUKAN navigasi
            // (biar nggak kepencet nyasar pas lagi mode icon-only).
            if (!open) {
              return (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  className={`nav-single${isActive ? " active" : ""}`}
                  onClick={onExpand}
                >
                  <Icon size={17} />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            }

            // Sidebar lagi lebar -> navigasi beneran, terus otomatis mengecil lagi
            return (
              <NavLink
                key={item.key}
                to={item.path}
                title={item.label}
                onClick={onCollapse}
                className={({ isActive: navActive }) =>
                  `nav-single${navActive ? " active" : ""}`
                }
              >
                <Icon size={17} />
                <span className="nav-label">{item.label}</span>
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
                title={item.label}
                className={`nav-group-btn${isGroupActive ? " active" : ""}`}
                onClick={() =>
                  open ? setOpenGroup(isOpen ? null : item.key) : onExpand()
                }
              >
                <Icon size={17} />
                <span className="nav-label">{item.label}</span>
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
                    onClick={onCollapse}
                    className={({ isActive }) =>
                      `nav-sublink${isActive ? " active" : ""}`
                    }
                  >
                    <span className="nav-label">{child.label}</span>
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
          onClick={(e) => {
            e.stopPropagation();
            handleLogout();
          }}
        >
          <LogOut size={16} style={{ transform: "scaleX(-1)" }} />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
