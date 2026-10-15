import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveCommuteServiceUuid,
  generatePresenceTokenHash,
  signPresenceToken,
  BleCanyonManager,
  InMemoryStorageAdapter,
} from '../dist/index.js';

test('BLE Canyon Protocol: Service UUID is 128-bit deterministic and isolated per commute', () => {
  const commuteA = 'com_agape_osu_101';
  const commuteB = 'com_ablekuma_osu_202';

  const uuidA1 = deriveCommuteServiceUuid(commuteA);
  const uuidA2 = deriveCommuteServiceUuid(commuteA);
  const uuidB = deriveCommuteServiceUuid(commuteB);

  // Valid RFC 4122 8-4-4-4-12 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(uuidA1, uuidRegex);
  assert.match(uuidB, uuidRegex);

  // Determinism
  assert.equal(uuidA1, uuidA2);

  // Isolation (Host will only scan for their Co-Commuter, ignoring random garage BLE devices)
  assert.notEqual(uuidA1, uuidB);
});

test('BLE Canyon Protocol: Background Advertising triggers local OS notification and signs token', async () => {
  const storage = new InMemoryStorageAdapter();
  const manager = new BleCanyonManager(storage);

  const notificationsReceived = [];
  const unsubscribeNotification = manager.onDropOffNotification((msg) => {
    notificationsReceived.push(msg);
  });

  const commuteId = 'com_agape_osu_101';
  const seatId = 'seat_101_01';
  const hostDeviceId = 'dev_host_iphone_15';
  const cocommuterDeviceId = 'dev_cocommuter_pixel_8';

  // 1. Host connects and writes DROP_OFF_PING while Co-Commuter app is in background
  const presencePayload = await manager.handleIncomingDropOffPing({
    commuteId,
    seatId,
    hostDeviceId,
    cocommuterDeviceId,
    rssiLevel: -65,
    isInBackground: true,
  });

  // Local OS notification triggered to bring app to foreground
  assert.equal(notificationsReceived.length, 1);
  assert.equal(notificationsReceived[0], 'Host is initiating drop-off. Tap to confirm.');

  // Signed token generated
  assert.ok(presencePayload.tokenHash.startsWith('tok_'));
  assert.ok(presencePayload.signature.startsWith('sig_cocommuter_'));
  assert.equal(presencePayload.commuteId, commuteId);
  assert.equal(presencePayload.rssiLevel, -65);

  // 2. Token automatically enqueued in MMKV offline settlement queue
  const queue = manager.getOfflineQueue();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].commuteId, commuteId);
  assert.equal(queue[0].synced, false);

  unsubscribeNotification();
});

test('BLE Canyon Protocol: Offline MMKV Queue auto-flushes upon exit ramp network reconnection', async () => {
  const storage = new InMemoryStorageAdapter();
  const manager = new BleCanyonManager(storage);

  const commuteId = 'com_agape_osu_101';

  // Enqueue 2 offline presence tokens while underground (0 bars)
  await manager.handleIncomingDropOffPing({
    commuteId,
    seatId: 'seat_101_01',
    hostDeviceId: 'dev_host_iphone_15',
    cocommuterDeviceId: 'dev_cocommuter_01',
    rssiLevel: -60,
    isInBackground: false,
  });

  await manager.handleIncomingDropOffPing({
    commuteId,
    seatId: 'seat_101_02',
    hostDeviceId: 'dev_host_iphone_15',
    cocommuterDeviceId: 'dev_cocommuter_02',
    rssiLevel: -58,
    isInBackground: false,
  });

  const queueUnderground = manager.getOfflineQueue();
  assert.equal(queueUnderground.length, 2);
  assert.equal(queueUnderground.every((i) => !i.synced), true);

  // Still offline inside basement parking: no flush
  const offlineFlushResult = await manager.handleNetworkTransition(false);
  assert.equal(offlineFlushResult.length, 0);

  // Vehicle ascends exit ramp: NetInfo.isConnected transitions to true
  const settleApiCalls = [];
  const flushedItems = await manager.handleNetworkTransition(true, async (item) => {
    settleApiCalls.push(item.id);
    return true; // Simulate successful POST /commutes/:id/settle
  });

  assert.equal(flushedItems.length, 2);
  assert.equal(settleApiCalls.length, 2);

  // MMKV storage updated with synced status
  const queueAfterExitRamp = manager.getOfflineQueue();
  assert.equal(queueAfterExitRamp.length, 2);
  assert.equal(queueAfterExitRamp.every((i) => i.synced), true);
});
