const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API Running",
  });
});

const PORT = 8000; // (Contoh, sesuaikan dengan port backend lu)

// Tambahkan '0.0.0.0' sebagai parameter kedua
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
