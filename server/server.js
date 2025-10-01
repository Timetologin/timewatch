const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 4000;

// Serve static files from the client
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Health check
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// API routes (אם יש לך בעתיד)

// Start server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
