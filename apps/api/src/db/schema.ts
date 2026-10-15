/**
 * FeSCo Database Schema Definitions
 *
 * Strictly adheres to the FeSCo Platform Data Dictionary (Document 6):
 * - Table: users (roles: is_host, is_cocommuter)
 * - Table: commutes (columns: commute_id, host_id, route_polyline, scheduled_departure, svoc_rate_version)
 * - Table: commute_seats (columns: seat_status, pickup_stop_name, is_nearest_stop_match)
 * - Table: transactions (columns: contribution_amount_pesewas, escrow_status, offset_settled_at)
 * - Table: rescue_pool_ledger (excess penalty pool tracking)
 */

export interface UserRecord {
  id: string;
  corporate_email: string;
  company_name: string;
  is_host: boolean;
  is_cocommuter: boolean;
  ghana_card_pin?: string;
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  wallet_balance_pesewas: number;
  home_neighborhood?: string;
  corporate_office_pin?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CommuteRecord {
  id: string;
  host_id: string;
  origin_name: string;
  destination_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  route_polyline: string;
  distance_km: number;
  engine_class: 'A' | 'B' | 'C';
  svoc_rate_version: string;
  total_operating_cost_pesewas: number;
  seat_contribution_pesewas: number;
  scheduled_departure: Date;
  commute_status:
    | 'SCHEDULED'
    | 'LOCKING'
    | 'SECURED'
    | 'IN_TRANSIT'
    | 'PENDING_REVIEW'
    | 'COMPLETED'
    | 'DISPUTED'
    | 'ACTIVE'
    | 'SETTLED'
    | 'ABORTED';
  created_at: Date;
}

export interface CommuteSeatRecord {
  id: string;
  commute_id: string;
  cocommuter_id: string;
  seat_status: 'RESERVED' | 'LOCKED' | 'BOARDED' | 'DROPPED_OFF' | 'FORFEITED' | 'CANCELLED';
  pickup_stop_name: string;
  is_nearest_stop_match: boolean;
  contribution_pesewas: number;
  boarding_verified_at?: Date;
  dropoff_verified_at?: Date;
  created_at: Date;
}

export interface TransactionRecord {
  id: string;
  commute_id: string;
  seat_id: string;
  cocommuter_id: string;
  host_id: string;
  contribution_amount_pesewas: number;
  escrow_status: 'HELD' | 'SETTLED' | 'REFUNDED' | 'RESCUE_POOL';
  offset_settled_at: Date | null;
  created_at: Date;
}

export interface RescuePoolLedgerRecord {
  id: string;
  source_transaction_id: string;
  amount_pesewas: number;
  reason: 'CANCELLATION_PENALTY_EXCESS' | 'EMERGENCY_RESCUE_SUBSIDY' | 'MANUAL_ADJUSTMENT';
  allocated_to_commute_id?: string;
  created_at: Date;
}

export interface CorporateEmployerRecord {
  domain: string;
  company_name: string;
  category: string;
  primary_hub: string;
  is_verified: boolean;
  verified_at?: Date;
}

export interface SvocRateVersionRecord {
  id: string;
  version_code: string;
  effective_from: Date;
  npa_window_label: string;
  class_a_pesewas_per_km: number;
  class_b_pesewas_per_km: number;
  class_c_pesewas_per_km: number;
  is_active: boolean;
  created_at: Date;
}

export interface VehicleRecord {
  id: string;
  host_user_id: string;
  license_plate: string;
  chassis_number: string;
  engine_capacity_cc: number;
  manufacture_year: number;
  engine_class: 'A' | 'B' | 'C';
  registration_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  insurance_policy_number?: string;
  insurance_expiry?: Date;
  roadworthiness_expiry?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WalletAccountRecord {
  id: string;
  user_id?: string | null;
  account_type:
    | 'USER_MAIN'
    | 'ESCROW_HOLD'
    | 'RESCUE_POOL'
    | 'PSP_CLEARING'
    | 'CLUB_CONTINUITY_ESCROW'
    | 'RELIEF_SUBSIDY_POOL';
  currency: 'GHS';
  created_at: Date;
  updated_at: Date;
}

export interface LedgerJournalEntryRecord {
  id: string;
  transaction_type: string;
  reference_id: string;
  idempotency_key: string;
  description: string;
  created_at: Date;
}

export interface LedgerPostingRecord {
  id: string;
  journal_entry_id: string;
  wallet_account_id: string;
  direction: 'DEBIT' | 'CREDIT';
  amount_pesewas: number;
  created_at: Date;
}

export interface BlePresenceTokenRecord {
  id: string;
  commute_id: string;
  seat_id: string;
  host_device_id: string;
  cocommuter_device_id: string;
  token_hash: string;
  signature: string;
  rssi_level: number;
  exchanged_at: Date;
  synced_at: Date;
  is_verified: boolean;
}

export interface CommuteReviewRecord {
  id: string;
  commute_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating_stars: number;
  safety_tags: string[];
  feedback_comment?: string;
  is_safety_escalation: boolean;
  created_at: Date;
}

export interface ClubRecord {
  id: string;
  name: string;
  route_geometry: string;
  standard_am_departure: string;
  standard_pm_departure: string;
  club_baseline_rate_pesewas: number;
  status: 'FORMING' | 'ACTIVE' | 'SUSPENDED';
  created_at: Date;
  updated_at: Date;
}

export interface ClubMembershipRecord {
  club_id: string;
  user_id: string;
  vehicle_id: string;
  rotation_order: 1 | 2 | 3 | 4;
  status: 'ACTIVE' | 'AWAY';
  rotation_equity_score: number;
  continuity_stake_pesewas: number;
}

export interface ClubRosterScheduleRecord {
  id: string;
  club_id: string;
  cycle_number: number;
  week_number: 1 | 2 | 3 | 4;
  commute_date: Date;
  scheduled_host_user_id: string;
  actual_host_user_id: string;
  is_swap: boolean;
  swap_approved_by: string | null;
}

