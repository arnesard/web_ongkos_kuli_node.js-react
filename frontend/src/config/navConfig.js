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
    children: [
      { key: "bon-sementara", label: "Permintaan Bon Sementara", path: "/bon-sementara" },
      { key: "muat-fg", label: "Muat Barang FG Warehouse", path: "/muat-fg" },
      { key: "bongkar-rm", label: "Bongkar Muat Barang RM Warehouse", path: "/bongkar-rm" },
    ],
  },
  {
    type: "group",
    key: "entry-nonreguler",
    label: "Entry Ongkos Non Reguler",
    icon: "PackagePlus",
    children: [
      { key: "uang-makan", label: "Uang Makan Kuli", path: "/uang-makan" },
      { key: "susun-tire", label: "Susun Tire Lantai/Rak", path: "/susun-tire" },
      { key: "pemindahan-barang", label: "Pemindahan Barang", path: "/pemindahan-barang" },
      { key: "bongkar-luar", label: "Bongkar Luar", path: "/bongkar-luar" },
    ],
  },
  {
    type: "group",
    key: "management",
    label: "Management",
    icon: "ShieldCheck",
    children: [
      { key: "approve-bongkarmuat", label: "Approve Bongkarmuat", path: "/approve-bongkarmuat" },
      { key: "performance-kuli", label: "Performance Kuli", path: "/performance-kuli" },
      { key: "balance-cash", label: "Balance Cash", path: "/balance-cash" },
    ],
  },
  {
    type: "group",
    key: "master",
    label: "Master Data",
    icon: "Database",
    children: [
      { key: "daftar-kuli", label: "Daftar Nama Kuli", path: "/daftar-kuli" },
      { key: "harga-um", label: "Harga Uang Makan", path: "/harga-um" },
      { key: "kendaraan-fg", label: "Kendaraan FG Warehouse", path: "/kendaraan-fg" },
      { key: "jenis-barang", label: "Jenis Barang RM Warehouse", path: "/jenis-barang" },
      { key: "data-user", label: "Data User", path: "/data-user" },
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
