import {
  deriveCommuteServiceUuid,
  generatePresenceTokenHash,
  signPresenceToken,
  BlePresencePayload,
  OfflineSettlementQueueItem,
} from '@fesco/domain';

export interface StorageAdapter {
  getString(key: string): string | null | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

/**
 * In-memory fallback storage adapter for testing and platforms without native MMKV.
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  getString(key: string): string | null | undefined {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

export type NetworkChangeListener = (isConnected: boolean) => void;

/**
 * Local P2P BLE Canyon Protocol Manager
 *
 * Implements:
 * 1. Deterministic 128-bit Service UUID scanning (ignoring randomized MAC addresses & noisy BLE devices).
 * 2. Background GATT drop-off notification trigger ("Host is initiating drop-off. Tap to confirm.").
 * 3. Cryptographically signed BLE_PRESENCE_ACK token exchange.
 * 4. MMKV offline sync queue that flushes automatically when vehicle exits parking garage ramp.
 */
export class BleCanyonService {
  private storage: StorageAdapter;
  private queueKey = 'offline_settlement_queue';
  private notificationListeners = new Set<(notificationText: string) => void>();
  private flushListeners = new Set<(syncedItems: OfflineSettlementQueueItem[]) => void>();
  private isOnline = false;

  constructor(storageAdapter?: StorageAdapter) {
    this.storage = storageAdapter ?? new InMemoryStorageAdapter();
  }

  /**
   * Derives the deterministic 128-bit Service UUID for this commute.
   */
  getCommuteServiceUuid(commuteId: string): string {
    return deriveCommuteServiceUuid(commuteId);
  }

  /**
   * Registers a listener for local OS background notifications.
   */
  onDropOffNotification(listener: (notificationText: string) => void): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  /**
   * Registers a listener for completed offline queue flushes.
   */
  onQueueFlushed(listener: (syncedItems: OfflineSettlementQueueItem[]) => void): () => void {
    this.flushListeners.add(listener);
    return () => this.flushListeners.delete(listener);
  }

  /**
   * Host Central writes DROP_OFF_PING to Co-Commuter characteristic.
   *
   * Architectural Guardrail 1B (The iOS Background Advertising Trap):
   * Fires a local OS notification ("Host is initiating drop-off. Tap to confirm.")
   * to bring Co-Commuter app to foreground and render [Slide to End Commute].
   */
  async handleIncomingDropOffPing(params: {
    commuteId: string;
    seatId: string;
    hostDeviceId: string;
    cocommuterDeviceId: string;
    rssiLevel: number;
    isInBackground: boolean;
  }): Promise<BlePresencePayload> {
    const notificationMessage = 'Host is initiating drop-off. Tap to confirm.';

    if (params.isInBackground) {
      for (const listener of this.notificationListeners) {
        try {
          listener(notificationMessage);
        } catch {
          // Ignore listener errors
        }
      }
    }

    const salt = `salt_${Date.now()}`;
    const exchangedAt = new Date().toISOString();

    const tokenHash = generatePresenceTokenHash({
      commuteId: params.commuteId,
      seatId: params.seatId,
      hostDeviceId: params.hostDeviceId,
      cocommuterDeviceId: params.cocommuterDeviceId,
      salt,
      exchangedAt,
    });

    const signature = signPresenceToken(tokenHash, params.cocommuterDeviceId);

    const payload: BlePresencePayload = {
      commuteId: params.commuteId,
      seatId: params.seatId,
      hostDeviceId: params.hostDeviceId,
      cocommuterDeviceId: params.cocommuterDeviceId,
      rssiLevel: params.rssiLevel,
      salt,
      exchangedAt,
      tokenHash,
      signature,
    };

    // Store signed BLE presence token into MMKV offline queue immediately
    this.enqueueOfflineSettlement({
      id: `queue_${Date.now()}`,
      commuteId: params.commuteId,
      cocommuterId: params.cocommuterDeviceId,
      tokenPayload: payload,
      queuedAt: exchangedAt,
      synced: false,
    });

    return payload;
  }

  /**
   * Appends an offline presence settlement item to MMKV storage.
   */
  enqueueOfflineSettlement(item: OfflineSettlementQueueItem): void {
    const queue = this.getOfflineQueue();
    queue.push(item);
    this.storage.set(this.queueKey, JSON.stringify(queue));
  }

  getOfflineQueue(): OfflineSettlementQueueItem[] {
    const raw = this.storage.getString(this.queueKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Simulates or handles network transitions from NetInfo listener.
   *
   * Architectural Guardrail 1C (The MMKV Offline Sync Queue):
   * The exact millisecond NetInfo.isConnected transitions to true as vehicle exits ramp,
   * flushes all queued items via settlement callback.
   */
  async handleNetworkTransition(
    isConnected: boolean,
    settleApiCallback?: (item: OfflineSettlementQueueItem) => Promise<boolean>,
  ): Promise<OfflineSettlementQueueItem[]> {
    this.isOnline = isConnected;
    if (!isConnected) return [];

    const queue = this.getOfflineQueue();
    const unsynced = queue.filter((i) => !i.synced);
    if (unsynced.length === 0) return [];

    const flushedItems: OfflineSettlementQueueItem[] = [];

    for (const item of unsynced) {
      let success = true;
      if (settleApiCallback) {
        success = await settleApiCallback(item);
      }
      if (success) {
        item.synced = true;
        flushedItems.push(item);
      }
    }

    // Persist updated queue to MMKV
    this.storage.set(this.queueKey, JSON.stringify(queue));

    for (const listener of this.flushListeners) {
      try {
        listener(flushedItems);
      } catch {
        // Ignore listener exceptions
      }
    }

    return flushedItems;
  }

  clearQueue(): void {
    this.storage.delete(this.queueKey);
  }
}
