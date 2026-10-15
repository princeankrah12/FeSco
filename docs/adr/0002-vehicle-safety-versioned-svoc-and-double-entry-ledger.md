# ADR 0002: Vehicle Safety Liability, Versioned SVOC, and Double-Entry Ledger

## Status
Accepted

## Context
Under Ghanaian transport and insurance law, operating a carpool network without strict vehicle safety verification voids standard private motor insurance policies and exposes both the platform and individual Hosts to commercial transport licensing penalties. 

Phase 2 addresses three critical compliance mandates:
1. **Vehicle Safety & Age Ceilings:** DVLA roadworthiness and comprehensive insurance must be verified before any commute can be published to the network. Vehicles older than 15 years present disproportionate mechanical breakdown risks and must be rejected.
2. **Dynamic NPA Rate Synchronization:** Fuel pump rates in Ghana are reviewed bi-weekly by the National Petroleum Authority (NPA). Commute quotes must not become stale or result in cost over-recovery if fuel pump rates drop between drafting and departure.
3. **Double-Entry Financial Integrity:** In compliance with Bank of Ghana (BoG) e-money directives, user balances cannot be managed via mutable balance columns susceptible to race conditions.

---

## Decisions

### 1. ISO 3779 VIN Normalization & The 15-Year Rule
- **Chassis VIN Normalization:** Characters `I`, `O`, and `Q` are prohibited by ISO 3779. User and OCR inputs are automatically sanitized (`I -> 1`, `O -> 0`, `Q -> 0`) before Modulo-11 check digit verification.
- **Statutory Age Ceiling:** Vehicle age is mathematically evaluated as `current_year - manufacture_year <= 15`. In 2026, 2011 models pass (15 years) and 2010 models are rejected (16 years).

### 2. In-Progress Verification Gateway & SSE Dissolution
When government APIs (DVLA or NIC) experience latency or return HTTP 500/504 errors:
- The system gracefully degrades to a `VERIFICATION_PENDING` state rather than hard-blocking the user.
- The mobile app unlocks the **In-Progress Verification Gateway**, allowing the Host to draft their commute route, schedule, and seat capacity.
- The `[Publish Commute]` button remains locked with an Amber security indicator.
- Clients subscribe to a Server-Sent Events (SSE) stream (`/vehicles/:id/events`). Once the server's background reconciliation succeeds, a `VERIFICATION_SUCCESS` event dissolves the Amber lock into an active Indigo button with haptic feedback.

### 3. Versioned SVOC Table & JIT Recalculation
- SVOC rates are stored in a versioned table (`svoc_rate_versions`) tied to NPA rate windows (Class A: 140p/km, Class B: 210p/km, Class C: 333p/km).
- Every commute captures the active `svoc_rate_version` at creation (soft quote).
- At T-30 minutes, a JIT recalculation evaluates the current active NPA rate:
  - If rates dropped: the Co-Commuter's locked contribution automatically decreases, and the Monospace receipt displays the **"NPA Rate Adjusted"** badge.
  - If rates increased: the system honors the lower quoted rate for that specific commute so Co-Commuters are never surprised by rate increases.

### 4. Double-Entry Pre-Funded Wallet Ledger
All financial operations follow double-entry bookkeeping:
- Accounts: `USER_MAIN`, `ESCROW_HOLD`, `RESCUE_POOL`, `PSP_CLEARING`.
- All postings are recorded in safe integer **pesewas** (1 GH₵ = 100 pesewas).
- Invariant: `SUM(debits) === SUM(credits)` across every journal entry.
- Balance is mathematically derived from `SUM(credits) - SUM(debits)`.
- MoMo top-ups enforce idempotency keys to prevent duplicate transactions.
