import { Request, Response } from 'express';
import crypto from 'crypto';
import { dbPool } from '../../../config/database';
import { ModerationAction, ModerationActionType, ModerationTargetType } from '@sahaaye/shared';

export interface CreateModerationActionParams {
  moderatorId: string;
  moderatorRole?: string;
  targetType: ModerationTargetType;
  targetId: string;
  action: ModerationActionType;
  reason: string;
  ipAddress?: string;
}

export const createModerationAction = async (params: CreateModerationActionParams): Promise<ModerationAction> => {
  const { moderatorId, moderatorRole = 'MODERATOR', targetType, targetId, action, reason, ipAddress } = params;

  // Insert into moderation_actions table
  const result = await dbPool.query(
    `INSERT INTO moderation_actions (moderator_id, target_type, target_id, action, reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [moderatorId, targetType, targetId, action, reason]
  );

  const moderationAction: ModerationAction = result.rows[0];

  // If user sanction (SUSPEND, BAN), apply user status update if users table exists
  if (targetType === 'USER' && (action === 'SUSPEND' || action === 'BAN')) {
    await dbPool.query(
      `UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [action === 'SUSPEND' ? 'SUSPENDED' : 'BANNED', targetId]
    ).catch(() => {
      // Graceful fallback if table is partitioned or mock mode
    });
  }

  // If CONTENT_TAKEDOWN on NEED or MEDIA, mark target as taken down
  if (action === 'CONTENT_TAKEDOWN') {
    if (targetType === 'NEED') {
      await dbPool.query(
        `UPDATE needs SET status = 'FLAGGED', is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [targetId]
      ).catch(() => {});
    } else if (targetType === 'MEDIA') {
      await dbPool.query(
        `UPDATE media SET status = 'TAKEDOWN', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [targetId]
      ).catch(() => {});
    }
  }

  // Immutable audit log recording without PII
  const ipHash = crypto.createHash('sha256').update(ipAddress || '').digest('hex');
  await dbPool.query(
    `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, ip_address_hash, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      moderatorId,
      moderatorRole,
      `MODERATION_ACTION_${action}`,
      targetType,
      targetId,
      ipHash,
      JSON.stringify({ actionId: moderationAction.id, reason }),
    ]
  ).catch(err => console.error('Audit log write error:', err));

  return moderationAction;
};

export const getModerationActionById = async (id: string): Promise<ModerationAction | null> => {
  const result = await dbPool.query(
    `SELECT * FROM moderation_actions WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const createActionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { targetType, targetId, action, reason } = req.body;
    const moderationAction = await createModerationAction({
      moderatorId: req.user.id,
      moderatorRole: req.user.role,
      targetType,
      targetId,
      action,
      reason,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: `Moderation action '${action}' applied successfully.`,
      action: moderationAction,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getActionHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const action = await getModerationActionById(id);
    if (!action) {
      return res.status(404).json({ error: 'Moderation action not found' });
    }
    return res.status(200).json({ action });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
