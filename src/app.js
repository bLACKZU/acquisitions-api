// Setting up express application with right middleware

import express from 'express';
import logger from './config/logger';

const app = express();

app.get('/', (req, res) => {
  logger.info('Hello from Acquisitions API');
  res.status(200).send('Hello from API !');
});

export default app;
