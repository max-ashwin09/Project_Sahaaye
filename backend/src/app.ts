import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { securityHeaders } from './middleware/securityHeaders';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import { moderationRouter } from './modules/moderation/router';

export const app = express();

app.use(securityHeaders);
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '1mb' }));
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Moderation & Community Safety Router
app.use('/api/v1/moderation', moderationRouter);

app.use(errorHandler);

