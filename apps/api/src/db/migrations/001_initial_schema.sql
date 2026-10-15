-- FeSCo (Fuel Share Commute) Initial Database Schema
-- Strict Compliance with the Platform Data Dictionary (Document 6)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Verified Corporate Employers
CREATE TABLE IF NOT EXISTS corporate_employers (
    domain VARCHAR(120) PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    category VARCHAR(60) NOT NULL,
    primary_hub VARCHAR(100) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users (Corporate Professionals)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_email VARCHAR(180) UNIQUE NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    is_host BOOLEAN NOT NULL DEFAULT FALSE,
    is_cocommuter BOOLEAN NOT NULL DEFAULT TRUE,
    ghana_card_pin VARCHAR(20) UNIQUE,
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    wallet_balance_pesewas BIGINT NOT NULL DEFAULT 0,
    home_neighborhood VARCHAR(100),
    corporate_office_pin VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Commutes (Scheduled & Ad-hoc)
CREATE TABLE IF NOT EXISTS commutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin_name VARCHAR(120) NOT NULL,
    destination_name VARCHAR(120) NOT NULL,
    origin_point GEOMETRY(Point, 4326) NOT NULL,
    destination_point GEOMETRY(Point, 4326) NOT NULL,
    route_line GEOMETRY(LineString, 4326),
    route_polyline TEXT NOT NULL,
    distance_km NUMERIC(6, 2) NOT NULL,
    engine_class CHAR(1) NOT NULL CHECK (engine_class IN ('A', 'B', 'C')),
    svoc_rate_version VARCHAR(40) NOT NULL,
    total_operating_cost_pesewas BIGINT NOT NULL,
    seat_contribution_pesewas BIGINT NOT NULL,
    scheduled_departure TIMESTAMPTZ NOT NULL,
    commute_status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commutes_route_line ON commutes USING GIST (route_line);
CREATE INDEX IF NOT EXISTS idx_commutes_departure ON commutes (scheduled_departure);

-- 4. Commute Seats (Max 3 per Commute)
CREATE TABLE IF NOT EXISTS commute_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commute_id UUID NOT NULL REFERENCES commutes(id) ON DELETE CASCADE,
    cocommuter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_status VARCHAR(30) NOT NULL DEFAULT 'RESERVED',
    pickup_stop_name VARCHAR(120) NOT NULL,
    pickup_point GEOMETRY(Point, 4326),
    is_nearest_stop_match BOOLEAN NOT NULL DEFAULT FALSE,
    contribution_pesewas BIGINT NOT NULL,
    boarding_verified_at TIMESTAMPTZ,
    dropoff_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commute_seats_cocommuter ON commute_seats (cocommuter_id);

-- 5. Transactions (Double-Entry Escrow & Cost Offset Ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commute_id UUID NOT NULL REFERENCES commutes(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES commute_seats(id) ON DELETE CASCADE,
    cocommuter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contribution_amount_pesewas BIGINT NOT NULL,
    escrow_status VARCHAR(30) NOT NULL DEFAULT 'HELD',
    offset_settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_commute ON transactions (commute_id);

-- 6. FeSCo Rescue Pool Ledger
CREATE TABLE IF NOT EXISTS rescue_pool_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_transaction_id UUID REFERENCES transactions(id),
    amount_pesewas BIGINT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    allocated_to_commute_id UUID REFERENCES commutes(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
