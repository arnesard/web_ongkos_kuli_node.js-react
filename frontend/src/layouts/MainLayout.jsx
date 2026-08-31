import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import { navConfig } from "../config/navConfig";

const SIDEBAR_KEY = "loli_sidebar_open";

function findPageMeta(pathname) {
  for (const item of navConfig) {
    if (item.type === "single" && item.path === pathname) {
      return { title: item.label, subtitle: null };
    }
    if (item.type === "group") {
      const found = item.children.find((c) => c.path === pathname);
      if (found) return { title: found.label, subtitle: item.label };
    }
  }
  return { title: "LOLI", subtitle: null };
}

export default function MainLayout() {
  // Ingat pilihan terakhir user (hide/unhide) lewat localStorage.
  // Default: kebuka di layar lebar, ketutup otomatis di layar sempit (<=1100px).
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) return saved === "1";
    return typeof window !== "undefined" ? window.innerWidth > 1100 : true;
  });
  const location = useLocation();
  const meta = findPageMeta(location.pathname);

  // TODO (fase backend): ambil dari API notifikasi approval pending
  const pendingCount = 3;

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? "1" : "0");
  }, [sidebarOpen]);

  return (
    <div className={`app-shell${sidebarOpen ? "" : " sidebar-hidden"}`}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />
      <div className="content-area">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
        />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
