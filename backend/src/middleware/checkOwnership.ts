import { Request, Response, NextFunction } from 'express';

export const checkOwnership = (resourceUserIdExtractor: (req: Request) => Promise<string | null>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Admins and Moderators can bypass ownership checks
    if (['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return next();
    }

    const ownerId = await resourceUserIdExtractor(req);
    if (!ownerId || ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this resource' });
    }

    next();
  };
};
