# FeSCo (Fuel Share Commute)

> High-security, legally compliant not-for-profit commute cost-sharing platform for corporate professionals in Accra, Ghana.

---

## 1. Project Overview & The Legal Mandate

FeSCo is engineered from the ground up to be **"Hostile-Auditor-Proof."** 

Under Ghanaian transport and insurance regulations, commercial transport operations require commercial operator licensing from the DVLA and commercial liability insurance. If private vehicle hosts were deemed to operate a commercial transport service, their private motor insurance policies would be invalidated and they would be liable for unlicensed commercial operation.

FeSCo legally operates strictly as a **not-for-profit cost-sharing utility**:
1. **Mathematical Invariance**: Standardized Vehicle Operating Cost (SVOC) formulas and floor-rounded pesewas math prove that Hosts never recover more than actual vehicle operating costs.
2. **The Rescue Pool**: Late-cancellation penalties are never paid as windfall surplus to Hosts. Only verified detours driven at SVOC are reimbursed; the remainder is transferred to a centralized Rescue Pool to subsidize emergency breakdown rescue matches.
3. **The Lexicon**: Commercial transport terms are banned across the entire mobile UI, database schema, API endpoints, and codebase (see [Platform Data Dictionary](docs/LEXICON.md)).

---

## 2. Monorepo Architecture

```
fesco/
├── apps/
│   ├── mobile/         # React Native (Expo Router) native mobile application
│   └── api/            # Backend API (NestJS + PostGIS nearest-stop routing)
├── packages/
│   ├── domain/         # Pure domain logic: SVOC math, floor-rounding proofs, JIT state machine
│   └── tokens/         # Design token system: status colors, monospace math, 8pt grid
├── tooling/
│   └── lexicon/        # Platform Data Dictionary scanner CLI and ESLint rule
├── docs/
│   ├── LEXICON.md      # Platform Data Dictionary and compliance rules
│   └── adr/            # Architectural Decision Records
└── docker-compose.yml  # PostgreSQL 16 + PostGIS spatial database
```

---

## 3. Quickstart & Commands

### Prerequisites
- Node.js >= 22.0.0
- Docker (optional, for local PostGIS database)

### Verification & Testing
```bash
# 1. Authoritative Lexicon Gate (scans all files for banned commercial terms)
npm run lint:lexicon

# 2. Build shared packages (@fesco/tokens, @fesco/domain)
npm run build:packages

# 3. Run all test suites (Domain, Property Tests, API Integration, Lexicon)
npm test

# 4. Full CI verification check
npm run verify
```

### Starting the Applications
```bash
# Start local PostGIS container
docker compose up -d postgres

# Start Mobile Dev Server (Expo)
npm run mobile:dev

# Start Backend API Dev Server
npm run api:dev
```

---

## 4. Phase 1 Features: The Trust Engine

- **Corporate Gatekeeper**: Email validation gated to verified employer domains (`@gcbbank.com.gh`, `@stanbic.com.gh`, `@mtn.com.gh`, etc.), corporate recognition badges, and "Request Company Addition" workflow.
- **Biometric KYC UI (Subtractive Dark Mask)**:
  - **Step A (Document)**: 70% opacity dark overlay (`#0F172A`) with rectangular transparent punch-out and dashed pulsing border for Ghana Card OCR auto-capture.
  - **Step B (Liveness)**: Circular transparent punch-out with blink detection and Emerald success ring feedback.
  - **Permission Trap**: Camera permission recovery screen with direct OS Settings deep-linking (`Linking.openSettings()`).
- **Financial Heartbeat Commute Card**:
  - Flexbox auto-layout on 8pt grid with 300ms ease-out transitions.
  - 5 dynamic stages: Anticipation (Confirmed Emerald pill), Teasheet T-30 (Amber pulsing live countdown), Processing T-10 (flattened z-depth), Success T-9 (popped z-depth), Osu/Airport City Exemption ("Cleared for Boarding" badge).
  - Two-typeface system: Sans-Serif for instructions, Monospace for receipt math (`Total Cost ÷ 3 seats = Fuel Contribution`).
- **Flexible AI Routing (Nearest Stop Match)**:
  - Automatically matches Co-Commuters to nearest route intersections (e.g. Agape Junction) and dynamically recalculates fuel contributions for the shorter leg.
- **Government Verification Adapters**:
  - Mock adapters for NIA (Ghana Card biometrics), NIC MID (Comprehensive Insurance check), and DVLA (vehicle roadworthiness & age < 15 years) with graceful degradation to Amber "Verification Pending" on timeout/500 errors.
