const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 4000;

// path לתיקיית dist שנמצאת מחוץ ל־server
const clientDistPath = path.join(__dirname, "..", "client", "dist");

// משרת את הקבצים מה־dist
app.use(express.static(clientDistPath));

// תופס את כל הנתיבים ומחזיר את index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
