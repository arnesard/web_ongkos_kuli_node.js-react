require("dotenv").config();
const express = require("express");
const cors = require("cors");

const apiRoutes = require("./src/routes");
const { fail } = require("./src/utils/response");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    message: "API Running - Logistik Ongkos Kuli (Node.js + Express)",
  });
});

// Semua endpoint aplikasi ada di bawah prefix /api
// (samain strukturnya dengan routes/web.php di project Laravel)
app.use("/api", apiRoutes);

// 404 handler
app.use((req, res) => {
  return fail(
    res,
    `Route ${req.method} ${req.originalUrl} tidak ditemukan.`,
    404,
  );
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[unhandled error]", err);
  return fail(res, "Terjadi kesalahan pada server.", 500);
});

const PORT = process.env.PORT || 8099;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
