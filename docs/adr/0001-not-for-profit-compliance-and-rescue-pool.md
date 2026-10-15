# ADR 0001: Not-For-Profit Cost Recovery & The FeSCo Rescue Pool

## Status
Accepted

## Context
Under Ghanaian law and National Insurance Commission (NIC) guidelines, private comprehensive motor insurance policies are voided if a vehicle is used for hire or reward (commercial conveyance). To maintain safe harbor as a bona fide cost-sharing utility:
1. Hosts must recover only legitimate fuel and operating wear-and-tear costs.
2. Hosts must never receive net income, surplus, or windfall financial gains.
3. Mathematical calculations must withstand hostile regulatory audit.

The original product specification contained three areas of regulatory vulnerability:
1. Cancellation penalties paid directly to the Host for commutes that never occurred would be legally classified as commercial fee income.
2. Floating-point division and standard half-up rounding could result in three seat contributions summing to more than the actual kilometric operating cost.
3. Hardcoded SVOC rates could diverge from National Petroleum Authority (NPA) bi-weekly pump rates.

## Decisions

### 1. The FeSCo Rescue Pool for Late Cancellations
When a Co-Commuter cancels late (T-30 to T-10 at 50%, or < T-10 at 100%):
- The Host is **only** reimbursed for verified kilometric detours actually driven up to the cancellation point (calculated via SVOC).
- The remainder of the penalty is credited to the centralized **FeSCo Rescue Pool**.
- The Rescue Pool is strictly reserved to subsidize emergency AI rescues (e.g. when another Host vehicle experiences a mechanical breakdown en route).
- **Audit defense**: The Host receives zero unearned surplus.

### 2. Pesewas Integer Representation & Floor-Rounding Proof
All monetary amounts are represented as safe integer pesewas (1 GH₵ = 100 pesewas). Seat contribution calculation uses integer floor-division:
$$\text{seatContribution} = \lfloor \frac{\text{totalCost}}{3} \rfloor$$

This mathematically guarantees the non-profit invariance theorem:
$$\sum_{i=1}^{3} \text{seatContribution}_i \le \text{totalCost}$$
Property-based tests simulate 1,000+ commutes across distances from 1.0 km to 100.0 km and confirm zero surplus recovery.

### 3. Versioned SVOC Rate Tables
SVOC rates are configured in versioned registries tied to NPA rate windows and DVLA engine displacement classes (Class A: <1500cc @ GH₵ 1.40/km, Class B: 1500–2500cc @ GH₵ 2.10/km, Class C: >2500cc @ GH₵ 3.33/km). Every receipt and transaction logs the active `svoc_rate_version` for audit traceability.

### 4. Osu / Airport City Corporate Geofence Exemption
To address unpredictable banking hours in Accra's corporate centers, users located in Osu and Airport City geofences bypass the T-10 minute hard lock. Instead, at T-30 minutes, their wallet balance is verified. If sufficient, a "Cleared for Boarding" badge is issued, and funds are secured upon vehicle door BLE/QR handshake, preventing false forfeitures.
