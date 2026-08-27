import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "loli_auth_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  // TODO (fase backend): ganti dengan POST /api/auth/login
  const login = async (username, password) => {
    if (!username || !password) {
      throw new Error("Username dan password wajib diisi");
    }
    const fakeUser = {
      nama: username.toUpperCase(),
      warehouse: "WH JAKARTA",
      level: "ADMIN",
      username,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeUser));
    setUser(fakeUser);
    return fakeUser;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
