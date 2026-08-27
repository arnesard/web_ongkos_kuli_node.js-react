import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import { navConfig } from "../config/navConfig";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const meta = findPageMeta(location.pathname);

  // TODO (fase backend): ambil dari API notifikasi approval pending
  const pendingCount = 3;

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />
      <div className="content-area">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
        />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
