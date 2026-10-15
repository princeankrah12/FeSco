import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CommuteCard, CommuteCardStage } from '../components/CommuteCard';
import { RatingModal } from '../components/RatingModal';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';

export default function DashboardScreen() {
  const router = useRouter();

  // Commute Card Stage State for testing & demonstration
  const [activeStage, setActiveStage] = useState<CommuteCardStage>('anticipation');
  const [showSosSlider, setShowSosSlider] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [nearestStopAccepted, setNearestStopAccepted] = useState(false);

  const handleSosTrigger = () => {
    Alert.alert(
      'EMERGENCY SOS ALERT ACTIVATED',
      'Encrypted SOS signal sent to FeSCo Private Security Response & Corporate Fleet Admin. Host vehicle coordinates are being tracked in real time.',
      [{ text: 'Dismiss SOS', onPress: () => setShowSosSlider(false) }],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Corporate Navigation Bar */}
        <View style={styles.topNav}>
          <View>
            <Text style={styles.greeting}>WELCOME BACK</Text>
            <Text style={styles.userName}>Kwame Asante • Stanbic Bank</Text>
          </View>
          <View style={styles.kycVerifiedPill}>
            <Text style={styles.kycVerifiedText}>✓ NIA Verified</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Nearest Stop Match Notification Banner */}
          {!nearestStopAccepted && (
            <View style={styles.nearestStopBanner}>
              <View style={styles.nearestStopHeader}>
                <Text style={styles.nearestStopTag}>FLEXIBLE AI ROUTING</Text>
                <Text style={styles.nearestStopSaving}>Recalculated: GH₵ 11.55</Text>
              </View>
              <Text style={styles.nearestStopPrompt}>
                Exact match unavailable. Host Kwame is passing [Agape Junction] at 5:40 AM.
              </Text>
              <View style={styles.nearestStopActions}>
                <TouchableOpacity
                  style={styles.acceptStopButton}
                  onPress={() => {
                    setNearestStopAccepted(true);
                    Alert.alert(
                      'Nearest Stop Match Accepted',
                      'Pickup point updated to Agape Junction. Fuel contribution dynamically adjusted for shorter leg.',
                    );
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.acceptStopButtonText}>Accept Nearest Stop Match</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Responsive Layout Shift: Active Window vs Idle State */}
          {activeStage === 'idle' ? (
            /* Idle State: Prominent Setup & Management Grid */
            <View style={styles.phase2QuickActionsRow}>
              <TouchableOpacity
                style={styles.phase2ActionTile}
                onPress={() => router.push('/vehicle-registration')}
                activeOpacity={0.85}
              >
                <Text style={styles.phase2ActionIcon}>🚗</Text>
                <Text style={styles.phase2ActionTitle}>Vehicle Safety</Text>
                <Text style={styles.phase2ActionSub}>DVLA & NIC</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.phase2ActionTile}
                onPress={() => router.push('/host-commute')}
                activeOpacity={0.85}
              >
                <Text style={styles.phase2ActionIcon}>📍</Text>
                <Text style={styles.phase2ActionTitle}>Host Commute</Text>
                <Text style={styles.phase2ActionSub}>Draft Gateway</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.phase2ActionTile}
                onPress={() => router.push('/wallet')}
                activeOpacity={0.85}
              >
                <Text style={styles.phase2ActionIcon}>💳</Text>
                <Text style={styles.phase2ActionTitle}>Wallet</Text>
                <Text style={styles.phase2ActionSub}>MoMo Pre-Fund</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.phase2ActionTile, styles.clubHubTile]}
                onPress={() => router.push('/club-hub')}
                activeOpacity={0.85}
              >
                <Text style={styles.phase2ActionIcon}>👥</Text>
                <Text style={styles.phase2ActionTitle}>Carpool Club</Text>
                <Text style={styles.phase2ActionSub}>Engine & Roster</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Active Window Banner: Elevated Hero State */
            <View style={styles.activeWindowIndicator}>
              <View style={styles.activePulseRing}>
                <View style={styles.activeDot} />
              </View>
              <Text style={styles.activeWindowText}>
                ACTIVE COMMUTE WINDOW • T-30 TEASHEET / JIT LOCK ENGAGED
              </Text>
            </View>
          )}

          {/* Section: Active Commute Card ("Financial Heartbeat") Elevated during active windows */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {activeStage === 'idle' ? 'SCHEDULED COMMUTE' : 'FINANCIAL HEARTBEAT (ACTIVE)'}
            </Text>
            <Text style={styles.sectionHelper}>
              {activeStage === 'idle' ? 'No active lock running' : 'Live escrow lock sequence:'}
            </Text>
          </View>

          {/* The Financial Heartbeat CommuteCard */}
          <CommuteCard
            stage={activeStage}
            origin={nearestStopAccepted ? 'Agape Junction (Nearest Stop)' : 'Ablekuma (Fan Milk)'}
            destination="Osu (Oxford Street Hub)"
            scheduledTime="5:40 AM"
            hostName="Kofi Osei (Toyota Corolla • Class B)"
            totalOperatingCostCedis={nearestStopAccepted ? '34.65' : '42.00'}
            seatContributionCedis={nearestStopAccepted ? '11.55' : '14.00'}
            lockCountdownText="Payment Locking in 29:00"
            onTopUpPress={() => {
              Alert.alert('Top Up Wallet', 'Pre-funding wallet via MTN / Telecel Mobile Money...');
              setActiveStage('anticipation');
            }}
            onReviewPress={() => {
              setShowRatingModal(true);
            }}
          />

          {/* Interactive Map Visual Dashboard with Pedestrian Leg & Convergence Node */}
          <View style={[styles.mapContainer, FeScoElevation.raised]}>
            <View style={styles.mapCanvas}>
              {/* 1. Pedestrian Walking Leg (Home Pin -> Agape Junction Convergence Node) */}
              <View style={styles.pedestrianPathContainer}>
                {[...Array(10)].map((_, i) => (
                  <View key={`dot-${i}`} style={styles.pedestrianPathDot} />
                ))}
              </View>

              {/* Floating Monospace Walking Micro-Pill */}
              <View style={styles.walkingMicroPill}>
                <Text style={styles.walkingMicroPillText}>🚶 350m • 4 min to Pickup Node</Text>
              </View>

              {/* 2. Shared Commute Path (Strictly begins at Agape Junction Convergence Node) */}
              <View style={styles.sharedVehicleLegPolyline} />

              {/* Home / Origin Marker */}
              <View style={[styles.mapMarker, styles.homeMarker]}>
                <Text style={styles.homeMarkerIcon}>🏠</Text>
              </View>

              {/* 3. Convergence Node (Agape Junction Target Marker: Deep Indigo Outer Ring + Pure White Core) */}
              <View style={styles.convergenceNodeTarget}>
                <View style={styles.convergenceNodeCore} />
              </View>

              {/* Destination Marker (Osu) */}
              <View style={[styles.mapMarker, styles.destinationMarker]}>
                <Text style={styles.markerText}>B</Text>
              </View>
            </View>

            {/* Map Legend */}
            <View style={styles.mapLegendRow}>
              <View style={styles.legendItem}>
                <View style={styles.legendDottedSlate} />
                <Text style={styles.legendText}>Walking Leg (Dotted Slate)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendConvergenceTarget}>
                  <View style={styles.legendConvergenceCore} />
                </View>
                <Text style={styles.legendText}>Convergence Node</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendSolidIndigo} />
                <Text style={styles.legendText}>Shared Vehicle Leg (Deep Indigo)</Text>
              </View>
            </View>
          </View>

          {/* Active Window Bottom Utility Bar (Collapsed Management Bar) */}
          {activeStage !== 'idle' && (
            <View style={styles.compactBottomUtilityBar}>
              <TouchableOpacity
                style={styles.compactUtilityChip}
                onPress={() => router.push('/vehicle-registration')}
              >
                <Text style={styles.compactChipIcon}>🚗</Text>
                <Text style={styles.compactChipLabel}>Safety</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.compactUtilityChip}
                onPress={() => router.push('/host-commute')}
              >
                <Text style={styles.compactChipIcon}>📍</Text>
                <Text style={styles.compactChipLabel}>Host Commute</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.compactUtilityChip, styles.compactChipHighlight]}
                onPress={() => router.push('/wallet')}
              >
                <Text style={styles.compactChipIcon}>💳</Text>
                <Text style={styles.compactChipLabel}>Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.compactUtilityChip}
                onPress={() => router.push('/club-hub')}
              >
                <Text style={styles.compactChipIcon}>👥</Text>
                <Text style={styles.compactChipLabel}>Club Hub</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* State Machine Switchers for Interactive Inspection */}
          <View style={styles.stateControlsCard}>
            <Text style={styles.stateControlsTitle}>TEST JIT LOCK ENGINE STATES:</Text>
            <View style={styles.statePillsGrid}>
              <TouchableOpacity
                style={[styles.statePill, activeStage === 'idle' ? styles.statePillActive : null]}
                onPress={() => setActiveStage('idle')}
              >
                <Text style={styles.statePillText}>Idle (No Active Commute)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statePill, activeStage === 'anticipation' ? styles.statePillActive : null]}
                onPress={() => setActiveStage('anticipation')}
              >
                <Text style={styles.statePillText}>T-24h Anticipation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statePill, activeStage === 'teasheet' ? styles.statePillActive : null]}
                onPress={() => setActiveStage('teasheet')}
              >
                <Text style={styles.statePillText}>T-30m Teasheet Pulse</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statePill, activeStage === 'processing' ? styles.statePillActive : null]}
                onPress={() => setActiveStage('processing')}
              >
                <Text style={styles.statePillText}>T-10m Flatten/Hold</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statePill, activeStage === 'success' ? styles.statePillActive : null]}
                onPress={() => setActiveStage('success')}
              >
                <Text style={styles.statePillText}>T-9m Confirmed Pop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statePill, activeStage === 'cleared_osu' ? styles.statePillActive : null]}
                onPress={() => setActiveStage('cleared_osu')}
              >
                <Text style={styles.statePillText}>Osu/Airport City Exemption</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statePill, activeStage === 'failure' ? styles.statePillActive : null]}
                onPress={() => setActiveStage('failure')}
              >
                <Text style={styles.statePillText}>Seat Forfeited</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statePill, activeStage === 'in_transit' ? styles.statePillActive : null]}
                onPress={() => setActiveStage('in_transit')}
              >
                <Text style={styles.statePillText}>In-Transit (BLE Active)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statePill, activeStage === 'pending_review' ? styles.statePillActive : null]}
                onPress={() => {
                  setActiveStage('pending_review');
                  setShowRatingModal(true);
                }}
              >
                <Text style={styles.statePillText}>Pending Review (HTTP 428)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reset / Return to Onboarding */}
          <TouchableOpacity
            style={styles.retestButton}
            onPress={() => router.replace('/' as any)}
          >
            <Text style={styles.retestButtonText}>← Re-run Corporate Gate &amp; KYC Flow</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* SOS Emergency Omnipresent Button */}
        {!showSosSlider ? (
          <TouchableOpacity
            style={styles.sosFab}
            onPress={() => setShowSosSlider(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.sosFabText}>SOS</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.sosSliderOverlay}>
            <View style={styles.sosExpandedCard}>
              <Text style={styles.sosAlertTitle}>EMERGENCY PROTOCOL</Text>
              <Text style={styles.sosAlertDesc}>
                Slide right to immediately dispatch private security and corporate safety team.
              </Text>
              <TouchableOpacity
                style={styles.sosSlideButton}
                onPress={handleSosTrigger}
                activeOpacity={0.8}
              >
                <Text style={styles.sosSlideText}>Slide Right to Alert Private Security ➔</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sosCancelButton}
                onPress={() => setShowSosSlider(false)}
              >
                <Text style={styles.sosCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stateful Rating Modal (Two-Way Safety Review & Pre-Commute Guard) */}
        <RatingModal
          visible={showRatingModal}
          reviewData={{
            commuteId: 'com_agape_osu_101',
            counterpartyName: 'Kofi Osei (Toyota Corolla • Class B)',
            counterpartyRole: 'HOST',
            vehicleSummary: 'Toyota Corolla • Class B (GW-2021-26)',
            routeSummary: 'Agape Junction → Osu Oxford Street Hub',
          }}
          onSubmit={(result) => {
            setShowRatingModal(false);
            setActiveStage('completed');
            if (result.isSafetyEscalation) {
              Alert.alert(
                'Safety Escalation Dispatched',
                'Your report has been forwarded directly to Corporate Fleet Admin. Review completed and next commute unlocked.',
              );
            } else {
              Alert.alert(
                'Rating Submitted',
                `Thank you for submitting your ${result.ratingStars}-star safety review. Next commute unlocked!`,
              );
            }
          }}
          onDismissPolicyNotice={() => {
            Alert.alert(
              'Review Required (Policy)',
              'FeSCo requires a quick 5-second two-way safety rating before scheduling your next commute.',
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: FeScoColors.background,
  },
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: FeScoSpacing.md,
    paddingVertical: FeScoSpacing.sm,
    backgroundColor: FeScoColors.card,
    borderBottomWidth: 1,
    borderBottomColor: FeScoColors.slateBorder,
  },
  greeting: {
    fontSize: 10,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: FeScoColors.slateDark,
  },
  kycVerifiedPill: {
    backgroundColor: FeScoColors.emeraldSubtle,
    borderWidth: 1,
    borderColor: FeScoColors.emeraldBorder,
    borderRadius: FeScoRadii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  kycVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: FeScoColors.emerald,
  },
  scrollContent: {
    padding: FeScoSpacing.md,
    paddingBottom: 100,
  },
  nearestStopBanner: {
    backgroundColor: FeScoColors.indigoSubtle,
    borderWidth: 1,
    borderColor: FeScoColors.indigo,
    borderRadius: FeScoRadii.lg,
    padding: FeScoSpacing.sm,
    marginBottom: FeScoSpacing.sm,
  },
  phase2QuickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: FeScoSpacing.md,
  },
  phase2ActionTile: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: FeScoRadii.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  clubHubTile: {
    borderColor: FeScoColors.indigoLight,
    backgroundColor: '#1E1B4B',
  },
  phase2ActionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  phase2ActionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  phase2ActionSub: {
    fontSize: 9,
    color: FeScoColors.indigoLight,
    fontWeight: '700',
    marginTop: 2,
  },
  nearestStopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nearestStopTag: {
    fontSize: 10,
    fontWeight: '800',
    color: FeScoColors.indigo,
    letterSpacing: 0.6,
  },
  nearestStopSaving: {
    fontSize: 12,
    fontWeight: '700',
    color: FeScoColors.emerald,
  },
  nearestStopPrompt: {
    fontSize: 13,
    color: FeScoColors.slateDark,
    lineHeight: 18,
    marginBottom: FeScoSpacing.xs,
  },
  nearestStopActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  acceptStopButton: {
    backgroundColor: FeScoColors.indigo,
    borderRadius: FeScoRadii.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  acceptStopButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapContainer: {
    backgroundColor: FeScoColors.card,
    borderRadius: FeScoRadii.xl,
    padding: FeScoSpacing.md,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
    marginBottom: FeScoSpacing.md,
  },
  mapCanvas: {
    height: 140,
    backgroundColor: '#E2E8F0',
    borderRadius: FeScoRadii.md,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  activeWindowIndicator: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    borderRadius: FeScoRadii.md,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FeScoSpacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.25)',
  },
  activePulseRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: FeScoColors.emerald,
  },
  activeWindowText: {
    fontSize: 10,
    fontWeight: '800',
    color: FeScoColors.indigoDark,
    letterSpacing: 0.6,
  },
  pedestrianPathContainer: {
    position: 'absolute',
    left: 42,
    top: 60,
    width: 88,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pedestrianPathDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: FeScoColors.slate,
  },
  walkingMicroPill: {
    position: 'absolute',
    left: 20,
    top: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    zIndex: 10,
  },
  walkingMicroPillText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontWeight: '700',
  },
  sharedVehicleLegPolyline: {
    position: 'absolute',
    left: 148,
    right: 25,
    top: 59,
    height: 6,
    backgroundColor: FeScoColors.indigo,
    borderRadius: 3,
  },
  mapMarker: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  homeMarker: {
    left: 14,
    top: 48,
    backgroundColor: '#1E293B',
  },
  homeMarkerIcon: {
    fontSize: 12,
  },
  convergenceNodeTarget: {
    position: 'absolute',
    left: 136,
    top: 48,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: FeScoColors.indigo,
    backgroundColor: 'rgba(30, 58, 138, 0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  convergenceNodeCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  destinationMarker: {
    right: 14,
    top: 48,
    backgroundColor: FeScoColors.emerald,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  mapLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: FeScoSpacing.sm,
    flexWrap: 'wrap',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDottedSlate: {
    width: 14,
    height: 3,
    backgroundColor: FeScoColors.slate,
    marginRight: 6,
  },
  legendConvergenceTarget: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: FeScoColors.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  legendConvergenceCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: FeScoColors.indigo,
  },
  legendSolidIndigo: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: FeScoColors.indigo,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    color: FeScoColors.slate,
    fontWeight: '600',
  },
  compactBottomUtilityBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: FeScoSpacing.md,
    marginBottom: FeScoSpacing.sm,
  },
  compactUtilityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: FeScoRadii.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  compactChipIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  compactChipLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  compactChipHighlight: {
    borderColor: FeScoColors.indigoLight,
    backgroundColor: '#172554',
  },
  sectionHeaderRow: {
    marginBottom: FeScoSpacing.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.8,
  },
  sectionHelper: {
    fontSize: 12,
    color: FeScoColors.slateLight,
  },
  stateControlsCard: {
    backgroundColor: FeScoColors.card,
    borderRadius: FeScoRadii.xl,
    padding: FeScoSpacing.md,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
    marginTop: FeScoSpacing.md,
  },
  stateControlsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.8,
    marginBottom: FeScoSpacing.xs,
  },
  statePillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FeScoSpacing.xs,
  },
  statePill: {
    backgroundColor: FeScoColors.background,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
    borderRadius: FeScoRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statePillActive: {
    backgroundColor: FeScoColors.indigo,
    borderColor: FeScoColors.indigo,
  },
  statePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: FeScoColors.slateDark,
  },
  retestButton: {
    alignItems: 'center',
    marginVertical: FeScoSpacing.lg,
    paddingVertical: 10,
  },
  retestButtonText: {
    color: FeScoColors.indigo,
    fontSize: 13,
    fontWeight: '600',
  },
  sosFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: FeScoColors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sosFabText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sosSliderOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
    padding: FeScoSpacing.md,
  },
  sosExpandedCard: {
    backgroundColor: FeScoColors.card,
    borderRadius: FeScoRadii.xl,
    padding: FeScoSpacing.lg,
    borderWidth: 2,
    borderColor: FeScoColors.crimson,
  },
  sosAlertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: FeScoColors.crimson,
    letterSpacing: 0.5,
  },
  sosAlertDesc: {
    fontSize: 13,
    color: FeScoColors.slate,
    marginVertical: FeScoSpacing.xs,
    lineHeight: 18,
  },
  sosSlideButton: {
    backgroundColor: FeScoColors.crimson,
    borderRadius: FeScoRadii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: FeScoSpacing.sm,
  },
  sosSlideText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sosCancelButton: {
    alignItems: 'center',
    marginTop: FeScoSpacing.sm,
    paddingVertical: 6,
  },
  sosCancelText: {
    color: FeScoColors.slate,
    fontSize: 13,
    fontWeight: '600',
  },
});
