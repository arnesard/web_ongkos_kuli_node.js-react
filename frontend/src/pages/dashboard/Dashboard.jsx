import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import KapasitasKuliCard from "./KapasitasKuliCard";
import SkemaPembayaranCard from "./SkemaPembayaranCard";
import UsiaKuliCard from "./UsiaKuliCard";
import BonSementaraCard from "./BonSementaraCard";
import WarehouseSparkCard from "./WarehouseSparkCard";

// TODO (fase backend): ganti dengan hasil query nominalHariIni / persentaseHariIni /
// sparklineData per warehouse dari DashboardController@index
const warehouseSpark = [
  {
    warehouse: "DPW",
    nominal: 5500000,
    persen: 0,
    trend: [4, 6, 5, 8, 6, 7, 6, 5, 7, 6],
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <div className="dash-grid">
        {/* Kolom kiri: Kapasitas Kuli + Kuli Unperform */}
        <div className="dash-col-left">
          <KapasitasKuliCard />
        </div>

        {/* Kolom kanan */}
        <div className="dash-col-right">
          <div className="spark-row">
            {warehouseSpark.map((wh) => (
              <WarehouseSparkCard key={wh.warehouse} {...wh} />
            ))}
          </div>

          <div className="dash-mid-row">
            <div className="dash-mid-col-4">
              <SkemaPembayaranCard />
            </div>
            <div className="dash-mid-col-8">
              <UsiaKuliCard />
              <BonSementaraCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
