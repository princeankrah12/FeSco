import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiConciergeService,
  ClubConsensusService,
  ClubContinuityService,
  WalletService,
} from '../dist/index.js';

test('AI Concierge: Boarding delay detector triggers proposal only upon 3 consecutive weekday delays > 30m', async () => {
  const concierge = new AiConciergeService();
  const clubId = 'club_osu_cantonments_01';
  const hostA = 'usr_host_kwame';
  const reliefHostB = 'usr_host_ama';

  // Week 1 Wednesday: 35 min delay
  concierge.recordBoardingInitiation({
    clubId,
    commuteId: 'comm_w1_wed',
    commuteDate: '2026-10-07',
    isoWeekday: 3, // Wednesday
    scheduledDepartureTime: new Date('2026-10-07T07:30:00Z'),
    actualHostUserId: hostA,
    actualHostBoardingStart: new Date('2026-10-07T08:05:00Z'),
  });

  // Week 2 Wednesday: 40 min delay
  concierge.recordBoardingInitiation({
    clubId,
    commuteId: 'comm_w2_wed',
    commuteDate: '2026-10-14',
    isoWeekday: 3,
    scheduledDepartureTime: new Date('2026-10-14T07:30:00Z'),
    actualHostUserId: hostA,
    actualHostBoardingStart: new Date('2026-10-14T08:10:00Z'),
  });

  // 2 consecutive delays: proposal should NOT trigger yet
  let proposals = concierge.evaluateClubDelayPatterns({
    clubId,
    candidateReliefHostUserId: reliefHostB,
  });
  assert.equal(proposals.length, 0);

  // Week 3 Wednesday: 45 min delay (Third consecutive Wednesday delay)
  concierge.recordBoardingInitiation({
    clubId,
    commuteId: 'comm_w3_wed',
    commuteDate: '2026-10-21',
    isoWeekday: 3,
    scheduledDepartureTime: new Date('2026-10-21T07:30:00Z'),
    actualHostUserId: hostA,
    actualHostBoardingStart: new Date('2026-10-21T08:15:00Z'),
  });

  // 3 consecutive delays: proposal MUST trigger
  proposals = concierge.evaluateClubDelayPatterns({
    clubId,
    candidateReliefHostUserId: reliefHostB,
    reciprocalDate: '2026-10-28',
  });

  assert.equal(proposals.length, 1);
  const p = proposals[0];
  assert.equal(p.type, 'SINGLE_DAY_RELIEF_SWAP');
  assert.equal(p.targetHostUserId, hostA);
  assert.equal(p.counterpartyHostUserId, reliefHostB);
  assert.equal(p.consecutiveDelaysCount, 3);
  assert.equal(p.averageDelayMinutes, 40); // (35 + 40 + 45) / 3 = 40
  assert.equal(p.status, 'PENDING');
  assert.ok(p.recommendedAction.includes('consecutive Wednesday morning boarding delays'));
});

test('Club Consensus: Two-Party Handshake atomically updates both reciprocal roster schedule legs', async () => {
  const concierge = new AiConciergeService();
  const consensus = new ClubConsensusService(concierge);

  const clubId = 'club_osu_cantonments_01';
  const hostA = 'usr_host_kwame';
  const hostB = 'usr_host_ama';

  // Seed two roster legs for a 4-week cycle
  consensus.seedRosterSchedule({
    id: 'sched_w1_wed',
    club_id: clubId,
    cycle_number: 1,
    week_number: 1,
    commute_date: new Date('2026-10-21T00:00:00Z'),
    scheduled_host_user_id: hostA,
    actual_host_user_id: hostA,
    is_swap: false,
    swap_approved_by: null,
  });

  consensus.seedRosterSchedule({
    id: 'sched_w2_wed',
    club_id: clubId,
    cycle_number: 1,
    week_number: 2,
    commute_date: new Date('2026-10-28T00:00:00Z'),
    scheduled_host_user_id: hostB,
    actual_host_user_id: hostB,
    is_swap: false,
    swap_approved_by: null,
  });

  const delayDates = ['2026-10-07', '2026-10-14', '2026-10-21'];
  for (let i = 0; i < delayDates.length; i++) {
    const d = delayDates[i];
    concierge.recordBoardingInitiation({
      clubId,
      commuteId: `comm_seed_${i + 1}`,
      commuteDate: d,
      isoWeekday: 3,
      scheduledDepartureTime: new Date(`${d}T07:30:00Z`),
      actualHostUserId: hostA,
      actualHostBoardingStart: new Date(`${d}T08:10:00Z`),
    });
  }

  const [proposal] = concierge.evaluateClubDelayPatterns({
    clubId,
    candidateReliefHostUserId: hostB,
    reciprocalDate: '2026-10-28',
  });
  assert.ok(proposal);

  // 1. Unauthorized member attempts to respond
  await assert.rejects(
    () =>
      consensus.respondToSingleDaySwap({
        proposalId: proposal.id,
        actorUserId: 'usr_cocommuter_kofi',
        decision: 'ACCEPT',
      }),
    /not authorized to act on this swap proposal/,
  );

  // 2. Host A accepts
  const hostARes = await consensus.respondToSingleDaySwap({
    proposalId: proposal.id,
    actorUserId: hostA,
    decision: 'ACCEPT',
  });
  assert.equal(hostARes.status, 'PENDING');
  assert.ok(hostARes.message.includes('Awaiting reciprocal approval'));

  // 3. Host B accepts -> ATOMIC RECIPROCAL UPDATE
  const hostBRes = await consensus.respondToSingleDaySwap({
    proposalId: proposal.id,
    actorUserId: hostB,
    decision: 'ACCEPT',
  });
  assert.equal(hostBRes.status, 'RESOLVED');
  assert.ok(hostBRes.notificationCopy?.includes('Exact rotation equity preserved'));

  // Verify atomic updates in roster schedules
  const updatedLeg1 = consensus.getRosterSchedule('sched_w1_wed');
  const updatedLeg2 = consensus.getRosterSchedule('sched_w2_wed');

  assert.equal(updatedLeg1.actual_host_user_id, hostB);
  assert.equal(updatedLeg1.is_swap, true);
  assert.equal(updatedLeg1.swap_approved_by, hostB);

  assert.equal(updatedLeg2.actual_host_user_id, hostA);
  assert.equal(updatedLeg2.is_swap, true);
  assert.equal(updatedLeg2.swap_approved_by, hostA);
});

test('Club Consensus: 3/4 Supermajority shifts departure time and grants penalty-free release to dissenters', async () => {
  const concierge = new AiConciergeService();
  const consensus = new ClubConsensusService(concierge);

  const clubId = 'club_osu_cantonments_01';
  consensus.seedClub({
    id: clubId,
    name: 'Airport City Express',
    route_geometry: 'LINESTRING(-0.18 5.60, -0.16 5.56)',
    standard_am_departure: '07:30:00',
    standard_pm_departure: '17:30:00',
    club_baseline_rate_pesewas: 1400,
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  });

  const proposal = concierge.createTimeShiftProposal({
    clubId,
    targetHostUserId: 'usr_host_kwame',
    isoWeekday: 1,
    shiftMinutes: 15,
    newDepartureTime: '07:45:00',
  });

  // Member 1 accepts
  await consensus.voteOnTimeShift({
    proposalId: proposal.id,
    memberUserId: 'usr_member_1',
    vote: 'ACCEPT',
  });

  // Member 2 rejects (dissenter)
  await consensus.voteOnTimeShift({
    proposalId: proposal.id,
    memberUserId: 'usr_member_2',
    vote: 'REJECT',
  });

  // Member 3 accepts (now 2 accepts, 1 reject -> still pending)
  const vote3 = await consensus.voteOnTimeShift({
    proposalId: proposal.id,
    memberUserId: 'usr_member_3',
    vote: 'ACCEPT',
  });
  assert.equal(vote3.status, 'PENDING');

  // Member 4 accepts (now 3 accepts -> 3/4 supermajority reached!)
  const vote4 = await consensus.voteOnTimeShift({
    proposalId: proposal.id,
    memberUserId: 'usr_member_4',
    vote: 'ACCEPT',
  });

  assert.equal(vote4.status, 'RESOLVED');
  assert.equal(vote4.updatedDepartureTime, '07:45:00');
  assert.deepEqual(vote4.penaltyFreeReleasedMembers, ['usr_member_2']);

  // Dissenter has penalty-free release permission
  assert.equal(consensus.isMemberPenaltyFreeReleased(clubId, 'usr_member_2'), true);
  assert.equal(consensus.isMemberPenaltyFreeReleased(clubId, 'usr_member_1'), false);
});

test('Club Continuity: Member defection moves stake, powers Vacancy Backstop, and applies Riding Credit Rebate', async () => {
  const walletService = new WalletService();
  const continuity = new ClubContinuityService(walletService);

  const clubId = 'club_osu_cantonments_01';
  const defectorId = 'usr_defector_yaw';
  const reliefHostId = 'usr_relief_ama';

  // 1. Seed defector membership with 6000 pesewas continuity stake
  continuity.seedMembership({
    club_id: clubId,
    user_id: defectorId,
    vehicle_id: 'veh_defector_01',
    rotation_order: 3,
    status: 'ACTIVE',
    rotation_equity_score: 1.0,
    continuity_stake_pesewas: 6000,
  });

  continuity.setClubEscrowBalance(clubId, 6000);

  // 2. Handle Defection
  const defection = await continuity.handleMemberDefection({
    clubId,
    defectingUserId: defectorId,
    reliefHostUserId: reliefHostId,
  });

  assert.equal(defection.transferredStakePesewas, 6000);
  assert.equal(defection.rotationEquityScore, 0.6); // < 0.70
  assert.equal(continuity.getClubEscrowBalance(clubId), 0);
  assert.equal(continuity.getReliefPoolBalance(clubId), 6000);

  // Membership status updated
  const updatedMember = continuity.getMembership(clubId, defectorId);
  assert.equal(updatedMember.status, 'AWAY');
  assert.equal(updatedMember.rotation_equity_score, 0.6);
  assert.equal(updatedMember.continuity_stake_pesewas, 0);

  // 3. Vacancy Backstop: Relief Host drives orphaned week with only 1 occupied seat (2 vacant)
  // Baseline rate: 1400 pesewas per seat. Required subsidy: 2 * 1400 = 2800 pesewas
  const backstopResult = await continuity.applyVacancyBackstop({
    clubId,
    commuteId: 'comm_relief_day_1',
    reliefHostUserId: reliefHostId,
    occupiedSeatsCount: 1,
    clubBaselineRatePesewas: 1400,
  });

  assert.equal(backstopResult.unoccupiedSeatsCount, 2);
  assert.equal(backstopResult.subsidyRequestedPesewas, 2800);
  assert.equal(backstopResult.subsidyGrantedPesewas, 2800);
  assert.equal(backstopResult.remainingPoolPesewas, 3200); // 6000 - 2800 = 3200
  assert.equal(backstopResult.cappedByPoolBalance, false);

  // 4. Tag Residual Relief Pool as Riding Credit to Relief Host at week close
  const tagResult = continuity.tagResidualReliefCredit(clubId, reliefHostId);
  assert.equal(tagResult.taggedCreditPesewas, 3200);
  assert.equal(continuity.getReliefPoolBalance(clubId), 0);

  // 5. Riding Credit Rebate: Relief Host co-commutes next cycle with 1400p seat contribution
  const rebateResult = continuity.applyRidingCreditRebate({
    clubId,
    reliefHostUserId: reliefHostId,
    seatContributionPesewas: 1400,
  });

  assert.equal(rebateResult.originalContributionPesewas, 1400);
  assert.equal(rebateResult.rebateAppliedPesewas, 1400);
  assert.equal(rebateResult.adjustedContributionPesewas, 0); // Completely offset!
  assert.equal(rebateResult.remainingCreditPesewas, 1800); // 3200 - 1400 = 1800
});
