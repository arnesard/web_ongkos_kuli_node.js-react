const jwt = require("jsonwebtoken");
const { fail } = require("../utils/response");

/**
 * Samain fungsinya dengan middleware `auth.session` di Laravel:
 * di Laravel session('user') berisi objek DataUser (nip, nama, level, user, email, warehouse).
 * Di sini kita taruh payload yang sama di dalam JWT, jadi req.user punya field yang sama persis.
 */
function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return fail(res, "Sesi tidak ditemukan. Silakan login kembali.", 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, nip, nama, level, user, email, warehouse }
    next();
  } catch (err) {
    return fail(res, "Sesi tidak valid atau sudah kedaluwarsa.", 401);
  }
}

/**
 * Helper otorisasi warehouse — dipakai di banyak controller supaya sama
 * seperti pengecekan `$isSuperUser`, `$isHOD` di Laravel.
 */
function warehouseScope(user) {
  const warehouse = user?.warehouse || "";
  const isSuperUser = warehouse === "Super_User";
  const isHOD = warehouse === "HOD";
  return { warehouse, isSuperUser, isHOD, isHighLevel: isSuperUser || isHOD };
}

module.exports = { verifyToken, warehouseScope };
