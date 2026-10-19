import multer from 'multer';
import { fromBuffer } from 'file-type';
import { Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/security';

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: securityConfig.maxUploadSizeBytes },
});

export const validateMagicBytes = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) return next();

  const detected = await fromBuffer(req.file.buffer);
  if (!detected || !securityConfig.allowedMimeTypes.includes(detected.mime)) {
    return res.status(400).json({ error: 'Invalid file content: Untrusted MIME signature' });
  }

  next();
};
