import { Request, Response, NextFunction } from 'express';
import { dbPool } from '../config/database';

export const requireConsent = (purpose: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await dbPool.query(
      `SELECT granted FROM consent_records WHERE user_id = $1 AND purpose = $2`,
      [req.user.id, purpose]
    );

    if (!result.rows[0]?.granted) {
      return res.status(403).json({
        error: 'Consent Required',
        purpose,
        message: 'You must grant consent for this action under DPDP guidelines.',
      });
    }

    next();
  };
};
