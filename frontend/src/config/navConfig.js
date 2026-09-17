// Struktur ini sengaja dibuat mengikuti grouping accordion sidebar Laravel
// (resources/views/components/sidebar.blade.php) supaya migrasi 1:1.
// icon: nama icon dari lucide-react

export const navConfig = [
  {
    type: "single",
    key: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard",
  },
  {
    type: "group",
    key: "entry-reguler",
    label: "Entry Ongkos Reguler",
    icon: "ClipboardList",
    // Sesuai matrix akses: role SH & DH cuma lihat Dashboard & Management
    hideForRoles: ["SH", "DH"],
    children: [
      {
        key: "bon-sementara",
        label: "Permintaan Bon Sementara",
        path: "/bon-sementara",
      },
      {
        key: "muat-fg",
        label: "Muat Barang FG Warehouse",
        path: "/muat-fg",
        // AdminJMW (gudang RM) gak perlu Muat FG
        hideForAdminWarehouses: ["JMW"],
      },
      {
        key: "bongkar-rm",
        label: "Bongkar Muat Barang RM Warehouse",
        path: "/bongkar-rm",
        // Cuma AdminJMW yang boleh lihat; Admin gudang FG (BPW/APW/DPW/RPW) gak perlu
        hideForAdminWarehouses: ["BPW", "APW", "DPW", "RPW"],
      },
    ],
  },
  {
    type: "group",
    key: "entry-nonreguler",
    label: "Entry Ongkos Non Reguler",
    icon: "PackagePlus",
    hideForRoles: ["SH", "DH"],
    children: [
      { key: "uang-makan", label: "Uang Makan Kuli", path: "/uang-makan" },
      {
        key: "susun-tire",
        label: "Susun Tire Lantai/Rak",
        path: "/susun-tire",
        // AdminJMW gak perlu Susun Tire Lantai/Rak
        hideForAdminWarehouses: ["JMW"],
      },
      {
        key: "pemindahan-barang",
        label: "Pemindahan Barang",
        path: "/pemindahan-barang",
      },
      // { key: "bongkar-luar", label: "Bongkar Luar", path: "/bongkar-luar" },
    ],
  },
  {
    type: "group",
    key: "management",
    label: "Management",
    icon: "ShieldCheck",
    children: [
      {
        key: "approve-bongkarmuat",
        label: "Approve Bongkarmuat",
        path: "/approve-bongkarmuat",
      },
      {
        key: "performance-kuli",
        label: "Performance Kuli",
        path: "/performance-kuli",
      },
      { key: "balance-cash", label: "Balance Cash", path: "/balance-cash" },
    ],
  },
  {
    type: "group",
    key: "master",
    label: "Master Data",
    icon: "Database",
    hideForRoles: ["SH", "DH"],
    children: [
      { key: "daftar-kuli", label: "Daftar Nama Kuli", path: "/daftar-kuli" },
      // Semua login Admin (AdminBPW/APW/DPW/RPW/JMW) cuma boleh lihat Daftar Nama Kuli
      {
        key: "harga-um",
        label: "Harga Uang Makan",
        path: "/harga-um",
        hideForRoles: ["Admin"],
      },
      {
        key: "kendaraan-fg",
        label: "Kendaraan FG Warehouse",
        path: "/kendaraan-fg",
        hideForRoles: ["Admin"],
      },
      {
        key: "jenis-barang",
        label: "Jenis Barang RM Warehouse",
        path: "/jenis-barang",
        hideForRoles: ["Admin"],
      },
      {
        key: "data-user",
        label: "Data User",
        path: "/data-user",
        hideForRoles: ["Admin"],
      },
    ],
  },
  {
    type: "group",
    key: "bantuan-masukan",
    label: "Bantuan & Masukan",
    icon: "LifeBuoy",
    children: [
      { key: "bantuan", label: "Bantuan", path: "/bantuan" },
      { key: "masukan", label: "Masukan", path: "/masukan" },
    ],
  },
];
