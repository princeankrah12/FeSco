import {
  CommuteExecutionService,
  PendingReviewMetadata,
} from '../commute-execution.service.js';

export interface PreconditionRequiredPayload {
  statusCode: 428;
  error: 'Precondition Required';
  code: 'PENDING_REVIEW_REQUIRED';
  pendingReview: PendingReviewMetadata;
}

export class PreconditionRequiredException extends Error {
  readonly statusCode = 428;
  readonly error = 'Precondition Required';
  readonly code = 'PENDING_REVIEW_REQUIRED';
  readonly pendingReview: PendingReviewMetadata;

  constructor(pendingReview: PendingReviewMetadata) {
    super('Precondition Required: Uncompleted two-way safety review pending from last commute');
    this.name = 'PreconditionRequiredException';
    this.pendingReview = pendingReview;
  }

  toJSON(): PreconditionRequiredPayload {
    return {
      statusCode: this.statusCode,
      error: this.error,
      code: this.code,
      pendingReview: this.pendingReview,
    };
  }
}

/**
 * Pre-Commute Rating Guard (HTTP 428)
 *
 * Enforces two-way safety reviews strictly on user-initiated commute creation and seat reservation.
 * Returns pre-hydrated display metadata so the mobile client can mount the Stateful Rating Modal
 * instantaneously on the next frame with zero additional network latency.
 *
 * Never blocks background T-30/T-10 time-series cron workers.
 */
export class PendingReviewGuard {
  constructor(private commuteService: CommuteExecutionService) {}

  async canActivate(userId: string): Promise<boolean> {
    const pendingReview = await this.commuteService.getPendingReviewForUser(userId);
    if (pendingReview) {
      throw new PreconditionRequiredException(pendingReview);
    }
    return true;
  }
}
