import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import { navConfig } from "../config/navConfig";
import { useAuth } from "../context/AuthContext";
import { managementApi } from "../api/endpoints";

const SIDEBAR_KEY = "loli_sidebar_open";

// Notif merah "titik" di menu Management/Approve Bongkarmuat cuma buat level
// yang emang berjenjang approve-nya: SH -> DH -> HOD. Admin/superuser gak
// pernah approve/reject (lihat approveController.process: 403 buat admin),
// jadi gak perlu notif juga.
const LEVELS_WITH_NOTIF = ["sh", "dh", "hod"];

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
  // Ingat pilihan terakhir user (lebar/kecil) lewat localStorage.
  // Default: kebuka lebar di layar lebar, otomatis kecil di layar sempit (<=1100px).
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) return saved === "1";
    return typeof window !== "undefined" ? window.innerWidth > 1100 : true;
  });
  const location = useLocation();
  const meta = findPageMeta(location.pathname);
  const { user } = useAuth();

  const [pendingCount, setPendingCount] = useState(0);
  const canSeeNotif = LEVELS_WITH_NOTIF.includes(
    String(user?.level || "").toLowerCase(),
  );

  const refreshPendingCount = useCallback(async () => {
    if (!canSeeNotif) {
      setPendingCount(0);
      return;
    }
    try {
      // tab dikosongin -> backend cuma balikin pendingCounts (query ringan,
      // gak ikut hitung breakdown LPBS), sama query yg dipake badge BS/LPBS
      // di halaman Approve Bongkarmuat sendiri.
      const data = await managementApi.approveList({});
      const counts = data?.pendingCounts || { bs: 0, lpbs: 0 };
      setPendingCount(Number(counts.bs || 0) + Number(counts.lpbs || 0));
    } catch (err) {
      console.error("[MainLayout.refreshPendingCount]", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeNotif]);

  // Refresh pas pertama buka & tiap kali balik dari halaman approve (abis
  // approve/reject, count di sidebar ikut update), bukan cuma sekali di awal.
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount, location.pathname]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? "1" : "0");
  }, [sidebarOpen]);

  return (
    <div
      className={`app-shell${sidebarOpen ? "" : " sidebar-collapsed-shell"}`}
    >
      <Sidebar
        open={sidebarOpen}
        onExpand={() => setSidebarOpen(true)}
        onCollapse={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />
      <div className="content-area">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
