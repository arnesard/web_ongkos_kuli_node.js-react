const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../../config/db");
const { ok, fail } = require("../../utils/response");

// Samain dengan AuthController@login (Laravel):
// - cari user di data_user_tbl berdasarkan kolom `user`
// - cek password pakai Hash::check (bcrypt) -> bcryptjs di sini
// - kalau sukses, Laravel simpan ke Session::put('user', $user)
//   di sini kita generate JWT yang isinya sama persis field-nya.
async function login(req, res) {
  const { user, password } = req.body;

  if (!user || !password) {
    return fail(res, "Username dan password wajib diisi.", 422);
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, nip, nama, level, user, email, warehouse, password FROM data_user_tbl WHERE user = ? LIMIT 1",
      [user]
    );

    console.log(`[login DEBUG] mencari user='${user}' -> ditemukan ${rows.length} baris`);

    if (rows.length === 0) {
      return fail(res, "Username atau password salah!", 401);
    }

    const dbUser = rows[0];
    console.log(`[login DEBUG] password hash di DB: ${dbUser.password?.slice(0, 10)}... (panjang: ${dbUser.password?.length})`);

    const passwordMatch = await bcrypt.compare(password, dbUser.password);
    console.log(`[login DEBUG] password cocok? ${passwordMatch}`);

    if (!passwordMatch) {
      return fail(res, "Username atau password salah!", 401);
    }

    const payload = {
      id: dbUser.id,
      nip: dbUser.nip,
      nama: dbUser.nama,
      level: dbUser.level,
      user: dbUser.user,
      email: dbUser.email,
      warehouse: dbUser.warehouse,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    });

    return ok(res, { token, user: payload }, "Login berhasil!");
  } catch (err) {
    console.error("[login] error:", err);
    return fail(res, "Hubungi SuperUser Untuk Hashing !!!", 500);
  }
}

// Logout di sisi JWT cukup ditangani di frontend (buang token dari localStorage).
// Endpoint ini disediakan supaya polanya tetap sama dengan route Laravel (/logout).
function logout(req, res) {
  return ok(res, null, "Logout berhasil.");
}

// GET /api/auth/me — untuk validasi token & hydrate ulang AuthContext di frontend
function me(req, res) {
  return ok(res, { user: req.user }, "OK");
}

module.exports = { login, logout, me };
