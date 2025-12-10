// Setting up express application with right middleware

import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Hello from API !');
});

export default app;
