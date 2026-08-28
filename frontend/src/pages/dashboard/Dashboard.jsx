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

function toMillion(v) {
  return Math.round((Number(v) || 0) / 1000) / 1000; // Rp -> Juta, 3 desimal
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);

  useEffect(() => {
    let mounted = true;
    dashboardApi
      .index()
      .then((data) => mounted && setDash(data))
      .catch((err) => console.error("[Dashboard] gagal memuat data:", err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="empty-state" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Loader2 size={16} className="spin" /> Memuat dashboard...
      </div>
    );
  }

  if (!dash) {
    return <div className="empty-state">Gagal memuat data dashboard. Cek koneksi ke backend.</div>;
  }

  // ---- Transform: Kapasitas Kuli (dataAktual per tanggal) ----
  const aktualEntries = Object.entries(dash.dataAktual || {}).sort(([a], [b]) => (a < b ? -1 : 1));
  const kapasitasLabels = aktualEntries.map(([tgl]) => tgl.slice(-2)); // tanggal saja
  const totalKuli = dash.totalKuli || 0;
  const kuliDatang = aktualEntries.map(([, v]) => v);
  const kuliTidakDatang = aktualEntries.map(([, v]) => Math.max(totalKuli - v, 0));

  const unperformData = (dash.dataKuliUnperform || []).map((k) => ({
    dept: k.department,
    nama: k.nama_kuli,
    hadir: k.hadir_hari,
    total: k.days_in_month || dash.daysInMonth || 0,
  }));

  // ---- Transform: Trip kuli hari ini ----
  const tripLabels = dash.dataKuliTripHarian?.labels || [];
  const tripData = dash.dataKuliTripHarian?.data || [];

  // ---- Transform: Usia kuli ----
  const mapUsia = (arr = []) => arr.map((k) => ({ dept: k.department, nama: k.nama_kuli, usia: k.usia }));

  // ---- Transform: Rekap Bon Sementara vs Aktual (agregat lintas warehouse per tanggal) ----
  const rekapByTgl = {};
  (dash.rekap || []).forEach((r) => {
    rekapByTgl[r.tgl] = rekapByTgl[r.tgl] || { total_bon: 0, total_transaksi: 0 };
    rekapByTgl[r.tgl].total_bon += Number(r.total_bon || 0);
    rekapByTgl[r.tgl].total_transaksi += Number(r.total_transaksi || 0);
  });
  const rekapSorted = Object.entries(rekapByTgl).sort(([a], [b]) => (a < b ? -1 : 1));
  const rekapLabels = rekapSorted.map(([tgl]) => tgl.slice(-2));
  const rekapTotalTransaksi = rekapSorted.map(([, v]) => toMillion(v.total_transaksi));
  const rekapUangBon = rekapSorted.map(([, v]) => toMillion(v.total_bon));
  const rekapSelisih = rekapSorted.map(([, v]) => toMillion(v.total_bon - v.total_transaksi));

  // ---- Transform: Warehouse spark ----
  const warehouseList = Object.keys(dash.nominalHariIni || {});
  const warehouseSpark = warehouseList.map((wh) => ({
    warehouse: wh,
    nominal: dash.nominalHariIni?.[wh] || 0,
    persen: dash.persentaseHariIni?.[wh] || 0,
    trend: dash.sparklineData?.[wh]?.length ? dash.sparklineData[wh] : [0],
  }));

  return (
    <div>
      <PageHeader
        title={`Selamat datang, ${user?.nama || "User"}`}
        subtitle="Ringkasan aktivitas operasional ongkos kuli hari ini"
      />

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
          {warehouseSpark.length > 0 && (
            <div className="spark-row">
              {warehouseSpark.map((wh) => (
                <WarehouseSparkCard key={wh.warehouse} {...wh} />
              ))}
            </div>
          )}

          <div className="dash-mid-row">
            <div className="dash-mid-col-4">
              <SkemaPembayaranCard labels={tripLabels} data={tripData} />
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
