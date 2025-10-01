const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 4000;

// path לתיקיית dist שנמצאת מחוץ ל־server
const clientDistPath = path.join(__dirname, "..", "client", "dist");

// משרת את הקבצים מה־dist
app.use(express.static(clientDistPath));

// health check של Render
app.get("/", (req, res) => {
  res.send("OK");
});

// תופס את כל שאר הנתיבים
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
