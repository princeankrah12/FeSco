import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';

export type CommuteCardStage =
  | 'idle'
  | 'anticipation'
  | 'teasheet'
  | 'processing'
  | 'success'
  | 'failure'
  | 'cleared_osu'
  | 'in_transit'
  | 'pending_review'
  | 'completed';

export interface CommuteCardProps {
  stage: CommuteCardStage;
  origin: string;
  destination: string;
  scheduledTime: string;
  hostName: string;
  totalOperatingCostCedis: string; // e.g. "34.65"
  seatContributionCedis: string; // e.g. "11.55"
  lockCountdownText?: string; // e.g. "Payment Locking in 29:00"
  onTopUpPress?: () => void;
  onReviewPress?: () => void;
  onCardPress?: () => void;
}

export const CommuteCard: React.FC<CommuteCardProps> = ({
  stage,
  origin,
  destination,
  scheduledTime,
  hostName,
  totalOperatingCostCedis,
  seatContributionCedis,
  lockCountdownText = 'Payment Locking in 29:00',
  onTopUpPress,
  onReviewPress,
  onCardPress,
}) => {
  // Pulse animation for Teasheet stage
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Elevation / scale animation
  const elevationAnim = useRef(new Animated.Value(stage === 'processing' ? 0 : 1)).current;
  const prevStageRef = useRef<CommuteCardStage>(stage);

  const triggerHaptic = (type: 'success' | 'warning' | 'light') => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (type === 'success') {
          navigator.vibrate([30, 50, 80]);
        } else if (type === 'warning') {
          navigator.vibrate([100, 50, 100]);
        } else {
          navigator.vibrate(40);
        }
      }
    } catch {
      // Platform fallback gracefully
    }
  };

  useEffect(() => {
    if (prevStageRef.current !== stage) {
      if (stage === 'success') {
        triggerHaptic('success');
      } else if (stage === 'failure') {
        triggerHaptic('warning');
      } else if (stage === 'in_transit' || stage === 'pending_review') {
        triggerHaptic('light');
      }
      prevStageRef.current = stage;
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'teasheet') {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [stage, pulseAnim]);

  useEffect(() => {
    if (stage === 'success') {
      // 1.0 -> 1.02 -> 1.0 transient spring keyframe over 250ms synced with haptic pulse
      // Keeps resting scale at 1.0 so typography stays razor-sharp without subpixel blur
      Animated.sequence([
        Animated.timing(elevationAnim, {
          toValue: 1.02,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(elevationAnim, {
          toValue: 1.0,
          duration: 130,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(elevationAnim, {
        toValue: 1.0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [stage, elevationAnim]);

  // Determine stage visual styling
  const isTeasheet = stage === 'teasheet';
  const isProcessing = stage === 'processing';
  const isSuccess = stage === 'success';
  const isFailure = stage === 'failure';
  const isClearedOsu = stage === 'cleared_osu';
  const isInTransit = stage === 'in_transit';
  const isPendingReview = stage === 'pending_review';
  const isCompleted = stage === 'completed';

  const cardElevationStyle = isProcessing || isFailure || isCompleted
    ? FeScoElevation.flat
    : isSuccess
    ? FeScoElevation.popped
    : FeScoElevation.raised;

  const borderColor = isTeasheet
    ? FeScoColors.amber
    : isSuccess
    ? FeScoColors.emerald
    : isFailure
    ? FeScoColors.crimson
    : isClearedOsu || isInTransit
    ? FeScoColors.indigo
    : isPendingReview
    ? FeScoColors.amber
    : FeScoColors.slateBorder;

  if (stage === 'idle') {
    return (
      <View style={[styles.cardContainer, FeScoElevation.flat, styles.cardIdle]}>
        <View style={styles.idleRow}>
          <Text style={styles.idleIcon}>☕</Text>
          <View style={styles.idleTextCol}>
            <Text style={styles.idleTitle}>NO ACTIVE COMMUTE IN WINDOW</Text>
            <Text style={styles.idleSubtitle}>
              Next scheduled departure: {scheduledTime} • Standing by for T-30 Teasheet window
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        cardElevationStyle,
        {
          borderColor,
          transform: [{ scale: stage === 'teasheet' ? pulseAnim : elevationAnim }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.95} onPress={onCardPress} disabled={!onCardPress}>
        {/* Header: Status Pill Badge */}
        <View style={styles.headerRow}>
          <View style={styles.hostInfo}>
            <Text style={styles.hostLabel}>HOSTED COMMUTE</Text>
            <Text style={styles.hostName}>{hostName}</Text>
          </View>

          {/* Dynamic 5-State Variant Badges */}
          {stage === 'anticipation' && (
            <View style={[styles.badge, styles.badgeEmerald]}>
              <View style={[styles.dot, { backgroundColor: FeScoColors.emerald }]} />
              <Text style={[styles.badgeText, { color: FeScoColors.emerald }]}>Confirmed</Text>
            </View>
          )}

          {isTeasheet && (
            <View style={[styles.badge, styles.badgeAmber]}>
              <View style={[styles.dot, { backgroundColor: FeScoColors.amber }]} />
              <Text style={[styles.badgeTextMono, { color: FeScoColors.amber }]}>
                {lockCountdownText}
              </Text>
            </View>
          )}

          {isProcessing && (
            <View style={[styles.badge, styles.badgeAmber]}>
              <ActivityIndicator size="small" color={FeScoColors.amber} style={styles.spinner} />
              <Text style={[styles.badgeText, { color: FeScoColors.amber }]}>
                Authorizing Escrow Hold...
              </Text>
            </View>
          )}

          {isSuccess && (
            <View style={[styles.badge, styles.badgeEmerald]}>
              <View style={[styles.dot, { backgroundColor: FeScoColors.emerald }]} />
              <Text style={[styles.badgeText, { color: FeScoColors.emerald }]}>Seat Confirmed</Text>
            </View>
          )}

          {isFailure && (
            <View style={[styles.badge, styles.badgeCrimson]}>
              <View style={[styles.dot, { backgroundColor: FeScoColors.crimson }]} />
              <Text style={[styles.badgeText, { color: FeScoColors.crimson }]}>Seat Forfeited</Text>
            </View>
          )}

          {isClearedOsu && (
            <View style={[styles.badge, styles.badgeBlue]}>
              <View style={[styles.dot, { backgroundColor: FeScoColors.corporateBlue }]} />
              <Text style={[styles.badgeText, { color: FeScoColors.corporateBlue }]}>
                Cleared for Boarding
              </Text>
            </View>
          )}

          {isInTransit && (
            <View style={[styles.badge, styles.badgeBlue]}>
              <View style={[styles.dot, { backgroundColor: FeScoColors.indigo }]} />
              <Text style={[styles.badgeText, { color: FeScoColors.indigo }]}>
                In Transit • BLE Active
              </Text>
            </View>
          )}

          {isPendingReview && (
            <View style={[styles.badge, styles.badgeAmber]}>
              <View style={[styles.dot, { backgroundColor: FeScoColors.amber }]} />
              <Text style={[styles.badgeText, { color: FeScoColors.amber }]}>
                Review Required
              </Text>
            </View>
          )}

          {isCompleted && (
            <View style={[styles.badge, styles.badgeEmerald]}>
              <View style={[styles.dot, { backgroundColor: FeScoColors.emerald }]} />
              <Text style={[styles.badgeText, { color: FeScoColors.emerald }]}>
                Settled & Archived
              </Text>
            </View>
          )}
        </View>

        {/* Route Details */}
        <View style={styles.routeSection}>
          <View style={styles.routeTimeline}>
            <View style={[styles.routePointDot, { backgroundColor: FeScoColors.indigo }]} />
            <View style={styles.routePointLine} />
            <View style={[styles.routePointDot, { backgroundColor: FeScoColors.emerald }]} />
          </View>

          <View style={styles.routeTextColumn}>
            <View style={styles.stopRow}>
              <Text style={styles.stopName}>{origin}</Text>
              <Text style={styles.stopTimeMono}>{scheduledTime}</Text>
            </View>
            <View style={styles.stopRow}>
              <Text style={styles.stopName}>{destination}</Text>
              <Text style={styles.stopLabelMuted}>Corporate Hub</Text>
            </View>
          </View>
        </View>

        {/* The Transparency Engine: Monospace Financial Breakdown */}
        <View style={styles.accountingReceiptBox}>
          <Text
            style={styles.accountingTitle}
            maxFontSizeMultiplier={1.15}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            NOT-FOR-PROFIT COST BREAKDOWN
          </Text>
          <View style={styles.accountingRow}>
            <Text
              style={styles.accountingLabel}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Total Operating Cost (SVOC):
            </Text>
            <Text
              style={styles.accountingValueMono}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              GH₵ {totalOperatingCostCedis}
            </Text>
          </View>
          <View style={styles.accountingRow}>
            <Text
              style={styles.accountingLabel}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Divided by 3 Co-Commuters:
            </Text>
            <Text
              style={styles.accountingValueMono}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ÷ 3 seats
            </Text>
          </View>
          <View style={[styles.accountingRow, styles.accountingTotalRow]}>
            <Text
              style={styles.accountingTotalLabel}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Your Fuel Contribution:
            </Text>
            <Text
              style={styles.accountingTotalValueMono}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              GH₵ {seatContributionCedis}
            </Text>
          </View>
        </View>

        {/* Failure Action Banner (State 4b) */}
        {isFailure && (
          <View style={styles.failureActionContainer}>
            <Text style={styles.failureExplanation}>
              Insufficient wallet balance at T-10 lock. Auto-filled via Ad-hoc.
            </Text>
            <TouchableOpacity style={styles.topUpButton} onPress={onTopUpPress}>
              <Text style={styles.topUpButtonText}>Top Up Wallet Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Review Action Banner (Rate to Unlock) */}
        {isPendingReview && (
          <View style={styles.reviewActionContainer}>
            <Text style={styles.reviewExplanation}>
              Commute completed at destination geofence. Rate your co-commuter to unlock future schedules.
            </Text>
            <TouchableOpacity style={styles.reviewButton} onPress={onReviewPress}>
              <Text style={styles.reviewButtonText}>Rate Last Commute to Unlock</Text>
            </TouchableOpacity>
            <Text style={styles.reviewHelperCaption}>
              Quick 5-second safety check required before your next commute.
            </Text>
          </View>
        )}

        {/* In-Transit Banner */}
        {isInTransit && (
          <View style={styles.inTransitBanner}>
            <Text style={styles.inTransitText}>
              📡 P2P BLE Canyon Protocol active • Auto-settlement geofence armed
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: FeScoColors.card,
    borderRadius: FeScoRadii.lg,
    padding: FeScoSpacing.md,
    borderWidth: 1.5,
    marginVertical: FeScoSpacing.xs,
  },
  cardIdle: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    paddingVertical: 18,
  },
  idleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  idleTextCol: {
    flex: 1,
  },
  idleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  idleSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FeScoSpacing.sm,
  },
  hostInfo: {
    flexDirection: 'column',
  },
  hostLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.8,
  },
  hostName: {
    fontSize: 15,
    fontWeight: '600',
    color: FeScoColors.slateDark,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: FeScoSpacing.xxs,
    borderRadius: FeScoRadii.pill,
  },
  badgeEmerald: {
    backgroundColor: FeScoColors.emeraldSubtle,
    borderColor: FeScoColors.emeraldBorder,
    borderWidth: 1,
  },
  badgeAmber: {
    backgroundColor: FeScoColors.amberSubtle,
    borderColor: FeScoColors.amberBorder,
    borderWidth: 1,
  },
  badgeCrimson: {
    backgroundColor: FeScoColors.crimsonSubtle,
    borderColor: FeScoColors.crimsonBorder,
    borderWidth: 1,
  },
  badgeBlue: {
    backgroundColor: FeScoColors.indigoSubtle,
    borderColor: FeScoColors.slateBorder,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  spinner: {
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextMono: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'SF Mono', android: 'monospace', default: 'monospace' }),
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: FeScoSpacing.sm,
  },
  routeTimeline: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  routePointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routePointLine: {
    flex: 1,
    width: 2,
    backgroundColor: FeScoColors.slateBorder,
    marginVertical: 4,
  },
  routeTextColumn: {
    flex: 1,
    marginLeft: FeScoSpacing.xs,
    justifyContent: 'space-between',
  },
  stopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopName: {
    fontSize: 15,
    fontWeight: '600',
    color: FeScoColors.slateDark,
  },
  stopTimeMono: {
    fontSize: 13,
    fontWeight: '500',
    color: FeScoColors.indigo,
    fontFamily: Platform.select({ ios: 'SF Mono', android: 'monospace', default: 'monospace' }),
  },
  stopLabelMuted: {
    fontSize: 12,
    color: FeScoColors.slate,
  },
  accountingReceiptBox: {
    backgroundColor: FeScoColors.background,
    borderRadius: FeScoRadii.md,
    padding: FeScoSpacing.sm,
    marginTop: FeScoSpacing.xs,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
  },
  accountingTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  accountingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  accountingLabel: {
    fontSize: 12,
    color: FeScoColors.slate,
  },
  accountingValueMono: {
    fontSize: 12,
    fontWeight: '500',
    color: FeScoColors.slateDark,
    fontFamily: Platform.select({ ios: 'SF Mono', android: 'monospace', default: 'monospace' }),
  },
  accountingTotalRow: {
    borderTopWidth: 1,
    borderTopColor: FeScoColors.slateBorder,
    paddingTop: 4,
    marginTop: 4,
  },
  accountingTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: FeScoColors.indigoDark,
  },
  accountingTotalValueMono: {
    fontSize: 14,
    fontWeight: '700',
    color: FeScoColors.indigo,
    fontFamily: Platform.select({ ios: 'SF Mono', android: 'monospace', default: 'monospace' }),
  },
  failureActionContainer: {
    marginTop: FeScoSpacing.sm,
    paddingTop: FeScoSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: FeScoColors.crimsonBorder,
  },
  failureExplanation: {
    fontSize: 12,
    color: FeScoColors.crimson,
    marginBottom: FeScoSpacing.xs,
  },
  topUpButton: {
    backgroundColor: FeScoColors.crimson,
    borderRadius: FeScoRadii.md,
    paddingVertical: FeScoSpacing.xs,
    alignItems: 'center',
  },
  topUpButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewActionContainer: {
    marginTop: FeScoSpacing.sm,
    paddingTop: FeScoSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: FeScoColors.amberBorder,
  },
  reviewExplanation: {
    fontSize: 12,
    color: '#B45309',
    marginBottom: FeScoSpacing.xs,
  },
  reviewButton: {
    backgroundColor: FeScoColors.indigo,
    borderRadius: FeScoRadii.md,
    paddingVertical: FeScoSpacing.xs,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewHelperCaption: {
    fontSize: 11,
    color: FeScoColors.slate,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
  inTransitBanner: {
    marginTop: FeScoSpacing.xs,
    padding: FeScoSpacing.xs,
    backgroundColor: FeScoColors.indigoSubtle,
    borderRadius: FeScoRadii.sm,
  },
  inTransitText: {
    fontSize: 11,
    color: FeScoColors.indigoDark,
    textAlign: 'center',
    fontWeight: '500',
  },
});
