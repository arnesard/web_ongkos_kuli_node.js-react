import axios from "axios";

// Ganti VITE_API_URL di file .env frontend kalau backend jalan di host/port lain.
// Contoh .env: VITE_API_URL=http://10.129.48.179:8000/api
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8099/api";

const api = axios.create({ baseURL });

const TOKEN_KEY = "loki_token";

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("loki_auth_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export { TOKEN_KEY };
export default api;
