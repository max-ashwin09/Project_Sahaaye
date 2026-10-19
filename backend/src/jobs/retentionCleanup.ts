import { dbPool } from '../config/database';
import { retentionRules } from '../config/retention';

export const runRetentionCleanup = async () => {
  console.log('Running DPDP data retention cleanup job...');
  // Purge resolved needs older than retention limit
  await dbPool.query(
    `DELETE FROM needs WHERE status = 'RESOLVED' AND updated_at < NOW() - INTERVAL '$1 days'`,
    [retentionRules.resolvedNeedsRetentionDays]
  );
};
