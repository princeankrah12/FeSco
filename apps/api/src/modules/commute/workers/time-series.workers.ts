import { CommuteExecutionService } from '../commute-execution.service.js';

export interface BullMqJob<T> {
  id: string;
  name: string;
  data: T;
}

export interface TeasheetJobData {
  commuteId: string;
}

export interface JitLockJobData {
  commuteId: string;
}

export interface AutoSettleJobData {
  commuteId: string;
  cocommuterId: string;
}

/**
 * BullMQ Time-Series Worker: T-30 Teasheet Worker
 *
 * Runs 30 minutes before scheduled departure:
 * - Checks active SVOC rate version for NPA pump rate adjustments.
 * - Validates Co-Commuter wallet balances on USER_MAIN.
 * - Emits COMMUTE_LOCKING with absolute lockExecutesAt or FUNDS_WARNING via SSE.
 */
export class TeasheetWorkerProcessor {
  constructor(private commuteService: CommuteExecutionService) {}

  async process(job: BullMqJob<TeasheetJobData>): Promise<{
    commuteId: string;
    status: string;
    rateDropSavingsPesewas: number;
  }> {
    const result = await this.commuteService.executeTeasheetWindow(job.data.commuteId);
    return {
      commuteId: job.data.commuteId,
      status: result.status,
      rateDropSavingsPesewas: result.rateDropSavingsPesewas,
    };
  }
}

/**
 * BullMQ Time-Series Worker: T-10 JIT Lock Worker
 *
 * Runs 10 minutes before scheduled departure:
 * - Executes atomic double-entry transfer (USER_MAIN -> ESCROW_HOLD).
 * - Emits COMMUTE_SECURED or LOCK_FAILED via SSE.
 */
export class JitLockWorkerProcessor {
  constructor(private commuteService: CommuteExecutionService) {}

  async process(job: BullMqJob<JitLockJobData>): Promise<{
    commuteId: string;
    securedSeats: number;
    forfeitedSeats: number;
  }> {
    const result = await this.commuteService.executeJitLock(job.data.commuteId);
    return {
      commuteId: job.data.commuteId,
      securedSeats: result.securedSeats,
      forfeitedSeats: result.forfeitedSeats,
    };
  }
}

/**
 * BullMQ Time-Series Worker: 5-Minute Auto-Settle Worker
 *
 * Runs 5 minutes after destination geofence entry:
 * - Settles held contribution from ESCROW_HOLD -> HOST_MAIN.
 * - Uses deterministic idempotency key `settle:${commuteId}:${cocommuterId}`.
 * - Yields idempotent 200 resolution without colliding with manual slider interactions.
 */
export class AutoSettleWorkerProcessor {
  constructor(private commuteService: CommuteExecutionService) {}

  async process(job: BullMqJob<AutoSettleJobData>): Promise<{
    commuteId: string;
    cocommuterId: string;
    alreadySettled: boolean;
    commuteStatus: string;
    settledAt: string;
  }> {
    const result = await this.commuteService.settleCommute({
      commuteId: job.data.commuteId,
      cocommuterId: job.data.cocommuterId,
      trigger: 'AUTO_SETTLE_CRON',
    });

    return {
      commuteId: job.data.commuteId,
      cocommuterId: job.data.cocommuterId,
      alreadySettled: result.alreadySettled,
      commuteStatus: result.commuteStatus,
      settledAt: result.settledAt,
    };
  }
}
