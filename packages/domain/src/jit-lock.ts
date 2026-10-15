import { Money } from './money.js';

/**
 * JIT Wallet Lock State Machine & Osu/Airport City Rules
 */

export type JitLockState =
  | 'ANTICIPATION'
  | 'TEASHEET_PULSING'
  | 'PROCESSING_HOLD'
  | 'SUCCESS_CONFIRMED'
  | 'CLEARED_FOR_BOARDING_OSU'
  | 'FORFEITED_SEAT'
  | 'NETWORK_GRACE_PERIOD';

export interface JitLockEvaluationInput {
  scheduledDeparture: Date;
  currentTime: Date;
  seatContribution: Money;
  walletBalance: Money;
  isInOsuAirportCityGeofence: boolean;
  authorizationAttempted?: boolean;
  authorizationSucceeded?: boolean;
  gatewayErrorCode?: 402 | 500;
}

export interface JitLockStatus {
  state: JitLockState;
  minutesUntilDeparture: number;
  badgeLabel: string;
  badgeVariant: 'emerald' | 'amber' | 'crimson' | 'blue';
  zDepth: 'flat' | 'raised' | 'popped';
  allowsBoarding: boolean;
  actionRequired?: 'TOP_UP' | 'RETRY' | 'NONE';
  description: string;
}

export function evaluateJitLockState(input: JitLockEvaluationInput): JitLockStatus {
  const diffMs = input.scheduledDeparture.getTime() - input.currentTime.getTime();
  const minutesUntilDeparture = Math.floor(diffMs / 60000);
  const secondsUntilDeparture = Math.floor(diffMs / 1000);

  // If authorization was attempted and succeeded
  if (input.authorizationAttempted && input.authorizationSucceeded) {
    return {
      state: 'SUCCESS_CONFIRMED',
      minutesUntilDeparture,
      badgeLabel: 'Seat Confirmed',
      badgeVariant: 'emerald',
      zDepth: 'popped',
      allowsBoarding: true,
      actionRequired: 'NONE',
      description: 'Fuel contribution successfully secured in escrow.',
    };
  }

  // If authorization was attempted and gateway returned HTTP 500 (Telco MoMo outage)
  if (input.authorizationAttempted && input.gatewayErrorCode === 500) {
    return {
      state: 'NETWORK_GRACE_PERIOD',
      minutesUntilDeparture,
      badgeLabel: 'MoMo Network Delayed',
      badgeVariant: 'amber',
      zDepth: 'raised',
      allowsBoarding: true, // Proceed under grace period IOU ledger
      actionRequired: 'NONE',
      description: 'Telco MoMo networks experiencing delays. Proceed on internal IOU ledger; auto-settling in background.',
    };
  }

  // If authorization was attempted and failed with 402 (insufficient funds)
  if (input.authorizationAttempted && input.gatewayErrorCode === 402) {
    return {
      state: 'FORFEITED_SEAT',
      minutesUntilDeparture,
      badgeLabel: 'Seat Forfeited',
      badgeVariant: 'crimson',
      zDepth: 'flat',
      allowsBoarding: false,
      actionRequired: 'TOP_UP',
      description: 'Insufficient wallet balance at lock window. Seat released to Ad-hoc network.',
    };
  }

  // 1. T > 30 mins: Anticipation
  if (minutesUntilDeparture > 30) {
    return {
      state: 'ANTICIPATION',
      minutesUntilDeparture,
      badgeLabel: 'Confirmed',
      badgeVariant: 'emerald',
      zDepth: 'raised',
      allowsBoarding: false, // Too early to board
      actionRequired: 'NONE',
      description: 'Commute scheduled. Payment locking begins 30 mins prior to departure.',
    };
  }

  // 2. Osu / Airport City Exception: T-30 minutes check
  if (input.isInOsuAirportCityGeofence) {
    const hasSufficientBalance = input.walletBalance.greaterThanOrEqual(input.seatContribution);
    if (hasSufficientBalance) {
      return {
        state: 'CLEARED_FOR_BOARDING_OSU',
        minutesUntilDeparture,
        badgeLabel: 'Cleared for Boarding',
        badgeVariant: 'blue',
        zDepth: 'raised',
        allowsBoarding: true,
        actionRequired: 'NONE',
        description: 'Corporate hub exemption active. Balance pre-cleared; deduction occurs at vehicle door via BLE handshake.',
      };
    } else {
      return {
        state: 'TEASHEET_PULSING',
        minutesUntilDeparture,
        badgeLabel: 'Top-Up Required',
        badgeVariant: 'amber',
        zDepth: 'raised',
        allowsBoarding: false,
        actionRequired: 'TOP_UP',
        description: `Wallet balance (${input.walletBalance.toFormattedCedis()}) is below required contribution (${input.seatContribution.toFormattedCedis()}).`,
      };
    }
  }

  // 3. T-30 to T-10 mins: Teasheet Pulsing Countdown
  if (minutesUntilDeparture >= 10) {
    const lockCountdownSec = Math.max(0, secondsUntilDeparture - 600);
    const mm = String(Math.floor(lockCountdownSec / 60)).padStart(2, '0');
    const ss = String(lockCountdownSec % 60).padStart(2, '0');

    return {
      state: 'TEASHEET_PULSING',
      minutesUntilDeparture,
      badgeLabel: `Payment Locking in ${mm}:${ss}`,
      badgeVariant: 'amber',
      zDepth: 'raised',
      allowsBoarding: false,
      actionRequired: 'NONE',
      description: 'JIT lock window approaching. Verifying linked wallet balance.',
    };
  }

  // 4. T < 10 mins: Processing Hold
  return {
    state: 'PROCESSING_HOLD',
    minutesUntilDeparture,
    badgeLabel: 'Authorizing Payment...',
    badgeVariant: 'amber',
    zDepth: 'flat',
    allowsBoarding: false,
    actionRequired: 'NONE',
    description: 'Securing contribution hold from linked wallet.',
  };
}
