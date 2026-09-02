import api from "./axiosClient";

// Setiap helper di bawah return `res.data.data` (payload asli dari backend),
// sesuai bentuk response { success, message, data } yang dipakai backend Node.js.

function makeCrudApi(basePath) {
  return {
    list: async (params) => (await api.get(basePath, { params })).data.data,
    create: async (payload) => (await api.post(basePath, payload)).data.data,
    update: async (id, payload) => (await api.put(`${basePath}/${id}`, payload)).data.data,
    remove: async (id) => (await api.delete(`${basePath}/${id}`)).data.data,
  };
}

// ==== Master Data ====
export const kuliApi = makeCrudApi("/master/kuli");
export const umApi = makeCrudApi("/master/um");
export const barangApi = makeCrudApi("/master/barang");
export const kendaraanApi = makeCrudApi("/master/kendaraan");
export const userApi = makeCrudApi("/master/user");

// ==== Entry Reguler ====
export const bonSementaraApi = {
  ...makeCrudApi("/entry-reguler/bon-sementara"),
  // override list: backend bon-sementara balikin objek { data, noDocs, ... }, bukan array langsung
  list: async (params) => (await api.get("/entry-reguler/bon-sementara", { params })).data.data.data,
  inputAktual: async (payload) => (await api.post("/entry-reguler/bon-sementara/input-aktual", payload)).data,
  // cari by no_doc -> butuh payload penuh (dataCari, totalNilai, totalActNilai, statusBS),
  // makanya nggak pakai `list()` di atas yang cuma ambil `.data.data.data`
  cariNoDoc: async (no_doc) =>
    (await api.get("/entry-reguler/bon-sementara", { params: { cari: 1, no_doc } })).data.data,
  // daftar no_doc yang sudah pernah diinput (buat dropdown/combobox), di-scope warehouse otomatis di backend
  noDocs: async () => (await api.get("/entry-reguler/bon-sementara")).data.data.noDocs,
  // data terbaru buat default tampilan modal cari (nggak kosong pas dibuka), opsional filter bulanKode (YYYY-MM,
  // dicocokin ke ekor no_doc format "/MM/YYYY", bukan kolom tgl)
  recent: async ({ limit = 20, bulanKode } = {}) =>
    (await api.get("/entry-reguler/bon-sementara/recent", { params: { limit, bulanKode } })).data.data.data,
};

export const muatFgApi = {
  ...makeCrudApi("/entry-reguler/muat-fg"),
  list: async (params) => (await api.get("/entry-reguler/muat-fg", { params })).data.data.datas,
  meta: async (params) => (await api.get("/entry-reguler/muat-fg", { params })).data.data,
};

export const bongkarRmApi = {
  ...makeCrudApi("/entry-reguler/bongkar-rm"),
  list: async (params) => (await api.get("/entry-reguler/bongkar-rm", { params })).data.data.datas,
  meta: async (params) => (await api.get("/entry-reguler/bongkar-rm", { params })).data.data,
};

// ==== Entry Non Reguler ====
export const uangMakanApi = {
  ...makeCrudApi("/entry-nonreguler/uang-makan"),
  list: async (params) => (await api.get("/entry-nonreguler/uang-makan", { params })).data.data.dataUangMakan,
  meta: async (params) => (await api.get("/entry-nonreguler/uang-makan", { params })).data.data,
};

export const susunTireApi = {
  ...makeCrudApi("/entry-nonreguler/susun-tire"),
  list: async (params) => (await api.get("/entry-nonreguler/susun-tire", { params })).data.data.datas,
  meta: async (params) => (await api.get("/entry-nonreguler/susun-tire", { params })).data.data,
  getLastKode: async (params) => (await api.get("/entry-nonreguler/susun-tire/last-kode", { params })).data.data,
};

export const pemindahanBarangApi = {
  ...makeCrudApi("/entry-nonreguler/pemindahan-barang"),
  list: async (params) => (await api.get("/entry-nonreguler/pemindahan-barang", { params })).data.data.dataPemindahan,
  meta: async (params) => (await api.get("/entry-nonreguler/pemindahan-barang", { params })).data.data,
};

// ==== Management ====
export const managementApi = {
  approveList: async (params) => (await api.get("/management/approve-bongkarmuat", { params })).data.data,
  approveProcess: async (noDoc, action) =>
    (await api.post(`/management/approve-bongkarmuat/${noDoc}`, { action })).data,
  performanceKuli: async (params) => (await api.get("/management/performance-kuli", { params })).data.data,
  balanceCash: async (params) => (await api.get("/management/balance-cash", { params })).data.data,
};

// ==== Dashboard ====
export const dashboardApi = {
  index: async (params) => (await api.get("/dashboard", { params })).data.data,
};

// ==== Helpers / Lookup ====
export const lookupApi = {
  customer: async (params) => (await api.get("/helpers/customer", { params })).data.data,
  kuliList: async () => (await api.get("/helpers/kuli-list")).data.data,
  getLastKode: async (params) => (await api.get("/helpers/get-last-kode", { params })).data.data,
  // { status: "found", data: {...} } | { status: "not_found" }
  getTripData: async (params) => (await api.get("/helpers/get-trip-data", { params })).data.data,
};
