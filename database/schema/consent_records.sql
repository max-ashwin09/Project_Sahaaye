-- DPDP Act 2023 Compliant Consent Tracking
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(64) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT FALSE,
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    policy_version VARCHAR(32) NOT NULL,
    CONSTRAINT unique_user_purpose UNIQUE (user_id, purpose)
);
