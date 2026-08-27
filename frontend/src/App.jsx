import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";

import BonSementara from "./pages/entry-reguler/BonSementara";
import MuatFg from "./pages/entry-reguler/MuatFg";
import BongkarRm from "./pages/entry-reguler/BongkarRm";

import UangMakan from "./pages/entry-nonreguler/UangMakan";
import SusunTire from "./pages/entry-nonreguler/SusunTire";
import PemindahanBarang from "./pages/entry-nonreguler/PemindahanBarang";
import BongkarLuar from "./pages/entry-nonreguler/BongkarLuar";

import ApproveBongkarmuat from "./pages/management/ApproveBongkarmuat";
import PerformanceKuli from "./pages/management/PerformanceKuli";
import BalanceCash from "./pages/management/BalanceCash";

import DaftarKuli from "./pages/master/DaftarKuli";
import HargaUm from "./pages/master/HargaUm";
import JenisBarang from "./pages/master/JenisBarang";
import KendaraanFg from "./pages/master/KendaraanFg";
import DataUser from "./pages/master/DataUser";

import Bantuan from "./pages/bantuan/Bantuan";
import Masukan from "./pages/masukan/Masukan";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ==== Auth (public) — samakan dengan AuthController@showLogin/login ==== */}
          <Route path="/login" element={<Login />} />

          {/* ==== Semua route di bawah butuh session (samakan dengan middleware auth.session) ==== */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Entry Ongkos Reguler */}
            <Route path="/bon-sementara" element={<BonSementara />} />
            <Route path="/muat-fg" element={<MuatFg />} />
            <Route path="/bongkar-rm" element={<BongkarRm />} />

            {/* Entry Ongkos Non Reguler */}
            <Route path="/uang-makan" element={<UangMakan />} />
            <Route path="/susun-tire" element={<SusunTire />} />
            <Route path="/pemindahan-barang" element={<PemindahanBarang />} />
            <Route path="/bongkar-luar" element={<BongkarLuar />} />

            {/* Management */}
            <Route path="/approve-bongkarmuat" element={<ApproveBongkarmuat />} />
            <Route path="/performance-kuli" element={<PerformanceKuli />} />
            <Route path="/balance-cash" element={<BalanceCash />} />

            {/* Master Data */}
            <Route path="/daftar-kuli" element={<DaftarKuli />} />
            <Route path="/harga-um" element={<HargaUm />} />
            <Route path="/jenis-barang" element={<JenisBarang />} />
            <Route path="/kendaraan-fg" element={<KendaraanFg />} />
            <Route path="/data-user" element={<DataUser />} />

            {/* Bantuan & Masukan */}
            <Route path="/bantuan" element={<Bantuan />} />
            <Route path="/masukan" element={<Masukan />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
