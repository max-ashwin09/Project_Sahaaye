import { dbPool } from '../config/database';

export const processDeletionRequests = async () => {
  console.log('Processing account deletion right-to-erasure requests...');
  // Delete accounts that have exceeded cooling-off period
  const readyForDeletion = await dbPool.query(
    `SELECT user_id FROM deletion_requests WHERE status = 'PENDING' AND cooling_off_until <= NOW()`
  );

  for (const row of readyForDeletion.rows) {
    await dbPool.query(`DELETE FROM users WHERE id = $1`, [row.user_id]);
    await dbPool.query(`UPDATE deletion_requests SET status = 'COMPLETED', completed_at = NOW() WHERE user_id = $1`, [row.user_id]);
  }
};
