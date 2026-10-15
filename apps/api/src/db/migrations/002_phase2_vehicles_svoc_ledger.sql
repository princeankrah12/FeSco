-- FeSCo Phase 2 Database Migration: Vehicles, Versioned SVOC, and Double-Entry Wallet Ledger
-- Strict compliance with the FeSCo Platform Data Dictionary (Document 6)

-- 1. Versioned SVOC Table (Tied to National Petroleum Authority Windows)
CREATE TABLE IF NOT EXISTS svoc_rate_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_code VARCHAR(40) UNIQUE NOT NULL,
    effective_from DATE NOT NULL,
    npa_window_label VARCHAR(60) NOT NULL,
    class_a_pesewas_per_km INT NOT NULL, -- Class A: <1500cc (140p/km)
    class_b_pesewas_per_km INT NOT NULL, -- Class B: 1500-2500cc (210p/km)
    class_c_pesewas_per_km INT NOT NULL, -- Class C: >2500cc (333p/km)
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Baseline SVOC Rates (Document 6 & ADR 0001)
INSERT INTO svoc_rate_versions (version_code, effective_from, npa_window_label, class_a_pesewas_per_km, class_b_pesewas_per_km, class_c_pesewas_per_km, is_active)
VALUES
    ('2026.1-DVLA', '2026-01-01', '2026-Window-01', 140, 210, 333, TRUE),
    ('2025.24-DVLA', '2025-12-16', '2025-Window-24', 150, 220, 345, FALSE)
ON CONFLICT (version_code) DO NOTHING;

-- 2. Host Vehicles Table (DVLA & NIC Verified)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) NOT NULL,
    chassis_number VARCHAR(17) NOT NULL,
    engine_capacity_cc INT NOT NULL,
    manufacture_year INT NOT NULL,
    engine_class CHAR(1) NOT NULL CHECK (engine_class IN ('A', 'B', 'C')),
    registration_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (registration_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    insurance_policy_number VARCHAR(60),
    insurance_expiry DATE,
    roadworthiness_expiry DATE,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_host_user ON vehicles (host_user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles (license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles (registration_status);

-- 3. Wallet Accounts (Double-Entry Ledger Foundation)
CREATE TABLE IF NOT EXISTS wallet_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('USER_MAIN', 'ESCROW_HOLD', 'RESCUE_POOL', 'PSP_CLEARING')),
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_account_type UNIQUE (user_id, account_type)
);

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_user ON wallet_accounts (user_id);

-- 4. Ledger Journal Entries (Immutable Event Log)
CREATE TABLE IF NOT EXISTS ledger_journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type VARCHAR(40) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(120) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_reference ON ledger_journal_entries (reference_id);

-- 5. Ledger Postings (Signed Double-Entry Debits & Credits in Integer Pesewas)
CREATE TABLE IF NOT EXISTS ledger_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES ledger_journal_entries(id) ON DELETE CASCADE,
    wallet_account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE RESTRICT,
    direction VARCHAR(6) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount_pesewas BIGINT NOT NULL CHECK (amount_pesewas > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postings_account ON ledger_postings (wallet_account_id);
CREATE INDEX IF NOT EXISTS idx_postings_journal ON ledger_postings (journal_entry_id);
