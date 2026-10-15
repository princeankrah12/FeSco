# FeSCo Platform Data Dictionary (The Lexicon)

## 1. Overview & Legal Mandate

FeSCo (Fuel Share Commute) is a not-for-profit cost-sharing utility for corporate professionals in Accra, Ghana. 

Under Ghanaian transport and insurance regulations, commercial transport activities require commercial licensing from the Driver and Vehicle Licensing Authority (DVLA) and commercial motor insurance. If private vehicle hosts were deemed to operate a commercial transport service, their private motor insurance policies would be invalidated and they would be liable for unlicensed commercial operation.

To ensure **hostile-auditor-proof compliance**, commercial transport terminology is strictly prohibited across:
1. **User Interface (Mobile & Web)**
2. **Database Schemas & Column Names**
3. **API Endpoints & DTOs**
4. **Codebase Identifiers & Comments**

---

## 2. Banned vs. Approved Terminology Matrix

| Banned Term (Prohibited) | Approved Replacement (Exclusive) | Legal & Compliance Rationale |
| :--- | :--- | :--- |
| **Driver** | **Host** | Prevents classification as a commercial operator. |
| **Passenger / Rider** | **Co-Commuter** | Avoids framing users as paying customers of a transport service. |
| **Fare / Price / Charge** | **Fuel Contribution** | Reflects pure shared cost recovery rather than commercial pricing. |
| **Ride / Trip** | **Commute** | Identifies the activity as a regular corporate commute, not a transport service for hire. |
| **Book / Order** | **Secure Seat** | Prevents contractual characterization of purchasing transportation. |
| **Profit / Earnings** | **Cost Offset / Reimbursement** | Proves mathematically and verbally that Hosts never generate income. |
| **Taxi / Cab** | **Private Vehicle** | Excludes commercial vehicle categories. |
| **Tip / Gratuity** | *(Not supported)* | Gratuities represent taxable income above cost offset. |
| **Surge** | *(Not supported)* | Operating costs are strictly standardized (SVOC); surge pricing is prohibited. |

---

## 3. Enforcement & Automated CI Gate

The lexicon is enforced automatically via:
- **CLI Gate**: `node tooling/lexicon/bin/fesco-lexicon.mjs` (runs as the very first step in CI).
- **ESLint Rule**: `@fesco/lexicon/no-banned-terms` providing immediate in-editor squiggly lines.
- **Exceptions**: Any genuine third-party technical exception must be documented with an explicit justification:
  ```ts
  // lexicon-allow: official statutory name of Ghana Driver and Vehicle Licensing Authority
  ```
  Suppressions lacking an explicit justification are rejected by the scanner.
