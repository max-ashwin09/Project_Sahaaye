-- Tamper-Evident Immutable Audit Log (No PII)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_role VARCHAR(32),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID,
    ip_address_hash VARCHAR(64),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deny UPDATE/DELETE on audit_logs for tamper resistance
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
