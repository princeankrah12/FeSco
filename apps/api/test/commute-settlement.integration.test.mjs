import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CommuteExecutionService,
  PendingReviewGuard,
  PreconditionRequiredException,
  TeasheetWorkerProcessor,
  JitLockWorkerProcessor,
  AutoSettleWorkerProcessor,
  WalletService,
  SvocService,
} from '../dist/index.js';

test('Phase 3 Suite A (Happy Path): T-30 Teasheet -> SSE Snapshot -> T-10 Lock -> BLE Presence -> Settle Race Resolution -> Review Guard', async () => {
  const walletService = new WalletService();
  const svocService = new SvocService();
  const commuteService = new CommuteExecutionService(walletService, svocService);
  const pendingReviewGuard = new PendingReviewGuard(commuteService);

  const hostUserId = 'usr_kwame_stanbic_001';
  const cocommuterUserId = 'usr_akua_standard_002';
  const commuteId = 'com_agape_osu_101';
  const seatId = 'seat_101_01';

  // 1. Setup pre-funded wallets (MoMo top-up)
  await walletService.topUpViaMomo({
    userId: cocommuterUserId,
    amountPesewas: 5000, // GH₵ 50.00
    momoReference: 'momo_ref_topup_cocommuter_01',
    idempotencyKey: 'idemp_topup_cocommuter_01',
  });

  const scheduledDeparture = new Date('2026-10-15T05:40:00.000Z');

  // Register scheduled commute
  commuteService.createCommute({
    id: commuteId,
    host_id: hostUserId,
    origin_name: 'Agape Junction',
    destination_name: 'Osu Oxford Street',
    origin_lat: 5.5896,
    origin_lng: -0.3204,
    destination_lat: 5.556,
    destination_lng: -0.1818,
    route_polyline: 'mock_polyline_agape_osu',
    distance_km: 16.5,
    engine_class: 'B',
    svoc_rate_version: '2026.1-DVLA',
    total_operating_cost_pesewas: 3465, // GH₵ 34.65
    seat_contribution_pesewas: 1155, // GH₵ 11.55 (floor-rounded)
    scheduled_departure: scheduledDeparture,
    commute_status: 'SCHEDULED',
    created_at: new Date('2026-10-14T20:00:00.000Z'),
  });

  commuteService.reserveSeat({
    id: seatId,
    commute_id: commuteId,
    cocommuter_id: cocommuterUserId,
    seat_status: 'RESERVED',
    pickup_stop_name: 'Agape Junction (Convergence Node)',
    is_nearest_stop_match: true,
    contribution_pesewas: 1155,
    created_at: new Date('2026-10-14T20:05:00.000Z'),
  });

  // Track SSE events emitted by commute service
  const receivedEvents = [];
  const unsubscribe = commuteService.subscribeToCommuteEvents(commuteId, (event) => {
    receivedEvents.push(event);
  });

  // Verification of Immediate State Hydration on SSE Connect (Initial Snapshot)
  assert.equal(receivedEvents.length, 1);
  assert.equal(receivedEvents[0].type, 'STATE_SNAPSHOT');
  assert.equal(receivedEvents[0].commuteId, commuteId);
  assert.equal(receivedEvents[0].status, 'SCHEDULED');
  assert.ok(receivedEvents[0].serverTimestamp);
  assert.equal(receivedEvents[0].scheduledDeparture, '2026-10-15T05:40:00.000Z');
  assert.equal(receivedEvents[0].lockExecutesAt, '2026-10-15T05:30:00.000Z');

  // 2. T-30 Teasheet Worker Execution (05:10:00 UTC)
  const teasheetProcessor = new TeasheetWorkerProcessor(commuteService);
  const teasheetResult = await teasheetProcessor.process({
    id: 'job_teasheet_01',
    name: 'teasheet-job',
    data: { commuteId },
  });

  assert.equal(teasheetResult.status, 'LOCKING');
  const lockingEvent = receivedEvents.find((e) => e.type === 'COMMUTE_LOCKING');
  assert.ok(lockingEvent);
  assert.equal(lockingEvent.lockExecutesAt, '2026-10-15T05:30:00.000Z');
  assert.equal(lockingEvent.seatContributionPesewas, 1155);

  // Late connecting client (5:12 AM wake-up case):
  // Verifies that a newly connecting client immediately receives current snapshot with absolute timestamps
  let lateClientSnapshot = null;
  commuteService.subscribeToCommuteEvents(commuteId, (event) => {
    if (event.type === 'STATE_SNAPSHOT') {
      lateClientSnapshot = event;
    }
  });

  assert.ok(lateClientSnapshot);
  assert.equal(lateClientSnapshot.status, 'LOCKING');
  assert.equal(lateClientSnapshot.lockExecutesAt, '2026-10-15T05:30:00.000Z');

  // 3. T-10 JIT Lock Worker Execution (05:30:00 UTC)
  const jitLockProcessor = new JitLockWorkerProcessor(commuteService);
  const jitLockResult = await jitLockProcessor.process({
    id: 'job_jitlock_01',
    name: 'jit-lock-job',
    data: { commuteId },
  });

  assert.equal(jitLockResult.securedSeats, 1);
  assert.equal(jitLockResult.forfeitedSeats, 0);

  const securedEvent = receivedEvents.find((e) => e.type === 'COMMUTE_SECURED');
  assert.ok(securedEvent);
  assert.equal(securedEvent.allowsBoarding, true);

  // Spendable balance on USER_MAIN decreased by held 1155 pesewas
  const cocommuterBalanceAfterLock = walletService.getUserBalance(cocommuterUserId);
  assert.equal(cocommuterBalanceAfterLock.pesewas, 5000 - 1155); // 3845 pesewas

  // 4. Commute starts & Offline BLE Presence Token is logged
  commuteService.startCommuteInTransit(commuteId);
  assert.equal(commuteService.getCommute(commuteId)?.commute_status, 'IN_TRANSIT');

  commuteService.logBlePresenceToken({
    id: 'ble_tok_01',
    commute_id: commuteId,
    seat_id: seatId,
    host_device_id: 'dev_host_iphone15',
    cocommuter_device_id: 'dev_cocommuter_pixel8',
    token_hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    signature: 'sig_valid_offline_gatt_dropoff_ack',
    rssi_level: -62,
    exchanged_at: new Date('2026-10-15T06:15:00.000Z'),
    synced_at: new Date('2026-10-15T06:15:05.000Z'),
    is_verified: true,
  });

  assert.equal(commuteService.getBleTokensForCommute(commuteId).length, 1);

  // 5. Destination Geofence Settlement: Auto-Settle Worker vs Manual Slider Race
  // Worker fires at minute 5:00 (AutoSettleWorker)
  const autoSettleProcessor = new AutoSettleWorkerProcessor(commuteService);
  const autoSettleResult = await autoSettleProcessor.process({
    id: 'job_autosettle_01',
    name: 'auto-settle-job',
    data: { commuteId, cocommuterId: cocommuterUserId },
  });

  assert.equal(autoSettleResult.alreadySettled, false);
  assert.equal(autoSettleResult.commuteStatus, 'PENDING_REVIEW');

  // Verify Host spendable balance increased by 1155 pesewas cost offset recovery
  const hostBalance = walletService.getUserBalance(hostUserId);
  assert.equal(hostBalance.pesewas, 1155);

  // Co-Commuter drags slider 50ms later: manual settle call
  const manualSettleResult = await commuteService.settleCommute({
    commuteId,
    cocommuterId: cocommuterUserId,
    trigger: 'MANUAL_SLIDER',
  });

  // Idempotent 200 OK resolution (no 400 or 409 error)
  assert.equal(manualSettleResult.statusCode, 200);
  assert.equal(manualSettleResult.alreadySettled, true);
  assert.equal(manualSettleResult.commuteStatus, 'PENDING_REVIEW');

  // 6. Pre-Commute Rating Guard (HTTP 428 Precondition Required)
  // Co-commuter attempts to schedule next commute before completing review
  let thrownGuardException = null;
  try {
    await pendingReviewGuard.canActivate(cocommuterUserId);
  } catch (err) {
    thrownGuardException = err;
  }

  assert.ok(thrownGuardException instanceof PreconditionRequiredException);
  assert.equal(thrownGuardException.statusCode, 428);
  assert.equal(thrownGuardException.code, 'PENDING_REVIEW_REQUIRED');

  // Verify self-contained payload for zero-latency modal hydration
  const payload = thrownGuardException.toJSON();
  assert.equal(payload.pendingReview.commuteId, commuteId);
  assert.equal(payload.pendingReview.counterpartyRole, 'HOST');
  assert.equal(payload.pendingReview.routeSummary, 'Agape Junction → Osu Oxford Street');

  // User submits 5-star safety review
  await commuteService.submitReview({
    commuteId,
    reviewerId: cocommuterUserId,
    revieweeId: hostUserId,
    ratingStars: 5,
    safetyTags: ['Punctual', 'Respectful', 'Smooth Driving'],
    feedbackComment: 'Excellent shared commute.',
  });

  // Guard now clears for next commute
  const canActivateNext = await pendingReviewGuard.canActivate(cocommuterUserId);
  assert.equal(canActivateNext, true);
  assert.equal(commuteService.getCommute(commuteId)?.commute_status, 'COMPLETED');

  unsubscribe();
});

test('Phase 3 Suite B (Unhappy Path): Insufficient Wallet Balance -> FUNDS_WARNING -> LOCK_FAILED (Seat Forfeited)', async () => {
  const walletService = new WalletService();
  const svocService = new SvocService();
  const commuteService = new CommuteExecutionService(walletService, svocService);

  const hostUserId = 'usr_kwame_stanbic_001';
  const brokeUserId = 'usr_broke_user_003';
  const commuteId = 'com_unhappy_102';
  const seatId = 'seat_102_01';

  // Co-commuter has 0 pesewas in wallet (required: 1155)
  commuteService.createCommute({
    id: commuteId,
    host_id: hostUserId,
    origin_name: 'Agape Junction',
    destination_name: 'Osu Oxford Street',
    origin_lat: 5.5896,
    origin_lng: -0.3204,
    destination_lat: 5.556,
    destination_lng: -0.1818,
    route_polyline: 'mock_polyline',
    distance_km: 16.5,
    engine_class: 'B',
    svoc_rate_version: '2026.1-DVLA',
    total_operating_cost_pesewas: 3465,
    seat_contribution_pesewas: 1155,
    scheduled_departure: new Date('2026-10-15T05:40:00.000Z'),
    commute_status: 'SCHEDULED',
    created_at: new Date(),
  });

  commuteService.reserveSeat({
    id: seatId,
    commute_id: commuteId,
    cocommuter_id: brokeUserId,
    seat_status: 'RESERVED',
    pickup_stop_name: 'Agape Junction',
    is_nearest_stop_match: false,
    contribution_pesewas: 1155,
    created_at: new Date(),
  });

  const receivedEvents = [];
  commuteService.subscribeToCommuteEvents(commuteId, (e) => receivedEvents.push(e));

  // T-30 Teasheet Worker runs
  await commuteService.executeTeasheetWindow(commuteId);

  const fundsWarning = receivedEvents.find((e) => e.type === 'FUNDS_WARNING');
  assert.ok(fundsWarning);
  assert.equal(fundsWarning.requiredPesewas, 1155);
  assert.equal(fundsWarning.currentPesewas, 0);
  assert.equal(fundsWarning.shortfallPesewas, 1155);

  // T-10 JIT Lock Worker runs and fails
  const jitLockResult = await commuteService.executeJitLock(commuteId);
  assert.equal(jitLockResult.securedSeats, 0);
  assert.equal(jitLockResult.forfeitedSeats, 1);

  const lockFailed = receivedEvents.find((e) => e.type === 'LOCK_FAILED');
  assert.ok(lockFailed);
  assert.equal(lockFailed.reason, 'INSUFFICIENT_FUNDS');

  const seat = commuteService.getSeatsForCommute(commuteId)[0];
  assert.equal(seat.seat_status, 'FORFEITED');
});
