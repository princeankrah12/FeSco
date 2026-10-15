-- FeSCo Phase 3 Database Migration: Commute Execution Lifecycle, Signed BLE Presence Tokens, and Two-Way Reviews
-- Strict Compliance with the FeSCo Platform Data Dictionary (Document 6)

-- 1. Upgrade Commute Lifecycle State Constraint
-- Enforces lifecycle: SCHEDULED -> LOCKING -> SECURED -> IN_TRANSIT -> PENDING_REVIEW -> COMPLETED (or DISPUTED)
ALTER TABLE commutes DROP CONSTRAINT IF EXISTS check_commute_status;
ALTER TABLE commutes ADD CONSTRAINT check_commute_status
    CHECK (commute_status IN ('SCHEDULED', 'LOCKING', 'SECURED', 'IN_TRANSIT', 'PENDING_REVIEW', 'COMPLETED', 'DISPUTED'));

-- 2. Signed Offline BLE Presence Token Log
-- Supports P2P BLE Canyon Protocol in underground parking or zero-connectivity nodes
CREATE TABLE IF NOT EXISTS ble_presence_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commute_id UUID NOT NULL REFERENCES commutes(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES commute_seats(id) ON DELETE CASCADE,
    host_device_id VARCHAR(100) NOT NULL,
    cocommuter_device_id VARCHAR(100) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    signature TEXT NOT NULL,
    rssi_level INT NOT NULL,
    exchanged_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_verified BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_ble_tokens_commute_seat ON ble_presence_tokens (commute_id, seat_id);
CREATE INDEX IF NOT EXISTS idx_ble_tokens_token_hash ON ble_presence_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_ble_tokens_synced ON ble_presence_tokens (synced_at);

-- 3. Two-Way Post-Commute Ratings and Safety Escalation Table
-- Enforces safety accountability and powers the PendingReviewGuard (HTTP 428)
CREATE TABLE IF NOT EXISTS commute_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commute_id UUID NOT NULL REFERENCES commutes(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_stars INT NOT NULL CHECK (rating_stars BETWEEN 1 AND 5),
    safety_tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    feedback_comment TEXT,
    is_safety_escalation BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_commute_reviewer_reviewee UNIQUE (commute_id, reviewer_id, reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_commute_reviews_commute ON commute_reviews (commute_id);
CREATE INDEX IF NOT EXISTS idx_commute_reviews_reviewer ON commute_reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS idx_commute_reviews_reviewee ON commute_reviews (reviewee_id);
CREATE INDEX IF NOT EXISTS idx_commute_reviews_escalation ON commute_reviews (is_safety_escalation) WHERE is_safety_escalation = TRUE;
