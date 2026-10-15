-- Migration: 004_phase4_carpool_clubs
-- Description: Core tables for Club operations and escrow pools

-- 1. Ledger Accounts Expansion
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
        CREATE TYPE account_type AS ENUM ('USER_MAIN', 'ESCROW_HOLD', 'RESCUE_POOL', 'PSP_CLEARING');
    END IF;
END $$;

ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'CLUB_CONTINUITY_ESCROW';
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'RELIEF_SUBSIDY_POOL';

ALTER TABLE wallet_accounts DROP CONSTRAINT IF EXISTS wallet_accounts_account_type_check;
ALTER TABLE wallet_accounts ADD CONSTRAINT wallet_accounts_account_type_check
    CHECK (account_type IN ('USER_MAIN', 'ESCROW_HOLD', 'RESCUE_POOL', 'PSP_CLEARING', 'CLUB_CONTINUITY_ESCROW', 'RELIEF_SUBSIDY_POOL'));

-- 2. Clubs Table
CREATE TABLE IF NOT EXISTS clubs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    route_geometry geometry(LineString, 4326) NOT NULL,
    standard_am_departure TIME NOT NULL,
    standard_pm_departure TIME NOT NULL,
    club_baseline_rate_pesewas INTEGER NOT NULL,
    status VARCHAR(20) CHECK (status IN ('FORMING', 'ACTIVE', 'SUSPENDED')) DEFAULT 'FORMING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Club Memberships Table
CREATE TABLE IF NOT EXISTS club_memberships (
    club_id VARCHAR(50) REFERENCES clubs(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id),
    vehicle_id VARCHAR(50) REFERENCES vehicles(id),
    rotation_order SMALLINT CHECK (rotation_order BETWEEN 1 AND 4),
    status VARCHAR(20) CHECK (status IN ('ACTIVE', 'AWAY')),
    rotation_equity_score NUMERIC(3, 2) DEFAULT 1.00,
    continuity_stake_pesewas INTEGER DEFAULT 0 CHECK (continuity_stake_pesewas <= 6000),
    PRIMARY KEY (club_id, user_id)
);

-- 4. Club Roster Schedules
CREATE TABLE IF NOT EXISTS club_roster_schedules (
    id VARCHAR(50) PRIMARY KEY,
    club_id VARCHAR(50) REFERENCES clubs(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL,
    week_number SMALLINT CHECK (week_number BETWEEN 1 AND 4),
    commute_date DATE NOT NULL,
    scheduled_host_user_id VARCHAR(50) REFERENCES users(id),
    actual_host_user_id VARCHAR(50) REFERENCES users(id),
    is_swap BOOLEAN DEFAULT FALSE,
    swap_approved_by VARCHAR(50) REFERENCES users(id) NULL
);
