import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Loader2, Trash2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import NeoTable from "../../components/common/NeoTable";
import { masukanApi } from "../../api/endpoints";

const swalDark = {
  customClass: { popup: "neo-swal" },
  confirmButtonColor: "#2f7dff",
  cancelButtonColor: "#1e2a45",
};

function formatTglJam(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DaftarMasukan() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await masukanApi.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[DaftarMasukan.fetchData]", err);
      Swal.fire({
        ...swalDark,
        icon: "error",
        title: "Gagal memuat data",
        text: err.response?.data?.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = (row) => {
    Swal.fire({
      ...swalDark,
      icon: "warning",
      title: "Hapus masukan ini?",
      text: "Data yang sudah dihapus tidak dapat dikembalikan.",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ff5470",
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        await masukanApi.remove(row.id);
        await fetchData();
        Swal.fire({ ...swalDark, icon: "success", title: "Masukan dihapus", timer: 1200, showConfirmButton: false });
      } catch (err) {
        console.error("[DaftarMasukan.handleDelete]", err);
        Swal.fire({
          ...swalDark,
          icon: "error",
          title: "Gagal menghapus",
          text: err.response?.data?.message,
        });
      }
    });
  };

  const columns = [
    {
      name: "TANGGAL",
      selector: (r) => r.created_at,
      cell: (r) => formatTglJam(r.created_at),
      width: "150px",
      sortable: true,
    },
    { name: "PENGIRIM", selector: (r) => r.nama || "-", sortable: true },
    { name: "LEVEL", selector: (r) => r.level || "-", width: "100px" },
    { name: "WAREHOUSE", selector: (r) => r.warehouse || "-", width: "110px" },
    { name: "SUBJEK", selector: (r) => r.subjek, grow: 1.2 },
    {
      name: "PESAN",
      selector: (r) => r.pesan,
      grow: 2,
      wrap: true,
    },
    {
      name: "AKSI",
      width: "70px",
      cell: (row) => (
        <button
          className="icon-btn danger"
          title="Hapus"
          onClick={() => handleDelete(row)}
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Daftar Masukan"
        subtitle="Saran & kendala yang dikirim pengguna Web"
      />

      <div className="glass-card panel">
        {loading ? (
          <div
            className="empty-state"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Loader2 size={16} className="spin" /> Memuat data...
          </div>
        ) : (
          <NeoTable
            columns={columns}
            data={rows}
            searchableKeys={["nama", "subjek", "pesan", "warehouse"]}
            noDataText="Belum ada masukan yang masuk."
          />
        )}
      </div>
    </div>
  );
}
