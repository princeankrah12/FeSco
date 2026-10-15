import { Money } from './money.js';

/**
 * FeSCo Double-Entry Ledger Domain Logic
 *
 * All balances and transactions are tracked as immutable journal entries
 * and postings in integer pesewas. Mutating a balance column directly is prohibited.
 */

export type AccountType =
  | 'USER_MAIN'
  | 'ESCROW_HOLD'
  | 'RESCUE_POOL'
  | 'PSP_CLEARING'
  | 'CLUB_CONTINUITY_ESCROW'
  | 'RELIEF_SUBSIDY_POOL';

export type JournalTransactionType =
  | 'MOMO_TOP_UP'
  | 'SEAT_CONTRIBUTION_HOLD'
  | 'COMMUTE_SETTLEMENT'
  | 'RESCUE_POOL_ALLOCATION'
  | 'CANCELLATION_REFUND';

export interface LedgerPostingItem {
  accountId: string;
  accountType: AccountType;
  direction: 'DEBIT' | 'CREDIT';
  amountPesewas: number;
}

export interface JournalEntryPayload {
  id: string;
  transactionType: JournalTransactionType;
  referenceId: string;
  idempotencyKey: string;
  description: string;
  postings: LedgerPostingItem[];
  createdAt: Date;
}

/**
 * Validates the core double-entry invariant:
 * Sum of Debits MUST equal Sum of Credits.
 */
export function validateDoubleEntryInvariant(postings: LedgerPostingItem[]): {
  isBalanced: boolean;
  totalDebitsPesewas: number;
  totalCreditsPesewas: number;
  discrepancyPesewas: number;
} {
  let totalDebitsPesewas = 0;
  let totalCreditsPesewas = 0;

  for (const p of postings) {
    if (!Number.isSafeInteger(p.amountPesewas) || p.amountPesewas <= 0) {
      throw new TypeError(`Posting amount must be a positive safe integer pesewas, got: ${p.amountPesewas}`);
    }

    if (p.direction === 'DEBIT') {
      totalDebitsPesewas += p.amountPesewas;
    } else if (p.direction === 'CREDIT') {
      totalCreditsPesewas += p.amountPesewas;
    } else {
      throw new Error(`Invalid posting direction: ${p.direction}`);
    }
  }

  const discrepancyPesewas = Math.abs(totalDebitsPesewas - totalCreditsPesewas);
  const isBalanced = discrepancyPesewas === 0;

  return {
    isBalanced,
    totalDebitsPesewas,
    totalCreditsPesewas,
    discrepancyPesewas,
  };
}

/**
 * Factory for MoMo Top-Up Journal Entry:
 * Debit PSP_CLEARING (asset incoming) -> Credit USER_MAIN (liability/user deposit).
 */
export function createMomoTopUpJournal(
  userId: string,
  userAccountId: string,
  pspAccountId: string,
  amountPesewas: number,
  momoReference: string,
  idempotencyKey: string,
): JournalEntryPayload {
  const postings: LedgerPostingItem[] = [
    {
      accountId: pspAccountId,
      accountType: 'PSP_CLEARING',
      direction: 'DEBIT',
      amountPesewas,
    },
    {
      accountId: userAccountId,
      accountType: 'USER_MAIN',
      direction: 'CREDIT',
      amountPesewas,
    },
  ];

  const invariant = validateDoubleEntryInvariant(postings);
  if (!invariant.isBalanced) {
    throw new Error('MoMo top-up journal entry is not balanced.');
  }

  return {
    id: `jnl_${momoReference}`,
    transactionType: 'MOMO_TOP_UP',
    referenceId: momoReference,
    idempotencyKey,
    description: `Mobile Money top-up via PSP: ${Money.fromPesewas(amountPesewas).toFormattedCedis()}`,
    postings,
    createdAt: new Date(),
  };
}

/**
 * Factory for Commute Seat Hold (at T-30 or T-10 lock):
 * Debit USER_MAIN (funds committed) -> Credit ESCROW_HOLD (held pending completion).
 */
export function createSeatHoldJournal(
  seatId: string,
  userAccountId: string,
  escrowAccountId: string,
  contributionPesewas: number,
  idempotencyKey: string,
): JournalEntryPayload {
  const postings: LedgerPostingItem[] = [
    {
      accountId: userAccountId,
      accountType: 'USER_MAIN',
      direction: 'DEBIT',
      amountPesewas: contributionPesewas,
    },
    {
      accountId: escrowAccountId,
      accountType: 'ESCROW_HOLD',
      direction: 'CREDIT',
      amountPesewas: contributionPesewas,
    },
  ];

  const invariant = validateDoubleEntryInvariant(postings);
  if (!invariant.isBalanced) {
    throw new Error('Seat hold journal entry is not balanced.');
  }

  return {
    id: `jnl_hold_${seatId}`,
    transactionType: 'SEAT_CONTRIBUTION_HOLD',
    referenceId: seatId,
    idempotencyKey,
    description: `Seat contribution hold for commute: ${Money.fromPesewas(contributionPesewas).toFormattedCedis()}`,
    postings,
    createdAt: new Date(),
  };
}

/**
 * Factory for Commute Settlement (at destination geofence entry / auto-settle):
 * Debit ESCROW_HOLD (releasing held contribution) -> Credit USER_MAIN (Host fuel cost recovery).
 */
export function createCommuteSettlementJournal(
  commuteId: string,
  seatId: string,
  cocommuterEscrowAccountId: string,
  hostMainAccountId: string,
  contributionPesewas: number,
  idempotencyKey: string,
): JournalEntryPayload {
  const postings: LedgerPostingItem[] = [
    {
      accountId: cocommuterEscrowAccountId,
      accountType: 'ESCROW_HOLD',
      direction: 'DEBIT',
      amountPesewas: contributionPesewas,
    },
    {
      accountId: hostMainAccountId,
      accountType: 'USER_MAIN',
      direction: 'CREDIT',
      amountPesewas: contributionPesewas,
    },
  ];

  const invariant = validateDoubleEntryInvariant(postings);
  if (!invariant.isBalanced) {
    throw new Error('Commute settlement journal entry is not balanced.');
  }

  return {
    id: `jnl_settle_${seatId}`,
    transactionType: 'COMMUTE_SETTLEMENT',
    referenceId: commuteId,
    idempotencyKey,
    description: `Commute settlement cost offset recovery: ${Money.fromPesewas(contributionPesewas).toFormattedCedis()}`,
    postings,
    createdAt: new Date(),
  };
}

/**
 * Calculates user spendable balance from a list of postings:
 * Spendable Balance = Credits - Debits
 */
export function calculateAccountBalance(postings: LedgerPostingItem[]): Money {
  let netPesewas = 0;
  for (const p of postings) {
    if (p.direction === 'CREDIT') {
      netPesewas += p.amountPesewas;
    } else {
      netPesewas -= p.amountPesewas;
    }
  }
  return Money.fromPesewas(netPesewas);
}
