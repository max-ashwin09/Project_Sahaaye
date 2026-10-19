import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { dbPool } from '../config/database';

export const auditLog = (action: string, entityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (res.statusCode < 400 && req.user) {
        const ipHash = crypto.createHash('sha256').update(req.ip || '').digest('hex');
        await dbPool.query(
          `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, ip_address_hash)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.user.id, req.user.role, action, entityType, ipHash]
        ).catch(err => console.error('Audit log write error:', err));
      }
    });
    next();
  };
};
