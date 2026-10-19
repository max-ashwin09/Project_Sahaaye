import { dbPool } from '../config/database';
import { retentionRules } from '../config/retention';

export const purgeUnpublishedMedia = async () => {
  console.log('Purging unlinked / draft uploaded media older than retention window...');
  await dbPool.query(
    `DELETE FROM media WHERE need_id IS NULL AND created_at < NOW() - INTERVAL '$1 days'`,
    [retentionRules.unpublishedMediaRetentionDays]
  );
};
