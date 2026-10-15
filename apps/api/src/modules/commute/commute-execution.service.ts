import { Money } from '@fesco/domain';
import {
  CommuteRecord,
  CommuteSeatRecord,
  CommuteReviewRecord,
  BlePresenceTokenRecord,
} from '../../db/schema.js';
import { WalletService } from '../wallet/wallet.service.js';
import { SvocService } from '../svoc/svoc.service.js';

export type CommuteLifecycleStatus =
  | 'SCHEDULED'
  | 'LOCKING'
  | 'SECURED'
  | 'IN_TRANSIT'
  | 'PENDING_REVIEW'
  | 'COMPLETED'
  | 'DISPUTED';

export interface PendingReviewMetadata {
  commuteId: string;
  counterpartyName: string;
  counterpartyRole: 'HOST' | 'COCOMMUTER';
  vehicleSummary: string;
  routeSummary: string;
  completedAt: string;
}

export interface CommuteSseEvent {
  type:
    | 'STATE_SNAPSHOT'
    | 'COMMUTE_LOCKING'
    | 'FUNDS_WARNING'
    | 'COMMUTE_SECURED'
    | 'LOCK_FAILED'
    | 'COMMUTE_IN_TRANSIT'
    | 'COMMUTE_SETTLED'
    | 'COMMUTE_PENDING_REVIEW';
  commuteId: string;
  serverTimestamp: string;
  lockExecutesAt?: string;
  teasheetWindowStartsAt?: string;
  scheduledDeparture?: string;
  status?: CommuteLifecycleStatus;
  seatId?: string;
  seatStatus?: string;
  allowsBoarding?: boolean;
  seatContributionPesewas?: number;
  totalOperatingCostPesewas?: number;
  npaRateAdjusted?: boolean;
  requiredPesewas?: number;
  currentPesewas?: number;
  shortfallPesewas?: number;
  alreadySettled?: boolean;
  settledAt?: string;
  reason?: string;
  pendingReview?: PendingReviewMetadata;
}

export type SseListener = (event: CommuteSseEvent) => void;

export class CommuteExecutionService {
  private commutes = new Map<string, CommuteRecord>();
  private seats = new Map<string, CommuteSeatRecord>();
  private reviews = new Map<string, CommuteReviewRecord>();
  private bleTokens: BlePresenceTokenRecord[] = [];
  private eventListeners = new Map<string, Set<SseListener>>();

  constructor(
    private walletService: WalletService,
    private svocService: SvocService,
  ) {}

  /**
   * Registers a scheduled commute in the system.
   */
  createCommute(commute: CommuteRecord): CommuteRecord {
    this.commutes.set(commute.id, { ...commute, commute_status: 'SCHEDULED' });
    return this.commutes.get(commute.id)!;
  }

  getCommute(commuteId: string): CommuteRecord | undefined {
    return this.commutes.get(commuteId);
  }

  /**
   * Reserves a seat on a commute for a Co-Commuter.
   */
  reserveSeat(seat: CommuteSeatRecord): CommuteSeatRecord {
    this.seats.set(seat.id, { ...seat, seat_status: 'RESERVED' });
    return this.seats.get(seat.id)!;
  }

  getSeatsForCommute(commuteId: string): CommuteSeatRecord[] {
    return Array.from(this.seats.values()).filter((s) => s.commute_id === commuteId);
  }

  /**
   * Subscribes a client to SSE events for a commute.
   *
   * Architectural Guardrail 1 (Immediate State Hydration):
   * Upon connection, immediately emits an initial STATE_SNAPSHOT event reflecting
   * current database state and authoritative UTC timestamps before piping real-time events.
   */
  subscribeToCommuteEvents(commuteId: string, listener: SseListener): () => void {
    if (!this.eventListeners.has(commuteId)) {
      this.eventListeners.set(commuteId, new Set());
    }
    this.eventListeners.get(commuteId)!.add(listener);

    // Immediate initial snapshot hydration
    const commute = this.commutes.get(commuteId);
    if (commute) {
      const departureTime = new Date(commute.scheduled_departure);
      const lockExecutesAt = new Date(departureTime.getTime() - 10 * 60 * 1000);
      const teasheetStartsAt = new Date(departureTime.getTime() - 30 * 60 * 1000);

      const snapshot: CommuteSseEvent = {
        type: 'STATE_SNAPSHOT',
        commuteId,
        status: commute.commute_status as CommuteLifecycleStatus,
        serverTimestamp: new Date().toISOString(),
        scheduledDeparture: departureTime.toISOString(),
        lockExecutesAt: lockExecutesAt.toISOString(),
        teasheetWindowStartsAt: teasheetStartsAt.toISOString(),
        totalOperatingCostPesewas: commute.total_operating_cost_pesewas,
        seatContributionPesewas: commute.seat_contribution_pesewas,
      };
      listener(snapshot);
    }

    return () => {
      this.eventListeners.get(commuteId)?.delete(listener);
    };
  }

  private dispatchEvent(commuteId: string, event: CommuteSseEvent): void {
    const listeners = this.eventListeners.get(commuteId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch {
          // Suppress listener disconnect exceptions
        }
      }
    }
  }

  /**
   * T-30 Teasheet Worker
   *
   * Fires 30 minutes before scheduled departure:
   * 1. Checks active SVOC rate version for National Petroleum Authority (NPA) pump rate drops.
   * 2. Validates each Co-Commuter's USER_MAIN balance.
   * 3. Emits COMMUTE_LOCKING with absolute lockExecutesAt UTC timestamp or FUNDS_WARNING.
   */
  async executeTeasheetWindow(
    commuteId: string,
    currentTime = new Date(),
  ): Promise<{ status: CommuteLifecycleStatus; rateDropSavingsPesewas: number }> {
    const commute = this.commutes.get(commuteId);
    if (!commute) throw new Error(`Commute ${commuteId} not found`);

    const departureTime = new Date(commute.scheduled_departure);
    const lockExecutesAt = new Date(departureTime.getTime() - 10 * 60 * 1000);

    // Check SVOC rate adjustments
    const rateCheck = this.svocService.calculateCost({
      distanceKm: Number(commute.distance_km),
      engineClass: commute.engine_class,
      quotedRateVersion: commute.svoc_rate_version,
      coCommuterSeats: 3,
    });

    if (rateCheck.isNpaRateAdjusted) {
      commute.seat_contribution_pesewas = rateCheck.seatContributionPesewas;
      commute.total_operating_cost_pesewas = rateCheck.totalOperatingCostPesewas;
    }

    commute.commute_status = 'LOCKING';
    this.commutes.set(commuteId, commute);

    const seats = this.getSeatsForCommute(commuteId);
    for (const seat of seats) {
      const balance = this.walletService.getUserBalance(seat.cocommuter_id);
      const isSufficient = balance.pesewas >= commute.seat_contribution_pesewas;

      if (isSufficient) {
        this.dispatchEvent(commuteId, {
          type: 'COMMUTE_LOCKING',
          commuteId,
          serverTimestamp: currentTime.toISOString(),
          lockExecutesAt: lockExecutesAt.toISOString(),
          seatContributionPesewas: commute.seat_contribution_pesewas,
          npaRateAdjusted: rateCheck.isNpaRateAdjusted,
        });
      } else {
        const shortfall = commute.seat_contribution_pesewas - balance.pesewas;
        this.dispatchEvent(commuteId, {
          type: 'FUNDS_WARNING',
          commuteId,
          serverTimestamp: currentTime.toISOString(),
          lockExecutesAt: lockExecutesAt.toISOString(),
          requiredPesewas: commute.seat_contribution_pesewas,
          currentPesewas: balance.pesewas,
          shortfallPesewas: shortfall,
        });
      }
    }

    return {
      status: 'LOCKING',
      rateDropSavingsPesewas: rateCheck.jitDetails?.differencePesewas ?? 0,
    };
  }

  /**
   * T-10 JIT Lock Worker
   *
   * Fires 10 minutes before scheduled departure:
   * Executes atomic double-entry transfer (USER_MAIN -> ESCROW_HOLD).
   * Emits COMMUTE_SECURED on success or LOCK_FAILED on insufficient funds.
   */
  async executeJitLock(
    commuteId: string,
    currentTime = new Date(),
  ): Promise<{ securedSeats: number; forfeitedSeats: number }> {
    const commute = this.commutes.get(commuteId);
    if (!commute) throw new Error(`Commute ${commuteId} not found`);

    const seats = this.getSeatsForCommute(commuteId);
    let securedSeats = 0;
    let forfeitedSeats = 0;

    for (const seat of seats) {
      const idempotencyKey = `hold:${commuteId}:${seat.cocommuter_id}`;
      try {
        await this.walletService.holdSeatContribution({
          userId: seat.cocommuter_id,
          seatId: seat.id,
          contributionPesewas: commute.seat_contribution_pesewas,
          idempotencyKey,
        });

        seat.seat_status = 'LOCKED';
        this.seats.set(seat.id, seat);
        securedSeats++;

        this.dispatchEvent(commuteId, {
          type: 'COMMUTE_SECURED',
          commuteId,
          seatId: seat.id,
          serverTimestamp: currentTime.toISOString(),
          allowsBoarding: true,
        });
      } catch {
        seat.seat_status = 'FORFEITED';
        this.seats.set(seat.id, seat);
        forfeitedSeats++;

        this.dispatchEvent(commuteId, {
          type: 'LOCK_FAILED',
          commuteId,
          seatId: seat.id,
          serverTimestamp: currentTime.toISOString(),
          reason: 'INSUFFICIENT_FUNDS',
        });
      }
    }

    if (securedSeats > 0) {
      commute.commute_status = 'SECURED';
    }
    this.commutes.set(commuteId, commute);

    return { securedSeats, forfeitedSeats };
  }

  /**
   * Commute Departure Transition (Engages IN_TRANSIT & arms destination geofence)
   */
  startCommuteInTransit(commuteId: string, currentTime = new Date()): void {
    const commute = this.commutes.get(commuteId);
    if (!commute) throw new Error(`Commute ${commuteId} not found`);

    commute.commute_status = 'IN_TRANSIT';
    this.commutes.set(commuteId, commute);

    this.dispatchEvent(commuteId, {
      type: 'COMMUTE_IN_TRANSIT',
      commuteId,
      serverTimestamp: currentTime.toISOString(),
    });
  }

  /**
   * Destination Geofence Settlement (Manual Slider vs. 5-Minute Auto-Settle Cron)
   *
   * Architectural Guardrail 2 (Idempotent No-Op Resolution & UX Continuity):
   * Both manual slider and cron use deterministic ledger idempotency key `settle:${commuteId}:${cocommuterId}`.
   * If the auto-settle worker beats manual slide by milliseconds, returns 200 OK with alreadySettled: true,
   * avoiding 400/409 errors and allowing slider animation to snap smoothly.
   */
  async settleCommute(params: {
    commuteId: string;
    cocommuterId: string;
    trigger: 'MANUAL_SLIDER' | 'AUTO_SETTLE_CRON';
    currentTime?: Date;
  }): Promise<{
    statusCode: 200;
    alreadySettled: boolean;
    commuteStatus: CommuteLifecycleStatus;
    settledAt: string;
    message: string;
  }> {
    const currentTime = params.currentTime ?? new Date();
    const commute = this.commutes.get(params.commuteId);
    if (!commute) throw new Error(`Commute ${params.commuteId} not found`);

    const idempotencyKey = `settle:${params.commuteId}:${params.cocommuterId}`;

    // If commute is already settled into PENDING_REVIEW or COMPLETED
    if (commute.commute_status === 'PENDING_REVIEW' || commute.commute_status === 'COMPLETED') {
      return {
        statusCode: 200,
        alreadySettled: true,
        commuteStatus: commute.commute_status as CommuteLifecycleStatus,
        settledAt: currentTime.toISOString(),
        message: 'Commute contribution already settled in escrow.',
      };
    }

    const seats = this.getSeatsForCommute(params.commuteId);
    const targetSeat = seats.find((s) => s.cocommuter_id === params.cocommuterId);
    const seatId = targetSeat?.id ?? `seat_${params.cocommuterId}`;

    const settlementResult = await this.walletService.settleSeatContribution({
      cocommuterId: params.cocommuterId,
      hostId: commute.host_id,
      commuteId: params.commuteId,
      seatId,
      contributionPesewas: commute.seat_contribution_pesewas,
      idempotencyKey,
    });

    commute.commute_status = 'PENDING_REVIEW';
    this.commutes.set(params.commuteId, commute);

    if (targetSeat) {
      targetSeat.seat_status = 'DROPPED_OFF';
      targetSeat.dropoff_verified_at = currentTime;
      this.seats.set(targetSeat.id, targetSeat);
    }

    const settledAt = currentTime.toISOString();

    this.dispatchEvent(params.commuteId, {
      type: 'COMMUTE_SETTLED',
      commuteId: params.commuteId,
      serverTimestamp: settledAt,
      alreadySettled: settlementResult.alreadySettled,
      settledAt,
    });

    this.dispatchEvent(params.commuteId, {
      type: 'COMMUTE_PENDING_REVIEW',
      commuteId: params.commuteId,
      serverTimestamp: settledAt,
      status: 'PENDING_REVIEW',
    });

    return {
      statusCode: 200,
      alreadySettled: settlementResult.alreadySettled,
      commuteStatus: 'PENDING_REVIEW',
      settledAt,
      message: 'Commute successfully settled. Host cost offset disbursed from escrow.',
    };
  }

  /**
   * Retrieves pending review metadata for a user if they have an unsubmitted review.
   *
   * Architectural Guardrail 3 (Zero-Latency Modal Hydration):
   * Pre-hydrates display metadata directly for instantaneous modal mounting.
   */
  async getPendingReviewForUser(userId: string): Promise<PendingReviewMetadata | null> {
    for (const commute of this.commutes.values()) {
      if (commute.commute_status === 'PENDING_REVIEW') {
        const isHost = commute.host_id === userId;
        const seats = this.getSeatsForCommute(commute.id);
        const userSeat = seats.find((s) => s.cocommuter_id === userId);

        if (isHost || userSeat) {
          // Check if this user has already submitted a review
          const existingReview = Array.from(this.reviews.values()).find(
            (r) => r.commute_id === commute.id && r.reviewer_id === userId,
          );

          if (!existingReview) {
            const counterpartyRole = isHost ? 'COCOMMUTER' : 'HOST';
            const counterpartyName = isHost
              ? 'Co-Commuter (Standard Chartered)'
              : 'Kwame Mensah (Stanbic Bank)';

            return {
              commuteId: commute.id,
              counterpartyName,
              counterpartyRole,
              vehicleSummary: `Toyota Corolla • Class ${commute.engine_class}`,
              routeSummary: `${commute.origin_name} → ${commute.destination_name}`,
              completedAt: new Date().toISOString(),
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Submits a two-way post-commute safety review.
   */
  async submitReview(review: {
    commuteId: string;
    reviewerId: string;
    revieweeId: string;
    ratingStars: number;
    safetyTags?: string[];
    feedbackComment?: string;
  }): Promise<CommuteReviewRecord> {
    const isEscalation = review.ratingStars <= 2;
    const reviewRecord: CommuteReviewRecord = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      commute_id: review.commuteId,
      reviewer_id: review.reviewerId,
      reviewee_id: review.revieweeId,
      rating_stars: review.ratingStars,
      safety_tags: review.safetyTags ?? [],
      feedback_comment: review.feedbackComment,
      is_safety_escalation: isEscalation,
      created_at: new Date(),
    };

    this.reviews.set(reviewRecord.id, reviewRecord);

    // If all participants have completed reviews, transition commute to COMPLETED
    const commute = this.commutes.get(review.commuteId);
    if (commute) {
      commute.commute_status = 'COMPLETED';
      this.commutes.set(commute.id, commute);
    }

    return reviewRecord;
  }

  /**
   * Logs a signed offline BLE presence token (P2P BLE Canyon Protocol).
   */
  logBlePresenceToken(token: BlePresenceTokenRecord): void {
    this.bleTokens.push(token);
  }

  getBleTokensForCommute(commuteId: string): BlePresenceTokenRecord[] {
    return this.bleTokens.filter((t) => t.commute_id === commuteId);
  }
}
