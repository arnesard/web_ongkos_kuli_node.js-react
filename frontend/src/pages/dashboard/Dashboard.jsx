import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { dashboardApi } from "../../api/endpoints";
import KapasitasKuliCard from "./KapasitasKuliCard";
import SkemaPembayaranCard from "./SkemaPembayaranCard";
import UsiaKuliCard from "./UsiaKuliCard";
import BonSementaraCard from "./BonSementaraCard";
import WarehouseSparkCard from "./WarehouseSparkCard";

// Samain dengan daftar warehouse di blade Laravel (welcome-dashboard-tabel.blade.php)
const WAREHOUSE_OPTIONS = ["APW", "BPW", "DPW", "RPW", "JMW"];

function toMillion(v) {
  return Math.round((Number(v) || 0) / 1000) / 1000; // Rp -> Juta, 3 desimal
}

// Samain dengan DashboardController::resolveWarehouseFilter (Laravel):
// isHighLevel = level user HOD/Superuser ATAU field warehouse-nya HOD/Super_User.
function isHighLevelUser(user) {
  const level = user?.level || "";
  const warehouse = user?.warehouse || "";
  return (
    ["HOD", "Superuser"].includes(level) ||
    ["Super_User", "HOD"].includes(warehouse)
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isHighLevel = isHighLevelUser(user);
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null); // null = semua (all)

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    dashboardApi
      .index(
        isHighLevel && selectedWarehouse
          ? { warehouse: selectedWarehouse }
          : undefined,
      )
      .then((data) => mounted && setDash(data))
      .catch((err) => console.error("[Dashboard] gagal memuat data:", err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [selectedWarehouse, isHighLevel]);

  if (loading) {
    return (
      <div
        className="empty-state"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Loader2 size={16} className="spin" /> Memuat dashboard...
      </div>
    );
  }

  if (!dash) {
    return (
      <div className="empty-state">
        Gagal memuat data dashboard. Cek koneksi ke backend.
      </div>
    );
  }

  // ---- Transform: Kapasitas Kuli (dataAktual per tanggal) ----
  const aktualEntries = Object.entries(dash.dataAktual || {}).sort(
    ([a], [b]) => (a < b ? -1 : 1),
  );
  const kapasitasLabels = aktualEntries.map(([tgl]) => tgl.slice(-2)); // tanggal saja
  const totalKuli = dash.totalKuli || 0;
  const kuliDatang = aktualEntries.map(([, v]) => v);
  const kuliTidakDatang = aktualEntries.map(([, v]) =>
    Math.max(totalKuli - v, 0),
  );

  const unperformData = (dash.dataKuliUnperform || []).map((k) => ({
    dept: k.department,
    nama: k.nama_kuli,
    hadir: k.hadir_hari,
    total: k.days_in_month || dash.daysInMonth || 0,
  }));

  // ---- Transform: Skema Pembayaran Kuli (hari ini) ----
  const skemaPembayaran = dash.dataSkemaPembayaran || [];

  // ---- Transform: Usia kuli ----
  const mapUsia = (arr = []) =>
    arr.map((k) => ({ dept: k.department, nama: k.nama_kuli, usia: k.usia }));

  // ---- Transform: Rekap Bon Sementara vs Aktual (agregat lintas warehouse per tanggal) ----
  // "Uang Dari Cashier" pakai act_nilai (yg BENERAN dicairkan cashier), bukan nilai
  // (yg cuma diajukan) — samain dgn Laravel. Selisih = Cashier (act_nilai) - Aktual (total_transaksi).
  const rekapByTgl = {};
  (dash.rekap || []).forEach((r) => {
    rekapByTgl[r.tgl] = rekapByTgl[r.tgl] || {
      total_aktual: 0,
      total_transaksi: 0,
    };
    rekapByTgl[r.tgl].total_aktual += Number(r.total_aktual || 0);
    rekapByTgl[r.tgl].total_transaksi += Number(r.total_transaksi || 0);
  });
  const rekapSorted = Object.entries(rekapByTgl).sort(([a], [b]) =>
    a < b ? -1 : 1,
  );
  const rekapLabels = rekapSorted.map(([tgl]) => tgl.slice(-2));
  const rekapTotalTransaksi = rekapSorted.map(([, v]) =>
    toMillion(v.total_transaksi),
  );
  const rekapUangBon = rekapSorted.map(([, v]) => toMillion(v.total_aktual));
  const rekapSelisih = rekapSorted.map(([, v]) =>
    toMillion(v.total_aktual - v.total_transaksi),
  );

  // ---- Transform: Warehouse spark ----
  const warehouseList = Object.keys(dash.nominalHariIni || {});
  const warehouseSpark = warehouseList.map((wh) => ({
    warehouse: wh,
    nominal: dash.nominalHariIni?.[wh] || 0,
    persen: dash.persentaseHariIni?.[wh] || 0,
    trend: dash.sparklineData?.[wh]?.length ? dash.sparklineData[wh] : [0],
  }));
  // Card TOTAL cuma tampil pas admin/HOD lihat "ALL" (belum milih warehouse spesifik)
  // dan warehouse-nya lebih dari satu — samain dgn Laravel.
  const showTotalCard =
    isHighLevel && !selectedWarehouse && warehouseSpark.length > 1;

  return (
    <div className="dashboard-page">
      <PageHeader title={`Selamat datang, ${user?.nama || "User"}`} />

      {isHighLevel && (
        <div className="dash-warehouse-filter">
          <h2>DASHBOARD WAREHOUSE - {selectedWarehouse || "ALL"}</h2>
          <div className="dash-warehouse-filter-buttons">
            {WAREHOUSE_OPTIONS.map((wh) => (
              <button
                key={wh}
                type="button"
                className={`btn-neo sm${selectedWarehouse === wh ? " primary" : " ghost"}`}
                onClick={() => setSelectedWarehouse(wh)}
              >
                {wh}
              </button>
            ))}
            <button
              type="button"
              className="btn-neo sm danger"
              onClick={() => setSelectedWarehouse(null)}
            >
              Reset Filter
            </button>
          </div>
        </div>
      )}

      <div className="dash-grid">
        <div className="dash-col-left">
          <KapasitasKuliCard
            labels={kapasitasLabels}
            kuliDatang={kuliDatang}
            kuliTidakDatang={kuliTidakDatang}
            unperformData={unperformData}
          />
        </div>

        <div className="dash-col-right">
          {(warehouseSpark.length > 0 || showTotalCard) && (
            <div
              className={`spark-row${isHighLevel ? " spark-row-compact" : ""}`}
            >
              {showTotalCard && (
                <WarehouseSparkCard
                  warehouse="HARI INI"
                  nominal={dash.totalBonSementara?.nominal || 0}
                  persen={dash.totalBonSementara?.persen || 0}
                  trend={
                    dash.totalBonSementara?.trend?.length
                      ? dash.totalBonSementara.trend
                      : [0]
                  }
                  isTotal
                />
              )}
              {warehouseSpark.map((wh) => (
                <WarehouseSparkCard key={wh.warehouse} {...wh} />
              ))}
            </div>
          )}

          <div className="dash-mid-row">
            <div className="dash-mid-col-4">
              <SkemaPembayaranCard data={skemaPembayaran} />
            </div>
            <div className="dash-mid-col-8">
              <UsiaKuliCard
                muda={mapUsia(dash.kuliUsiaDibawah35)}
                produktif={mapUsia(dash.kuliUsiaProduktif)}
                senior={mapUsia(dash.kuliUsiaSenior)}
              />
              <BonSementaraCard
                labels={rekapLabels}
                totalTransaksi={rekapTotalTransaksi}
                uangBon={rekapUangBon}
                selisih={rekapSelisih}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
