// Running the server, implement logging and everything related to server

import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`App is listening on http://localhost:${PORT}`);
});
