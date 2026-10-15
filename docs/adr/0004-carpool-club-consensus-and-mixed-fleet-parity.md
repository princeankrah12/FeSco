# ADR 0004: Carpool Club Consensus, Dynamic Drip-Funding Clamp, and Mixed-Fleet Cost Parity Invariant

## Status
Accepted

## Context
In multi-week rotating corporate Carpool Clubs (e.g., 4 corporate commuters rotating vehicle hosting week-by-week), game-theoretic and regulatory vulnerabilities arise if individual members operate disparate vehicle classes, experience chronic schedule friction, or unilaterally defect from their rotation obligations:

1. **Commercial Livery & Unearned Surplus Risk (Mixed-Fleet Fleets):**
   Under National Insurance Commission (NIC) guidelines, if a member operating a higher-cost vehicle (e.g., Class C Mercedes-Benz @ GH₵ 22.20/seat) receives higher compensation than the shared baseline of peer vehicles (e.g., Class B Toyota Camry @ GH₵ 14.00/seat), the rotation ceases to be cash-neutral across the 4-week cycle. Any net cash surplus converts the arrangement into taxable commercial conveyance, voiding private comprehensive motor insurance.

2. **Drip-Funding Ledger Overflow:**
   To lower financial onboarding barriers, FeSCo allows members to accumulate their GH₵ 60.00 (`6000` pesewas) continuity stake via upfront lock or incremental drips of `200` pesewas per commute. Unclamped increments near the ceiling (e.g., `5900` + `200` = `6100`) trigger fatal database aborts on PostgreSQL constraint `CHECK (continuity_stake_pesewas <= 6000)`.

3. **Asymmetric Swap Distortions:**
   Single-leg schedule adjustments alter the statutory invariant of exactly 5 hosting days per member per 4-week cycle, generating inequitable cost recovery and financial imbalances.

4. **Departure Time Coercion:**
   If a club shifts its departure time, dissenting members who cannot accommodate the adjustment risk forfeiting seats under standard cancellation penalties.

5. **Defection Vacancy Shock:**
   Sudden member defection leaves the remaining 3 members with uncompensated vehicle operating costs during their respective Hosting Weeks.

---

## Decisions

### 1. Mixed-Fleet Cost Parity Invariant
The dynamic club baseline rate is mathematically defined as the minimum operating cost across all member vehicles:
$$\text{BaselineRate} = \min_{v \in \text{Fleet}} \text{SVOC}_{\text{seat}}(v)$$

- When a higher-class vehicle joins a club, its allowable fuel cost recovery during its Hosting Week is strictly capped at $\text{BaselineRate}$.
- The 4-week net rotation cash delta across all members is mathematically locked to exactly **GH₵ 0.00**.
- **Intentional Consent Friction:** Joining with a vehicle requiring a cap triggers `ParityDisclosureModal`, presenting an audit-proof `Roboto Mono` ledger breakdown. The primary action remains disabled in Muted Slate (`#64748B`) until the member toggles an explicit consent checkbox.

### 2. Dynamic Drip-Funding Clamp & Dual-Line Receipt
The continuity stake installment is dynamically clamped on every commute lock:
$$\text{installment} = \max\Big(0, \min\big(200, 6000 - \text{currentStakePesewas}\big)\Big)$$

- Prevents check-constraint violation on the final installment (e.g., `5900p` $\to$ `+100p` $\to$ `6000p`).
- Once fully funded at `6000` pesewas, the dual-line receipt automatically collapses into:
  `"Club Continuity Stake ............ Secured (GH₵ 60.00)"`.

### 3. Boarding Initiation Delay Detector (AI Concierge)
To prevent unfair penalties stemming from Accra's unpredictable peak-hour road traffic:
- Delay evaluation is anchored strictly to boarding initiation ($\Delta t = t_{\text{actualHostBoardingStart}} - t_{\text{scheduledDeparture}}$), completely ignoring traffic-dependent destination arrival times.
- The AI Concierge generates a proactive relief swap recommendation only when $\ge 3$ consecutive weekday delays exceed 30 minutes.

### 4. Two-Party Handshake & Atomic Reciprocal Swap
Schedule adjustments are executed as an atomic two-row pairing:
- Swapping Host duties on Date A requires reciprocally exchanging Host duties on Date B between the exact same two members.
- Guarantees that every member maintains exactly 5 hosting days and 15 co-commuting days across every 4-week cycle.

### 5. 3/4 Consensus with Penalty-Free Release
- Permanent departure time shifts require a 75% supermajority (3 out of 4 members).
- Dissenting members who voted against the shift are automatically granted `penaltyFreeRelease = true`, enabling 1-tap seat surrender to the Ad-hoc pool without cancellation penalties or equity score degradation.

### 6. Defection Waterfall, Vacancy Backstop, and Relief Rebates
When a member defects before cycle completion:
1. Their `6000` pesewas stake is debited from `CLUB_CONTINUITY_ESCROW` and credited to `RELIEF_SUBSIDY_POOL`.
2. The defector's rotation equity score drops to `0.60`, accompanied by a mandatory 30-day club cooldown.
3. **Vacancy Backstop:** Remaining Hosts are paid $(3 - N) \times \text{BaselineRate}$ from the `RELIEF_SUBSIDY_POOL` to cover empty seats.
4. **Relief Rebate:** Any residual balance in the subsidy pool is distributed as non-withdrawable Riding Credit Rebates, displayed as `GH₵ 0.00 Lock (Relief Rebate)` during subsequent Co-Commuting Weeks.

---

## Consequences
- **Positive:** Immune to commercial transport reclassification under NIC guidelines; 100% mathematical cash neutrality across mixed fleets; zero database constraint violations on drip funding; seamless schedule flexibility without equity loss.
- **Negative:** Higher-class vehicle owners absorb an uncompensated fuel delta when operating in mixed-class clubs; requires member consensus discipline for schedule changes.
