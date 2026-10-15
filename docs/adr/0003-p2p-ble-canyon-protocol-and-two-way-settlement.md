# ADR 0003: Local P2P BLE Canyon Protocol, Geofence Settlement, and Pre-Commute Rating Guard

## Status
Accepted

## Context
Phase 3 transitions FeSCo from route drafting into live physical commute execution, handling real-world operational challenges in urban Accra:
1. **Underground Parking Connectivity Deadzones:** Corporate destinations like Osu Oxford Street and Airport City feature multi-level underground parking structures with 0 bars of cellular connectivity, making cloud-dependent drop-off verification impossible.
2. **Timing JIT Locks & Timer Drift:** Client countdowns easily drift if relative timers are used or when a Co-Commuter opens the app minutes into the lock window (e.g. 5:12 AM wake-up case).
3. **Settlement Race Conditions:** Geofence arrival triggers automated background settlement while Co-Commuters simultaneously slide `[Slide to End Commute]`, creating potential concurrency conflicts.
4. **Safety Review Accountability:** Corporate carpoolers require verified safety feedback without cumbersome rating funnels or developer-leaking error codes.

---

## Decisions

### 1. The Local P2P BLE Canyon Protocol
- **Deterministic 128-Bit Service UUID:** Devices derive a unique 128-bit Service UUID from `commuteId`. The Host (Central) scans strictly for this UUID, ignoring all other BLE devices and randomized MAC addresses in the garage.
- **iOS Background Notification Bypass:** When the Host writes `DROP_OFF_PING` over GATT, the Co-Commuter's backgrounded app immediately triggers a local OS notification (*"Host is initiating drop-off. Tap to confirm."*), bringing the app to the foreground to render the drop-off slide.
- **Signed Presence Token Exchange:** Co-Commuter generates an ephemeral SHA-256 presence token hash signed with their device key (`BLE_PRESENCE_ACK`).
- **MMKV Offline Sync Queue & NetInfo Flush:** The signed presence token is enqueued into MMKV storage. A `@react-native-community/netinfo` listener flushes the queue via `POST /commutes/:id/settle` the instant network connectivity is restored on the exit ramp.

### 2. Time-Series Execution & Absolute UTC Timestamps
- **Deterministic Timestamps:** SSE events (`COMMUTE_LOCKING`, `FUNDS_WARNING`) emit authoritative UTC timestamps (`lockExecutesAt`, `serverTimestamp`) rather than relative durations, allowing clients to calculate countdowns deterministically regardless of connection time.
- **Immediate Snapshot Hydration:** Upon SSE connection, `STATE_SNAPSHOT` is emitted immediately to prevent stale UI states.
- **Idempotent 200 Settlement:** Both manual slider and BullMQ auto-settle worker use deterministic key `settle:${commuteId}:${cocommuterId}`. If the background worker completes first, manual slide returns `200 OK` (`alreadySettled: true`) to ensure seamless UI snap without 400/409 errors.

### 3. Pre-Commute Rating Guard (`HTTP 428`) & Stateful Rating Modal
- **Zero-Latency Modal Hydration:** When a user with an unreviewed commute attempts to reserve or publish a seat, `PendingReviewGuard` returns `HTTP 428 Precondition Required` containing pre-hydrated display metadata (`counterpartyName`, `vehicleSummary`, `routeSummary`).
- **Client-Facing Typography:** User-facing UI buttons display human-centric copy (**`[Rate Last Commute to Unlock]`**), strictly reserving `HTTP 428` for internal protocol headers.
- **Keyboard-Safe Stateful Modal:** Wrapped in `KeyboardAvoidingView` to prevent the native keyboard from hiding the submit action. Dynamic validation locks enforce that 1–3 star ratings require selecting at least one mandatory quick-tag before submission.
