import { Request, Response } from 'express';
import crypto from 'crypto';
import { dbPool } from '../../../config/database';
import { Appeal, AppealStatus } from '@sahaaye/shared';
import { getModerationActionById } from '../actions';

export interface SubmitAppealParams {
  userId: string;
  userRole?: string;
  actionId: string;
  statement: string;
  ipAddress?: string;
}

export interface ReviewAppealParams {
  appealId: string;
  moderatorId: string;
  moderatorRole?: string;
  status: 'APPROVED' | 'REJECTED';
  resolutionNotes?: string;
  ipAddress?: string;
}

export const submitAppeal = async (params: SubmitAppealParams): Promise<Appeal> => {
  const { userId, userRole = 'USER', actionId, statement, ipAddress } = params;

  // 1. Verify moderation action exists
  const action = await getModerationActionById(actionId);
  if (!action) {
    const error: any = new Error('Moderation action not found');
    error.status = 404;
    throw error;
  }

  // 2. Authorization / IDOR Protection: User can only appeal actions targeting them or their content
  if (action.target_type === 'USER' && action.target_id !== userId) {
    const error: any = new Error('Forbidden: You can only appeal moderation actions taken against your own account');
    error.status = 403;
    throw error;
  }

  // If target is NEED, verify if user created the need
  if (action.target_type === 'NEED') {
    const needRes = await dbPool.query(`SELECT user_id FROM needs WHERE id = $1`, [action.target_id]).catch(() => null);
    if (needRes && needRes.rows[0] && needRes.rows[0].user_id !== userId) {
      const error: any = new Error('Forbidden: You can only appeal actions taken against your own reports');
      error.status = 403;
      throw error;
    }
  }

  // 3. Prevent duplicate active appeals for the same action
  const existingRes = await dbPool.query(
    `SELECT id FROM appeals WHERE action_id = $1 AND user_id = $2 AND status = 'PENDING'`,
    [actionId, userId]
  );
  if (existingRes.rows.length > 0) {
    const error: any = new Error('An appeal for this moderation action is already pending review');
    error.status = 409;
    throw error;
  }

  // 4. Insert appeal record
  const result = await dbPool.query(
    `INSERT INTO appeals (action_id, user_id, statement, status)
     VALUES ($1, $2, $3, 'PENDING')
     RETURNING *`,
    [actionId, userId, statement]
  );

  const appeal: Appeal = result.rows[0];

  // 5. Tamper-evident immutable audit log
  const ipHash = crypto.createHash('sha256').update(ipAddress || '').digest('hex');
  await dbPool.query(
    `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, ip_address_hash, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      userRole,
      'SUBMIT_APPEAL',
      'APPEAL',
      appeal.id,
      ipHash,
      JSON.stringify({ actionId }),
    ]
  ).catch(err => console.error('Audit log write error:', err));

  return appeal;
};

export const reviewAppeal = async (params: ReviewAppealParams): Promise<Appeal> => {
  const { appealId, moderatorId, moderatorRole = 'MODERATOR', status, resolutionNotes, ipAddress } = params;

  // 1. Retrieve appeal
  const appealRes = await dbPool.query(`SELECT * FROM appeals WHERE id = $1`, [appealId]);
  const appeal = appealRes.rows[0];
  if (!appeal) {
    const error: any = new Error('Appeal not found');
    error.status = 404;
    throw error;
  }

  // 2. Finality & Idempotency check: Cannot re-adjudicate resolved appeals
  if (appeal.status !== 'PENDING') {
    const error: any = new Error(`Appeal has already been resolved with status: ${appeal.status}`);
    error.status = 400;
    throw error;
  }

  // 3. Update appeal status
  const updateRes = await dbPool.query(
    `UPDATE appeals
     SET status = $1, reviewed_by = $2, resolved_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [status, moderatorId, appealId]
  );

  const updatedAppeal: Appeal = updateRes.rows[0];

  // 4. If approved, lift or revert the sanction
  if (status === 'APPROVED') {
    const action = await getModerationActionById(appeal.action_id);
    if (action) {
      if (action.target_type === 'USER' && action.action === 'SUSPEND') {
        await dbPool.query(
          `UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          ['ACTIVE', action.target_id]
        ).catch(() => {});
      } else if (action.target_type === 'NEED' && action.action === 'CONTENT_TAKEDOWN') {
        await dbPool.query(
          `UPDATE needs SET status = 'OPEN', is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [action.target_id]
        ).catch(() => {});
      }
    }
  }

  // 5. Tamper-evident audit log
  const ipHash = crypto.createHash('sha256').update(ipAddress || '').digest('hex');
  await dbPool.query(
    `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, ip_address_hash, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      moderatorId,
      moderatorRole,
      `RESOLVE_APPEAL_${status}`,
      'APPEAL',
      appealId,
      ipHash,
      JSON.stringify({ appealId, status, resolutionNotes }),
    ]
  ).catch(err => console.error('Audit log write error:', err));

  return updatedAppeal;
};

export const getMyAppeals = async (userId: string): Promise<Appeal[]> => {
  const result = await dbPool.query(
    `SELECT a.*, ma.action AS action_type, ma.reason AS action_reason, ma.target_type
     FROM appeals a
     LEFT JOIN moderation_actions ma ON a.action_id = ma.id
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const listAppeals = async (statusFilter?: AppealStatus): Promise<Appeal[]> => {
  let query = `
    SELECT a.*, ma.action AS action_type, ma.reason AS action_reason, ma.target_type, ma.target_id
    FROM appeals a
    LEFT JOIN moderation_actions ma ON a.action_id = ma.id
  `;
  const params: any[] = [];
  if (statusFilter) {
    query += ` WHERE a.status = $1`;
    params.push(statusFilter);
  }
  query += ` ORDER BY a.created_at ASC`;

  const result = await dbPool.query(query, params);
  return result.rows;
};

export const getAppealById = async (appealId: string): Promise<Appeal | null> => {
  const result = await dbPool.query(`SELECT * FROM appeals WHERE id = $1`, [appealId]);
  return result.rows[0] || null;
};

// --- HTTP Handlers ---

export const submitAppealHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { actionId, statement } = req.body;
    const appeal = await submitAppeal({
      userId: req.user.id,
      userRole: req.user.role,
      actionId,
      statement,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: 'Appeal submitted successfully and queued for moderator review.',
      appeal,
    });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
};

export const reviewAppealHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    const appeal = await reviewAppeal({
      appealId: id,
      moderatorId: req.user.id,
      moderatorRole: req.user.role,
      status,
      resolutionNotes,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      message: `Appeal has been ${status.toLowerCase()} successfully.`,
      appeal,
    });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
};

export const getMyAppealsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const appeals = await getMyAppeals(req.user.id);
    return res.status(200).json({ appeals });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const listAppealsHandler = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as AppealStatus | undefined;
    const appeals = await listAppeals(status);
    return res.status(200).json({ appeals });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAppealByIdHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const appeal = await getAppealById(id);
    if (!appeal) {
      return res.status(404).json({ error: 'Appeal not found' });
    }

    // Only owner of the appeal or Moderator/Admin can view
    const isOwner = appeal.user_id === req.user.id;
    const isModOrAdmin = ['MODERATOR', 'ADMIN'].includes(req.user.role);
    if (!isOwner && !isModOrAdmin) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to view this appeal' });
    }

    return res.status(200).json({ appeal });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
