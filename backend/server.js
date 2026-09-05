import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import config from './config/index.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import investigateRoutes from './routes/investigate.js';
import fraudRoutes from './routes/fraud.js';
import transactionRoutes from './routes/transactions.js';
import analyticsRoutes from './routes/analytics.js';
import monitoringRoutes from './routes/monitoring.js';
import authRoutes from './routes/auth.js';
import investigationsRoutes from './routes/investigations.js';

const app = express();
const PORT = config.PORT;

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isVercelOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
    if (config.CORS_ORIGINS.includes(origin) || config.CORS_ORIGINS.includes('*') || isVercelOrigin) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: true,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      request_id: req.requestId,
    });
  },
}));

app.get('/', (req, res) => {
  res.json({
    name: 'ChainTrace AI backend',
    status: 'ok',
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
    endpoints: ['/health', '/api/investigate', '/api/fraud-detection', '/api/transactions', '/api/analytics', '/api/monitoring'],
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok', mode: config.DEMO_MODE ? 'DEMO' : 'LIVE' }));

app.use('/api/auth', authRoutes);
app.use('/api/investigations', investigationsRoutes);
app.use('/api/investigate', investigateRoutes);
app.use('/api/fraud-detection', fraudRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitoring', monitoringRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ChainTrace AI backend running on http://localhost:${PORT}`);
  console.log(`Demo mode: ${config.DEMO_MODE ? 'enabled' : 'disabled'}`);
});
