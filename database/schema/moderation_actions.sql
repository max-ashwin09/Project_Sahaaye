-- Moderator Actions on Content/Users
CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(32) NOT NULL,
    target_id UUID NOT NULL,
    action VARCHAR(32) NOT NULL, -- WARN, SUSPEND, BAN, CONTENT_TAKEDOWN
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
