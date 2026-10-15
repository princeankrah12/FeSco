import {
  Money,
  AccountType,
  createMomoTopUpJournal,
  createSeatHoldJournal,
  createCommuteSettlementJournal,
  validateDoubleEntryInvariant,
  calculateAccountBalance,
  LedgerPostingItem,
  JournalEntryPayload,
} from '@fesco/domain';
import {
  WalletAccountRecord,
  LedgerJournalEntryRecord,
  LedgerPostingRecord,
} from '../../db/schema.js';

export class WalletService {
  private accounts = new Map<string, WalletAccountRecord>();
  private journals = new Map<string, LedgerJournalEntryRecord>();
  private postings: LedgerPostingRecord[] = [];
  private idempotencyKeys = new Set<string>();

  // System accounts
  private pspAccountId = 'acc_psp_clearing';
  private rescuePoolAccountId = 'acc_rescue_pool';

  constructor() {
    // Initialize system accounts
    this.accounts.set(this.pspAccountId, {
      id: this.pspAccountId,
      user_id: null,
      account_type: 'PSP_CLEARING',
      currency: 'GHS',
      created_at: new Date(),
      updated_at: new Date(),
    });

    this.accounts.set(this.rescuePoolAccountId, {
      id: this.rescuePoolAccountId,
      user_id: null,
      account_type: 'RESCUE_POOL',
      currency: 'GHS',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Retrieves or provisions double-entry accounts for a user:
   * 1. USER_MAIN: spendable balance
   * 2. ESCROW_HOLD: locked funds awaiting commute completion
   */
  getOrCreateUserAccounts(userId: string): {
    mainAccount: WalletAccountRecord;
    escrowAccount: WalletAccountRecord;
  } {
    const mainId = `acc_main_${userId}`;
    const escrowId = `acc_escrow_${userId}`;

    if (!this.accounts.has(mainId)) {
      this.accounts.set(mainId, {
        id: mainId,
        user_id: userId,
        account_type: 'USER_MAIN',
        currency: 'GHS',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    if (!this.accounts.has(escrowId)) {
      this.accounts.set(escrowId, {
        id: escrowId,
        user_id: userId,
        account_type: 'ESCROW_HOLD',
        currency: 'GHS',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return {
      mainAccount: this.accounts.get(mainId)!,
      escrowAccount: this.accounts.get(escrowId)!,
    };
  }

  /**
   * Processes a Mobile Money (MoMo) top-up via PSP mock (Hubtel/Paystack):
   * Debit PSP_CLEARING -> Credit USER_MAIN
   */
  async topUpViaMomo(params: {
    userId: string;
    amountPesewas: number;
    momoReference: string;
    idempotencyKey: string;
  }): Promise<{
    journalEntry: LedgerJournalEntryRecord;
    balancePesewas: number;
    balanceFormatted: string;
    isDuplicate: boolean;
  }> {
    if (this.idempotencyKeys.has(params.idempotencyKey)) {
      // Idempotent duplicate: return current balance without double crediting
      const currentBalance = this.getUserBalance(params.userId);
      const existingJournal = Array.from(this.journals.values()).find(
        (j) => j.idempotency_key === params.idempotencyKey,
      )!;

      return {
        journalEntry: existingJournal,
        balancePesewas: currentBalance.pesewas,
        balanceFormatted: currentBalance.toFormattedCedis(),
        isDuplicate: true,
      };
    }

    const { mainAccount } = this.getOrCreateUserAccounts(params.userId);

    const journalPayload = createMomoTopUpJournal(
      params.userId,
      mainAccount.id,
      this.pspAccountId,
      params.amountPesewas,
      params.momoReference,
      params.idempotencyKey,
    );

    // Persist journal entry
    const journalRecord: LedgerJournalEntryRecord = {
      id: journalPayload.id,
      transaction_type: journalPayload.transactionType,
      reference_id: journalPayload.referenceId,
      idempotency_key: journalPayload.idempotencyKey,
      description: journalPayload.description,
      created_at: journalPayload.createdAt,
    };
    this.journals.set(journalRecord.id, journalRecord);
    this.idempotencyKeys.add(params.idempotencyKey);

    // Persist postings
    for (const p of journalPayload.postings) {
      const postingRecord: LedgerPostingRecord = {
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        journal_entry_id: journalRecord.id,
        wallet_account_id: p.accountId,
        direction: p.direction,
        amount_pesewas: p.amountPesewas,
        created_at: new Date(),
      };
      this.postings.push(postingRecord);
    }

    const newBalance = this.getUserBalance(params.userId);

    return {
      journalEntry: journalRecord,
      balancePesewas: newBalance.pesewas,
      balanceFormatted: newBalance.toFormattedCedis(),
      isDuplicate: false,
    };
  }

  /**
   * Holds a Co-Commuter's seat contribution in escrow at T-10 or T-30 lock:
   * Debit USER_MAIN -> Credit ESCROW_HOLD
   */
  async holdSeatContribution(params: {
    userId: string;
    seatId: string;
    contributionPesewas: number;
    idempotencyKey: string;
  }): Promise<{
    journalEntry: LedgerJournalEntryRecord;
    remainingBalance: Money;
  }> {
    const currentBalance = this.getUserBalance(params.userId);
    if (currentBalance.pesewas < params.contributionPesewas) {
      throw new Error(
        `Insufficient wallet balance. Required: ${Money.fromPesewas(params.contributionPesewas).toFormattedCedis()}, Available: ${currentBalance.toFormattedCedis()}`,
      );
    }

    const { mainAccount, escrowAccount } = this.getOrCreateUserAccounts(params.userId);

    const journalPayload = createSeatHoldJournal(
      params.seatId,
      mainAccount.id,
      escrowAccount.id,
      params.contributionPesewas,
      params.idempotencyKey,
    );

    const journalRecord: LedgerJournalEntryRecord = {
      id: journalPayload.id,
      transaction_type: journalPayload.transactionType,
      reference_id: journalPayload.referenceId,
      idempotency_key: journalPayload.idempotencyKey,
      description: journalPayload.description,
      created_at: journalPayload.createdAt,
    };
    this.journals.set(journalRecord.id, journalRecord);

    for (const p of journalPayload.postings) {
      this.postings.push({
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        journal_entry_id: journalRecord.id,
        wallet_account_id: p.accountId,
        direction: p.direction,
        amount_pesewas: p.amountPesewas,
        created_at: new Date(),
      });
    }

    return {
      journalEntry: journalRecord,
      remainingBalance: this.getUserBalance(params.userId),
    };
  }

  /**
   * Settles a Co-Commuter's held contribution into the Host's spendable balance upon drop-off:
   * Debit ESCROW_HOLD (Co-Commuter) -> Credit USER_MAIN (Host)
   *
   * Fully idempotent: duplicate settlement requests return { alreadySettled: true }
   */
  async settleSeatContribution(params: {
    cocommuterId: string;
    hostId: string;
    commuteId: string;
    seatId: string;
    contributionPesewas: number;
    idempotencyKey: string;
  }): Promise<{
    journalEntry: LedgerJournalEntryRecord;
    alreadySettled: boolean;
  }> {
    if (this.idempotencyKeys.has(params.idempotencyKey)) {
      const existingJournal = Array.from(this.journals.values()).find(
        (j) => j.idempotency_key === params.idempotencyKey,
      )!;
      return {
        journalEntry: existingJournal,
        alreadySettled: true,
      };
    }

    const { escrowAccount: cocommuterEscrow } = this.getOrCreateUserAccounts(params.cocommuterId);
    const { mainAccount: hostMain } = this.getOrCreateUserAccounts(params.hostId);

    const journalPayload = createCommuteSettlementJournal(
      params.commuteId,
      params.seatId,
      cocommuterEscrow.id,
      hostMain.id,
      params.contributionPesewas,
      params.idempotencyKey,
    );

    const journalRecord: LedgerJournalEntryRecord = {
      id: journalPayload.id,
      transaction_type: journalPayload.transactionType,
      reference_id: journalPayload.referenceId,
      idempotency_key: journalPayload.idempotencyKey,
      description: journalPayload.description,
      created_at: journalPayload.createdAt,
    };
    this.journals.set(journalRecord.id, journalRecord);
    this.idempotencyKeys.add(params.idempotencyKey);

    for (const p of journalPayload.postings) {
      this.postings.push({
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        journal_entry_id: journalRecord.id,
        wallet_account_id: p.accountId,
        direction: p.direction,
        amount_pesewas: p.amountPesewas,
        created_at: new Date(),
      });
    }

    return {
      journalEntry: journalRecord,
      alreadySettled: false,
    };
  }

  /**
   * Calculates a user's spendable balance in integer pesewas directly from postings:
   * Spendable Balance = Credits - Debits on USER_MAIN
   */
  getUserBalance(userId: string): Money {
    const mainAccountId = `acc_main_${userId}`;
    const userPostings: LedgerPostingItem[] = this.postings
      .filter((p) => p.wallet_account_id === mainAccountId)
      .map((p) => ({
        accountId: p.wallet_account_id,
        accountType: 'USER_MAIN',
        direction: p.direction,
        amountPesewas: Number(p.amount_pesewas),
      }));

    return calculateAccountBalance(userPostings);
  }

  /**
   * Returns a chronological feed of journal entries affecting the user's accounts.
   */
  getUserLedgerHistory(userId: string): Array<{
    id: string;
    transactionType: string;
    description: string;
    direction: 'CREDIT' | 'DEBIT';
    amountPesewas: number;
    amountFormatted: string;
    createdAt: Date;
  }> {
    const mainAccountId = `acc_main_${userId}`;
    const userPostings = this.postings.filter((p) => p.wallet_account_id === mainAccountId);

    return userPostings.map((p) => {
      const journal = this.journals.get(p.journal_entry_id);
      return {
        id: p.id,
        transactionType: journal?.transaction_type ?? 'TRANSACTION',
        description: journal?.description ?? 'Ledger Posting',
        direction: p.direction,
        amountPesewas: Number(p.amount_pesewas),
        amountFormatted: Money.fromPesewas(Number(p.amount_pesewas)).toFormattedCedis(),
        createdAt: p.created_at,
      };
    }).reverse();
  }
}
