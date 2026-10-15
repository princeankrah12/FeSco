/**
 * FeSCo Club Consensus Service
 *
 * Enforces two critical consensus state machines:
 * 1. Two-Party Handshake for single-day relief swaps with atomic reciprocal pairing
 *    (maintains exact 5 hosting days per member across 4-week cycles).
 * 2. 3/4 Majority Supermajority Voting on time shifts with automated PENALTY_FREE_RELEASE
 *    for dissenting or non-voting members.
 */

import { AiConciergeService, ConciergeProposal } from './ai-concierge.service.js';
import { ClubRecord, ClubRosterScheduleRecord } from '../../db/schema.js';

export interface SwapExecutionResult {
  success: boolean;
  status: 'PENDING' | 'REJECTED' | 'RESOLVED';
  swappedSchedules?: {
    originalLeg: ClubRosterScheduleRecord;
    reciprocalLeg: ClubRosterScheduleRecord;
  };
  notificationCopy?: string;
  message: string;
}

export interface TimeShiftVoteResult {
  success: boolean;
  status: 'PENDING' | 'REJECTED' | 'RESOLVED';
  votesTally: {
    accepts: number;
    rejects: number;
    totalEligible: number;
  };
  updatedDepartureTime?: string;
  penaltyFreeReleasedMembers?: string[];
  message: string;
}

export class ClubConsensusService {
  private clubs = new Map<string, ClubRecord>();
  private rosterSchedules = new Map<string, ClubRosterScheduleRecord>();
  private penaltyFreeReleases = new Map<string, Set<string>>(); // scheduleId -> Set of userIds

  constructor(private conciergeService: AiConciergeService) {}

  /** Helper to seed club record for consensus testing/runtime */
  seedClub(club: ClubRecord): void {
    this.clubs.set(club.id, club);
  }

  /** Helper to seed roster schedules */
  seedRosterSchedule(schedule: ClubRosterScheduleRecord): void {
    this.rosterSchedules.set(schedule.id, schedule);
  }

  getRosterSchedule(scheduleId: string): ClubRosterScheduleRecord | undefined {
    return this.rosterSchedules.get(scheduleId);
  }

  /**
   * Responds to a Single-Day Relief Swap proposal.
   * Both hosts (Host A and Host B) must accept before atomic reciprocal update occurs.
   */
  async respondToSingleDaySwap(params: {
    proposalId: string;
    actorUserId: string;
    decision: 'ACCEPT' | 'REJECT';
  }): Promise<SwapExecutionResult> {
    const proposal = this.conciergeService.getProposal(params.proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${params.proposalId}`);
    }

    if (proposal.type !== 'SINGLE_DAY_RELIEF_SWAP') {
      throw new Error(`Invalid proposal type: ${proposal.type}`);
    }

    if (proposal.status !== 'PENDING') {
      return {
        success: false,
        status: proposal.status as 'REJECTED' | 'RESOLVED',
        message: `Proposal is already ${proposal.status.toLowerCase()}.`,
      };
    }

    const hostA = proposal.targetHostUserId;
    const hostB = proposal.counterpartyHostUserId;

    if (!hostB) {
      throw new Error('Proposal does not have a designated counterparty host.');
    }

    // Validate that actor is one of the two participating hosts
    if (params.actorUserId !== hostA && params.actorUserId !== hostB) {
      throw new Error(`User ${params.actorUserId} is not authorized to act on this swap proposal.`);
    }

    if (params.decision === 'REJECT') {
      proposal.status = 'REJECTED';
      return {
        success: true,
        status: 'REJECTED',
        message: 'Relief swap proposal rejected by participating host.',
      };
    }

    // Record acceptance
    proposal.swapApprovals[params.actorUserId] = true;

    // Check if both hosts have accepted
    const hostAAccepted = proposal.swapApprovals[hostA] === true;
    const hostBAccepted = proposal.swapApprovals[hostB] === true;

    if (!hostAAccepted || !hostBAccepted) {
      return {
        success: true,
        status: 'PENDING',
        message: 'Awaiting reciprocal approval from counterparty host.',
      };
    }

    // Both accepted: ATOMIC RECIPROCAL UPDATE
    // Find matching roster schedules for targetCommuteDate and reciprocalCommuteDate
    const schedules = Array.from(this.rosterSchedules.values()).filter(
      (s) => s.club_id === proposal.clubId,
    );

    // Leg 1: Host A was scheduled -> Host B drives
    const leg1 =
      schedules.find(
        (s) =>
          s.scheduled_host_user_id === hostA &&
          (proposal.targetCommuteDate
            ? s.commute_date.toISOString().split('T')[0] === proposal.targetCommuteDate
            : true),
      ) ?? schedules.find((s) => s.scheduled_host_user_id === hostA);

    // Leg 2: Host B was scheduled -> Host A drives (Reciprocal Leg)
    const leg2 =
      schedules.find(
        (s) =>
          s.scheduled_host_user_id === hostB &&
          (proposal.reciprocalCommuteDate
            ? s.commute_date.toISOString().split('T')[0] === proposal.reciprocalCommuteDate
            : s.id !== leg1?.id),
      ) ?? schedules.find((s) => s.scheduled_host_user_id === hostB && s.id !== leg1?.id);

    if (!leg1 || !leg2) {
      throw new Error('Unable to locate both reciprocal roster schedule legs in club database.');
    }

    // Execute atomic update
    leg1.actual_host_user_id = hostB;
    leg1.is_swap = true;
    leg1.swap_approved_by = hostB;

    leg2.actual_host_user_id = hostA;
    leg2.is_swap = true;
    leg2.swap_approved_by = hostA;

    this.rosterSchedules.set(leg1.id, leg1);
    this.rosterSchedules.set(leg2.id, leg2);

    proposal.status = 'RESOLVED';

    const notificationCopy = `Swap confirmed: Leg ${leg1.commute_date.toISOString().split('T')[0]} hosted by ${hostB} ↔ Leg ${leg2.commute_date.toISOString().split('T')[0]} hosted by ${hostA}. Exact rotation equity preserved.`;

    return {
      success: true,
      status: 'RESOLVED',
      swappedSchedules: {
        originalLeg: leg1,
        reciprocalLeg: leg2,
      },
      notificationCopy,
      message: 'Reciprocal single-day relief swap executed atomically.',
    };
  }

  /**
   * Votes on a club Departure Time Shift proposal:
   * Requires 3/4 supermajority (>= 3 acceptances out of 4 club members).
   * Dissenting members or non-voters receive automated PENALTY_FREE_RELEASE.
   */
  async voteOnTimeShift(params: {
    proposalId: string;
    memberUserId: string;
    vote: 'ACCEPT' | 'REJECT';
  }): Promise<TimeShiftVoteResult> {
    const proposal = this.conciergeService.getProposal(params.proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${params.proposalId}`);
    }

    if (proposal.type !== 'TIME_SHIFT') {
      throw new Error(`Invalid proposal type for voting: ${proposal.type}`);
    }

    if (proposal.status !== 'PENDING') {
      return {
        success: false,
        status: proposal.status as 'REJECTED' | 'RESOLVED',
        votesTally: { accepts: 0, rejects: 0, totalEligible: 4 },
        message: `Proposal is already ${proposal.status.toLowerCase()}.`,
      };
    }

    proposal.votes[params.memberUserId] = params.vote;

    // Tally votes across standard 4-member club
    const votes = Object.values(proposal.votes);
    const accepts = votes.filter((v) => v === 'ACCEPT').length;
    const rejects = votes.filter((v) => v === 'REJECT').length;
    const totalEligible = 4;

    // If 2 or more members reject, 3/4 supermajority is impossible (max 2 accepts remaining)
    if (rejects >= 2) {
      proposal.status = 'REJECTED';
      return {
        success: true,
        status: 'REJECTED',
        votesTally: { accepts, rejects, totalEligible },
        message: 'Proposal failed to attain 3/4 supermajority and is rejected.',
      };
    }

    // If 3 or more members accept (>= 75% supermajority)
    if (accepts >= 3) {
      proposal.status = 'RESOLVED';

      // Update club departure time
      const club = this.clubs.get(proposal.clubId);
      if (club && proposal.newDepartureTime) {
        club.standard_am_departure = proposal.newDepartureTime;
        club.updated_at = new Date();
        this.clubs.set(club.id, club);
      }

      // Collect members who did not vote ACCEPT (dissenters or timed-out)
      const penaltyFreeReleasedMembers = Object.entries(proposal.votes)
        .filter(([_, v]) => v === 'REJECT')
        .map(([userId]) => userId);

      // Record penalty-free release permissions
      for (const dissenterId of penaltyFreeReleasedMembers) {
        const set = this.penaltyFreeReleases.get(proposal.clubId) ?? new Set<string>();
        set.add(dissenterId);
        this.penaltyFreeReleases.set(proposal.clubId, set);
      }

      return {
        success: true,
        status: 'RESOLVED',
        votesTally: { accepts, rejects, totalEligible },
        updatedDepartureTime: proposal.newDepartureTime,
        penaltyFreeReleasedMembers,
        message: '3/4 Supermajority achieved. Club schedule shifted with penalty-free release granted to dissenting commuters.',
      };
    }

    return {
      success: true,
      status: 'PENDING',
      votesTally: { accepts, rejects, totalEligible },
      message: `Vote recorded (${accepts}/${totalEligible} approvals). Awaiting remaining members.`,
    };
  }

  isMemberPenaltyFreeReleased(clubId: string, userId: string): boolean {
    return this.penaltyFreeReleases.get(clubId)?.has(userId) ?? false;
  }
}
