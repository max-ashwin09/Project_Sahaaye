import { Request, Response } from 'express';
import { createModerationAction } from '../actions';
import { ModerationTargetType } from '@sahaaye/shared';

export interface ExecuteTakedownParams {
  moderatorId: string;
  moderatorRole?: string;
  targetType: 'NEED' | 'MEDIA';
  targetId: string;
  reason: string;
  ipAddress?: string;
}

export const executeContentTakedown = async (params: ExecuteTakedownParams) => {
  return await createModerationAction({
    moderatorId: params.moderatorId,
    moderatorRole: params.moderatorRole || 'MODERATOR',
    targetType: params.targetType as ModerationTargetType,
    targetId: params.targetId,
    action: 'CONTENT_TAKEDOWN',
    reason: params.reason,
    ipAddress: params.ipAddress,
  });
};

export const takedownHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { targetType, targetId, reason } = req.body;
    const action = await executeContentTakedown({
      moderatorId: req.user.id,
      moderatorRole: req.user.role,
      targetType,
      targetId,
      reason,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      message: `Content [${targetType} ${targetId}] taken down successfully.`,
      action,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
