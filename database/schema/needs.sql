-- Community Reported Needs Table
CREATE TABLE IF NOT EXISTS needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(64) NOT NULL,
    urgency VARCHAR(32) NOT NULL DEFAULT 'Normal',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location VARCHAR(255) NOT NULL,
    image_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    is_minor_involved BOOLEAN NOT NULL DEFAULT FALSE,
    reporter_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_needs_status ON needs(status);
CREATE INDEX IF NOT EXISTS idx_needs_created_at ON needs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_needs_coordinates ON needs(latitude, longitude);
