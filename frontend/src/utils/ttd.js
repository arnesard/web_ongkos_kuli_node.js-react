// Ambil alamat backend dari VITE_API_URL, buang suffix "/api"-nya
// biar dapet origin polos buat akses folder /uploads
const ASSET_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8099/api"
).replace(/\/api\/?$/, "");

export function ttdSrc(nama, v) {
  return `${ASSET_BASE_URL}/uploads/ttd/${encodeURIComponent(nama)}.png${v ? `?v=${v}` : ""}`;
}
