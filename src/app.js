// Setting up express application with right middleware

import express from 'express';
import logger from '#config/logger.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors'; // Cors lets your backend decide which external domains can make request to it, without it any domain can make request to your backend which is a security risk
import cookieParser from 'cookie-parser';
import authRoute from '#routes/auth.routes.js';
import securityMiddleware from '#middleware/security.middleware.js';
import usersRoute from '#routes/users.routes.js';


const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);
app.use(securityMiddleware);
app.use('/api/auth', authRoute);

app.get('/', (req, res) => {
  logger.info('Hello from Acquisitions API');
  res.status(200).send('Hello from API !');
});

app.get('/health', (req, res) => {
  res
    .status(200)
    .json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
});
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Running Acquisitions API !' });
});

app.use('/api/auth', authRoute);
app.use('/api/users', usersRoute);
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
