import { Request, Response } from 'express';
import { dbPool } from '../../../config/database';

export interface QueueItem {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  category: string;
  description: string;
  status: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  created_at: Date | string;
}

export const getModerationQueue = async (options: { category?: string; status?: string } = {}) => {
  let query = `
    SELECT id, reporter_id, target_type, target_id, category, description, status, created_at,
      CASE
        WHEN category = 'EXPLOITATION_OF_MINORS' THEN 'CRITICAL'
        WHEN category IN ('HARASSMENT_OR_STALKING', 'SCAM_OR_FRAUD', 'HATE_SPEECH_OR_VIOLENCE') THEN 'HIGH'
        ELSE 'NORMAL'
      END AS priority
    FROM abuse_reports
    WHERE status IN ('QUEUED', 'IN_REVIEW')
  `;

  const params: any[] = [];
  if (options.category) {
    params.push(options.category);
    query += ` AND category = $${params.length}`;
  }
  if (options.status) {
    params.push(options.status);
    query += ` AND status = $${params.length}`;
  }

  query += `
    ORDER BY
      CASE
        WHEN category = 'EXPLOITATION_OF_MINORS' THEN 1
        WHEN category IN ('HARASSMENT_OR_STALKING', 'SCAM_OR_FRAUD', 'HATE_SPEECH_OR_VIOLENCE') THEN 2
        ELSE 3
      END ASC,
      created_at ASC
  `;

  const result = await dbPool.query(query, params).catch(() => ({ rows: [] }));
  return result.rows;
};

export const getQueueHandler = async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;

    const queueItems = await getModerationQueue({ category, status });
    return res.status(200).json({
      count: queueItems.length,
      queue: queueItems,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
