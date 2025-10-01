const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use('/audio', express.static(path.join(__dirname, 'audio')));

app.listen(port, () => {
  console.log(`Audio server running at http://localhost:${port}`);
});