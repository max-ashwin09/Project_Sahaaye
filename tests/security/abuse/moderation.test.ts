import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { app } from '../../../backend/src/app';
import { dbPool } from '../../../backend/src/config/database';

// Mock database pool
jest.mock('../../../backend/src/config/database', () => ({
  dbPool: {
    query: jest.fn(),
  },
}));

describe('Abuse: Moderation & Appeals Security Suite', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeythatislongerthan32characters!!';

  // Test UUIDs
  const USER_A_ID = '11111111-1111-4111-8111-111111111111';
  const USER_B_ID = '22222222-2222-4222-8222-222222222222';
  const MODERATOR_ID = '33333333-3333-4333-8333-333333333333';
  const ADMIN_ID = '44444444-4444-4444-8444-444444444444';

  const userAToken = jwt.sign({ id: USER_A_ID, role: 'USER' }, JWT_SECRET);
  const userBToken = jwt.sign({ id: USER_B_ID, role: 'USER' }, JWT_SECRET);
  const moderatorToken = jwt.sign({ id: MODERATOR_ID, role: 'MODERATOR' }, JWT_SECRET);
  const adminToken = jwt.sign({ id: ADMIN_ID, role: 'ADMIN' }, JWT_SECRET);

  // In-memory mock database state
  let mockState: {
    moderation_actions: any[];
    appeals: any[];
    abuse_reports: any[];
    audit_logs: any[];
    users: any[];
    needs: any[];
  };

  beforeEach(() => {
    mockState = {
      moderation_actions: [],
      appeals: [],
      abuse_reports: [],
      audit_logs: [],
      users: [
        { id: USER_A_ID, status: 'ACTIVE' },
        { id: USER_B_ID, status: 'ACTIVE' },
        { id: MODERATOR_ID, status: 'ACTIVE' },
      ],
      needs: [],
    };

    (dbPool.query as jest.Mock).mockImplementation(async (sql: string, params: any[] = []) => {
      const cleanSql = sql.replace(/\s+/g, ' ').trim();

      // INSERT INTO moderation_actions
      if (cleanSql.includes('INSERT INTO moderation_actions')) {
        const [moderator_id, target_type, target_id, action, reason] = params;
        const newAction = {
          id: crypto.randomUUID(),
          moderator_id,
          target_type,
          target_id,
          action,
          reason,
          created_at: new Date().toISOString(),
        };
        mockState.moderation_actions.push(newAction);
        return { rows: [newAction] };
      }

      // SELECT FROM moderation_actions WHERE id = $1
      if (cleanSql.includes('SELECT * FROM moderation_actions WHERE id = $1')) {
        const action = mockState.moderation_actions.find(a => a.id === params[0]);
        return { rows: action ? [action] : [] };
      }

      // UPDATE users SET status = ... WHERE id = ...
      if (cleanSql.includes('UPDATE users SET status = $1')) {
        const [status, id] = params;
        const user = mockState.users.find(u => u.id === id);
        if (user) user.status = status;
        return { rows: user ? [user] : [] };
      }

      // UPDATE needs SET status = ...
      if (cleanSql.includes('UPDATE needs SET status =')) {
        const id = params[0];
        const need = mockState.needs.find(n => n.id === id);
        if (need) need.status = 'FLAGGED';
        return { rows: need ? [need] : [] };
      }

      // SELECT id FROM appeals WHERE action_id = $1 AND user_id = $2 AND status = 'PENDING'
      if (cleanSql.includes('FROM appeals WHERE action_id = $1 AND user_id = $2 AND status = \'PENDING\'')) {
        const [action_id, user_id] = params;
        const existing = mockState.appeals.filter(
          a => a.action_id === action_id && a.user_id === user_id && a.status === 'PENDING'
        );
        return { rows: existing };
      }

      // INSERT INTO appeals
      if (cleanSql.includes('INSERT INTO appeals')) {
        const [action_id, user_id, statement] = params;
        const newAppeal = {
          id: crypto.randomUUID(),
          action_id,
          user_id,
          statement,
          status: 'PENDING',
          reviewed_by: null,
          created_at: new Date().toISOString(),
          resolved_at: null,
        };
        mockState.appeals.push(newAppeal);
        return { rows: [newAppeal] };
      }

      // SELECT * FROM appeals WHERE id = $1
      if (cleanSql.includes('SELECT * FROM appeals WHERE id = $1')) {
        const appeal = mockState.appeals.find(a => a.id === params[0]);
        return { rows: appeal ? [appeal] : [] };
      }

      // UPDATE appeals SET status = $1, reviewed_by = $2, resolved_at = CURRENT_TIMESTAMP WHERE id = $3
      if (cleanSql.includes('UPDATE appeals SET status = $1, reviewed_by = $2')) {
        const [status, reviewed_by, id] = params;
        const appeal = mockState.appeals.find(a => a.id === id);
        if (appeal) {
          appeal.status = status;
          appeal.reviewed_by = reviewed_by;
          appeal.resolved_at = new Date().toISOString();
        }
        return { rows: appeal ? [appeal] : [] };
      }

      // SELECT appeals for user or moderation queue
      if (cleanSql.includes('FROM appeals a')) {
        let results = [...mockState.appeals];
        if (cleanSql.includes('WHERE a.user_id = $1')) {
          results = results.filter(a => a.user_id === params[0]);
        } else if (cleanSql.includes('WHERE a.status = $1')) {
          results = results.filter(a => a.status === params[0]);
        }
        return { rows: results };
      }

      // SELECT moderation queue from abuse_reports
      if (cleanSql.includes('FROM abuse_reports')) {
        let items = [...mockState.abuse_reports];
        if (cleanSql.includes('WHERE status IN (\'QUEUED\', \'IN_REVIEW\')')) {
          items = items.filter(r => ['QUEUED', 'IN_REVIEW'].includes(r.status));
        }
        return { rows: items };
      }

      // INSERT INTO audit_logs
      if (cleanSql.includes('INSERT INTO audit_logs')) {
        const logEntry = {
          id: `log-${crypto.randomUUID()}`,
          actor_id: params[0],
          actor_role: params[1],
          action: params[2],
          entity_type: params[3],
          entity_id: params[4],
          ip_address_hash: params[5],
          details: params[6],
          created_at: new Date().toISOString(),
        };
        mockState.audit_logs.push(logEntry);
        return { rows: [logEntry] };
      }

      return { rows: [] };
    });
  });

  describe('1. Role-Based Access Control (RBAC) & Security Boundaries', () => {
    it('should reject unauthenticated requests to moderation endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/moderation/queue');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject regular users from accessing moderation queue with 403', async () => {
      const res = await request(app)
        .get('/api/v1/moderation/queue')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/insufficient permissions/i);
    });

    it('should prevent regular users from applying moderation actions with 403', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetType: 'USER',
          targetId: USER_B_ID,
          action: 'SUSPEND',
          reason: 'Unauthorized suspension attempt',
        });

      expect(res.status).toBe(403);
    });

    it('should prevent regular users from executing content takedowns with 403', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/takedown')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetType: 'NEED',
          targetId: crypto.randomUUID(),
          reason: 'Unauthorized takedown attempt',
        });

      expect(res.status).toBe(403);
    });

    it('should prevent regular users from reviewing or resolving appeals with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/moderation/appeals/${crypto.randomUUID()}/review`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('should allow authorized MODERATOR and ADMIN roles to access moderation queue', async () => {
      const modRes = await request(app)
        .get('/api/v1/moderation/queue')
        .set('Authorization', `Bearer ${moderatorToken}`);
      expect(modRes.status).toBe(200);
      expect(modRes.body).toHaveProperty('queue');

      const adminRes = await request(app)
        .get('/api/v1/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body).toHaveProperty('queue');
    });
  });

  describe('2. Moderation Actions Workflow (WARN, SUSPEND, BAN, TAKEDOWN)', () => {
    it('should allow moderator to issue a formal WARN action with valid reason', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          targetType: 'USER',
          targetId: USER_A_ID,
          action: 'WARN',
          reason: 'First warning for inappropriate language in public discussion.',
        });

      expect(res.status).toBe(201);
      expect(res.body.action.action).toBe('WARN');
      expect(res.body.action.target_id).toBe(USER_A_ID);
      expect(mockState.moderation_actions.length).toBe(1);
    });

    it('should allow moderator to SUSPEND an abusive user and update their account status', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          targetType: 'USER',
          targetId: USER_A_ID,
          action: 'SUSPEND',
          reason: 'Repeated harassment towards aid volunteers.',
        });

      expect(res.status).toBe(201);
      expect(res.body.action.action).toBe('SUSPEND');

      const targetUser = mockState.users.find(u => u.id === USER_A_ID);
      expect(targetUser?.status).toBe('SUSPENDED');
    });

    it('should reject moderation actions with invalid action type or missing reason', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          targetType: 'USER',
          targetId: USER_A_ID,
          action: 'INVALID_ACTION',
          reason: 'Test',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should allow moderator to execute immediate content takedown on reported needs', async () => {
      const needId = crypto.randomUUID();
      mockState.needs.push({ id: needId, status: 'OPEN' });

      const res = await request(app)
        .post('/api/v1/moderation/takedown')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          targetType: 'NEED',
          targetId: needId,
          reason: 'Need posting contains fraudulent donation links.',
        });

      expect(res.status).toBe(200);
      expect(res.body.action.action).toBe('CONTENT_TAKEDOWN');
      const need = mockState.needs.find(n => n.id === needId);
      expect(need?.status).toBe('FLAGGED');
    });
  });

  describe('3. User Appeals Workflow & IDOR Prevention', () => {
    let userASuspensionActionId: string;

    beforeEach(async () => {
      // Setup a suspension action targeting User A
      const actRes = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          targetType: 'USER',
          targetId: USER_A_ID,
          action: 'SUSPEND',
          reason: 'Violation of community safety terms.',
        });
      userASuspensionActionId = actRes.body.action.id;
    });

    it('should allow suspended user to submit an appeal against their suspension', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          actionId: userASuspensionActionId,
          statement: 'I apologize for the misunderstanding. My account was compromised and has now been secured.',
        });

      expect(res.status).toBe(201);
      expect(res.body.appeal).toHaveProperty('id');
      expect(res.body.appeal.status).toBe('PENDING');
      expect(res.body.appeal.user_id).toBe(USER_A_ID);
      expect(mockState.appeals.length).toBe(1);
    });

    it('should prevent User B from appealing User A suspension (IDOR Protection)', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          actionId: userASuspensionActionId,
          statement: 'Attempting to appeal for another user without authorization.',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/own account/i);
      expect(mockState.appeals.length).toBe(0);
    });

    it('should reject appeal submissions for nonexistent moderation actions with 404', async () => {
      const nonExistentId = crypto.randomUUID();
      const res = await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          actionId: nonExistentId,
          statement: 'Appealing an action that does not exist in records.',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('should reject appeal statements that are too short (< 10 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          actionId: userASuspensionActionId,
          statement: 'Short',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should prevent duplicate active appeals for the same moderation action', async () => {
      // First appeal
      await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          actionId: userASuspensionActionId,
          statement: 'First appeal explanation submitted to moderators.',
        });

      // Second appeal attempt while first is still pending
      const duplicateRes = await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          actionId: userASuspensionActionId,
          statement: 'Second appeal explanation attempted before resolution.',
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error).toMatch(/already pending/i);
    });

    it('should allow user to view their own appeal history via /appeals/my', async () => {
      await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          actionId: userASuspensionActionId,
          statement: 'Valid appeal statement for listing test.',
        });

      const res = await request(app)
        .get('/api/v1/moderation/appeals/my')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.appeals.length).toBe(1);
      expect(res.body.appeals[0].user_id).toBe(USER_A_ID);
    });
  });

  describe('4. Appeal Adjudication & Account Reinstatement', () => {
    let appealId: string;
    let suspensionActionId: string;

    beforeEach(async () => {
      // 1. Suspend User A
      const actRes = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          targetType: 'USER',
          targetId: USER_A_ID,
          action: 'SUSPEND',
          reason: 'Suspension pending verification of credentials.',
        });
      suspensionActionId = actRes.body.action.id;

      // 2. User A submits appeal
      const appRes = await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          actionId: suspensionActionId,
          statement: 'Verified credentials and organization registration attached.',
        });
      appealId = appRes.body.appeal.id;
    });

    it('should allow moderator to APPROVE an appeal and reinstate the suspended user', async () => {
      const res = await request(app)
        .patch(`/api/v1/moderation/appeals/${appealId}/review`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          status: 'APPROVED',
          resolutionNotes: 'Identity and registration verified. Suspension lifted.',
        });

      expect(res.status).toBe(200);
      expect(res.body.appeal.status).toBe('APPROVED');
      expect(res.body.appeal.reviewed_by).toBe(MODERATOR_ID);
      expect(res.body.appeal.resolved_at).toBeDefined();

      // Check User A is restored to ACTIVE
      const userA = mockState.users.find(u => u.id === USER_A_ID);
      expect(userA?.status).toBe('ACTIVE');
    });

    it('should allow moderator to REJECT an appeal while keeping the suspension active', async () => {
      const res = await request(app)
        .patch(`/api/v1/moderation/appeals/${appealId}/review`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          status: 'REJECTED',
          resolutionNotes: 'Submitted documentation was fraudulent. Appeal denied.',
        });

      expect(res.status).toBe(200);
      expect(res.body.appeal.status).toBe('REJECTED');
      expect(res.body.appeal.reviewed_by).toBe(MODERATOR_ID);

      // Check User A remains SUSPENDED
      const userA = mockState.users.find(u => u.id === USER_A_ID);
      expect(userA?.status).toBe('SUSPENDED');
    });

    it('should prevent re-adjudicating an already resolved appeal (Idempotency / Finality)', async () => {
      // First resolution (Approve)
      await request(app)
        .patch(`/api/v1/moderation/appeals/${appealId}/review`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ status: 'APPROVED' });

      // Second review attempt on same appeal
      const secondRes = await request(app)
        .patch(`/api/v1/moderation/appeals/${appealId}/review`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ status: 'REJECTED' });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.error).toMatch(/already been resolved/i);
    });
  });

  describe('5. Audit Logging & DPDP Privacy Compliance', () => {
    it('should generate tamper-evident audit logs with hashed IP on moderation actions', async () => {
      await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          targetType: 'USER',
          targetId: USER_B_ID,
          action: 'WARN',
          reason: 'Posting repetitive off-topic requests.',
        });

      const auditEntry = mockState.audit_logs.find(l => l.action === 'MODERATION_ACTION_WARN');
      expect(auditEntry).toBeDefined();
      expect(auditEntry.actor_id).toBe(MODERATOR_ID);
      expect(auditEntry.actor_role).toBe('MODERATOR');
      expect(auditEntry.entity_type).toBe('USER');
      // IP address must be hashed (SHA-256), not stored raw (no PII leakage)
      expect(auditEntry.ip_address_hash).toBeDefined();
      expect(auditEntry.ip_address_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate audit log records when an appeal is submitted', async () => {
      // Create action first
      const actRes = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          targetType: 'USER',
          targetId: USER_A_ID,
          action: 'SUSPEND',
          reason: 'Audit log appeal test.',
        });

      // Submit appeal
      await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          actionId: actRes.body.action.id,
          statement: 'Testing appeal audit logging verification.',
        });

      const appealLog = mockState.audit_logs.find(l => l.action === 'SUBMIT_APPEAL');
      expect(appealLog).toBeDefined();
      expect(appealLog.actor_id).toBe(USER_A_ID);
      expect(appealLog.entity_type).toBe('APPEAL');
    });

    it('should generate audit log records when an appeal is resolved', async () => {
      // 1. Action
      const actRes = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          targetType: 'USER',
          targetId: USER_A_ID,
          action: 'SUSPEND',
          reason: 'Audit log resolution test.',
        });

      // 2. Appeal
      const appRes = await request(app)
        .post('/api/v1/moderation/appeals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          actionId: actRes.body.action.id,
          statement: 'Testing resolution audit logging.',
        });

      // 3. Resolve
      await request(app)
        .patch(`/api/v1/moderation/appeals/${appRes.body.appeal.id}/review`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ status: 'APPROVED', resolutionNotes: 'Restored' });

      const resolveLog = mockState.audit_logs.find(l => l.action === 'RESOLVE_APPEAL_APPROVED');
      expect(resolveLog).toBeDefined();
      expect(resolveLog.actor_id).toBe(MODERATOR_ID);
      expect(resolveLog.entity_type).toBe('APPEAL');
    });
  });
});
