import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export const appDownloadRouter = Router();

/**
 * Helper to locate the freshest APK file across project directories
 */
function getLatestApkInfo() {
  const candidatePaths = [
    path.resolve(process.cwd(), 'storage/downloads/sahaaye-latest.apk'),
    path.resolve(process.cwd(), 'android/app/build/outputs/apk/debug/app-debug.apk'),
    path.resolve(process.cwd(), 'android/app/build/outputs/apk/release/app-release-unsigned.apk'),
    path.resolve(__dirname, '../../../../storage/downloads/sahaaye-latest.apk'),
    path.resolve(__dirname, '../../../../android/app/build/outputs/apk/debug/app-debug.apk'),
  ];

  let freshestFile: { path: string; stat: fs.Stats } | null = null;

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isFile() && stat.size > 1000) {
          if (!freshestFile || stat.mtimeMs > freshestFile.stat.mtimeMs) {
            freshestFile = { path: p, stat };
          }
        }
      }
    } catch {
      // Ignore access errors on missing paths
    }
  }

  return freshestFile;
}

/**
 * GET /api/v1/app/info
 * Returns metadata about the latest available Android APK build
 */
appDownloadRouter.get('/info', (_req: Request, res: Response) => {
  const apkInfo = getLatestApkInfo();

  if (!apkInfo) {
    return res.status(404).json({
      success: false,
      message: 'No APK build found. Please build the Android project first.',
    });
  }

  const sizeMb = (apkInfo.stat.size / (1024 * 1024)).toFixed(1);

  return res.status(200).json({
    success: true,
    appName: 'SAHAAYE Community Aid',
    packageName: 'com.sahaaye',
    version: '1.0.0',
    fileName: 'Sahaaye-Latest.apk',
    fileSizeMb: `${sizeMb} MB`,
    fileSizeBytes: apkInfo.stat.size,
    lastUpdated: apkInfo.stat.mtime.toISOString(),
    downloadUrl: '/api/v1/app/download',
  });
});

/**
 * GET /api/v1/app/download
 * Directly downloads the latest Android APK
 */
appDownloadRouter.get('/download', (_req: Request, res: Response) => {
  const apkInfo = getLatestApkInfo();

  if (!apkInfo) {
    return res.status(404).json({
      success: false,
      message: 'APK file not available on the server yet. Please compile the Android project.',
    });
  }

  // Ensure fresh download, no stale browser cache
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="Sahaaye-Latest.apk"');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  return res.download(apkInfo.path, 'Sahaaye-Latest.apk', (err) => {
    if (err && !res.headersSent) {
      console.error('Error during APK download:', err);
      res.status(500).json({ success: false, message: 'Failed to download APK' });
    }
  });
});
