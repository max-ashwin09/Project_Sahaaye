import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { securityHeaders } from './middleware/securityHeaders';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import { moderationRouter } from './modules/moderation/router';
import { needsRouter } from './modules/needs';

export const app = express();

app.use(securityHeaders);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(apiLimiter);

// Ensure storage folder exists and mount static serving
const storageDir = path.resolve(process.env.STORAGE_LOCAL_PATH || './storage');
const needsStorageDir = path.join(storageDir, 'needs');
if (!fs.existsSync(needsStorageDir)) {
  fs.mkdirSync(needsStorageDir, { recursive: true });
}
app.use('/storage', express.static(storageDir));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Moderation & Community Safety Router
app.use('/api/v1/moderation', moderationRouter);

// Community Needs & Geo-Reporting Router
app.use('/api/v1/needs', needsRouter);

app.use(errorHandler);


