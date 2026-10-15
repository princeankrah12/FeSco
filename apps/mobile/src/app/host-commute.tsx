import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';
import { formatPesewasToGhc } from '@fesco/domain';

type HostVerificationStatus = 'VERIFIED' | 'VERIFICATION_PENDING' | 'REJECTED';

export default function HostCommuteScreen() {
  const router = useRouter();

  // Verification state (can be toggled for testing)
  const [verificationStatus, setVerificationStatus] =
    useState<HostVerificationStatus>('VERIFICATION_PENDING');

  // Commute route drafting state
  const [origin, setOrigin] = useState('Agape Junction');
  const [destination, setDestination] = useState('Osu Oxford Street');
  const [departureTime, setDepartureTime] = useState('06:30 AM');
  const [distanceKm, setDistanceKm] = useState('16.5');
  const [seats, setSeats] = useState(3);
  const [isNpaRateAdjusted, setIsNpaRateAdjusted] = useState(true);

  // SVOC Math
  const ratePerKmPesewas = 210; // Class B baseline
  const numericDistance = parseFloat(distanceKm) || 16.5;
  const totalCostPesewas = Math.round(numericDistance * ratePerKmPesewas);
  const seatContributionPesewas = Math.floor(totalCostPesewas / seats);

  // Simulate Server-Sent Event (SSE) listener
  useEffect(() => {
    let timer: any;
    if (verificationStatus === 'VERIFICATION_PENDING') {
      // Simulate real-time background sync after 4 seconds
      timer = setTimeout(() => {
        setVerificationStatus('VERIFIED');
        triggerHaptic();
        Alert.alert(
          'Vehicle Verified!',
          'DVLA & NIC regulatory records have synchronized. You are now cleared to publish your commute.',
        );
      }, 4500);
    }
    return () => clearTimeout(timer);
  }, [verificationStatus]);

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {}
  };

  const handlePublish = () => {
    if (verificationStatus !== 'VERIFIED') {
      Alert.alert(
        'Commute Publishing Locked',
        'Your vehicle is currently in Verification Pending status with DVLA/NIC. Publishing is locked until roadworthiness and comprehensive insurance are confirmed.',
      );
      return;
    }

    Alert.alert(
      'Commute Route Published!',
      `Your commute from ${origin} to ${destination} is active. 3 co-commuter seats are open at ${formatPesewasToGhc(seatContributionPesewas)} per seat.`,
      [{ text: 'Return to Dashboard', onPress: () => router.push('/dashboard') }],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← DASHBOARD</Text>
          </TouchableOpacity>
          <Text style={styles.title}>HOST A COMMUTE</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Verification Status Banner / In-Progress Gateway */}
          {verificationStatus === 'VERIFICATION_PENDING' ? (
            <View style={styles.pendingGatewayCard}>
              <View style={styles.pendingGatewayHeader}>
                <View style={styles.radarPulse}>
                  <Text style={styles.radarIcon}>⏳</Text>
                </View>
                <View style={styles.gatewayTextCol}>
                  <Text style={styles.pendingTag}>IN-PROGRESS VERIFICATION GATEWAY</Text>
                  <Text style={styles.pendingGatewayTitle}>
                    DVLA & NIC Records Synchronizing
                  </Text>
                </View>
              </View>
              <Text style={styles.pendingGatewayBody}>
                You can draft your commute route, pickup points, and schedule now. The publish button
                will automatically unlock once safety clearance completes.
              </Text>
              <View style={styles.gatewayActionRow}>
                <TouchableOpacity
                  style={styles.instantVerifyChip}
                  onPress={() => {
                    setVerificationStatus('VERIFIED');
                    triggerHaptic();
                  }}
                >
                  <Text style={styles.instantVerifyText}>Simulate Instant SSE Clearance ⚡</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.verifiedBanner}>
              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedPillText}>✓ Vehicle Verified</Text>
              </View>
              <Text style={styles.verifiedSubtext}>
                Toyota Corolla • Class B (1798cc) • Hollard Comprehensive Insurance
              </Text>
            </View>
          )}

          {/* Route Drafting Form */}
          <View style={[styles.card, FeScoElevation.raised]}>
            <Text style={styles.cardSectionLabel}>COMMUTE ROUTE & SCHEDULE</Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>ORIGIN NEIGHBORHOOD</Text>
              <TextInput
                style={styles.textInput}
                value={origin}
                onChangeText={setOrigin}
                placeholder="e.g. Agape Junction"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>CORPORATE DESTINATION</Text>
              <TextInput
                style={styles.textInput}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g. Osu Oxford Street"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.splitRow}>
              <View style={[styles.inputRow, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>DEPARTURE TIME</Text>
                <TextInput
                  style={styles.textInput}
                  value={departureTime}
                  onChangeText={setDepartureTime}
                  placeholder="06:30 AM"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={[styles.inputRow, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>DISTANCE (KM)</Text>
                <TextInput
                  style={styles.textInput}
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                  keyboardType="numeric"
                  placeholder="16.5"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>AVAILABLE CO-COMMUTER SEATS</Text>
              <View style={styles.seatsSelector}>
                {[1, 2, 3].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.seatChip, seats === s && styles.seatChipActive]}
                    onPress={() => setSeats(s)}
                  >
                    <Text style={[styles.seatChipText, seats === s && styles.seatChipTextActive]}>
                      {s} {s === 1 ? 'Seat' : 'Seats'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Monospace SVOC Costing Receipt Card */}
          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>SVOC COST-RECOVERY CALCULATION</Text>
              {isNpaRateAdjusted && (
                <View style={styles.npaBadge}>
                  <Text style={styles.npaBadgeText}>NPA Rate Adjusted</Text>
                </View>
              )}
            </View>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptRow}>
              <Text
                style={styles.receiptMonoLabel}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Route Distance:
              </Text>
              <Text
                style={styles.receiptMonoValue}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {numericDistance.toFixed(1)} km
              </Text>
            </View>

            <View style={styles.receiptRow}>
              <Text
                style={styles.receiptMonoLabel}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Vehicle SVOC Rate (Class B):
              </Text>
              <Text
                style={styles.receiptMonoValue}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                GH₵ 2.10 / km
              </Text>
            </View>

            <View style={styles.receiptRow}>
              <Text
                style={styles.receiptMonoLabel}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Total Operating Cost:
              </Text>
              <Text
                style={styles.receiptMonoValue}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatPesewasToGhc(totalCostPesewas)}
              </Text>
            </View>

            <View style={styles.receiptDividerDashed} />

            <View style={styles.receiptRowHighlight}>
              <View>
                <Text
                  style={styles.highlightTitle}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Fuel Contribution per Seat:
                </Text>
                <Text
                  style={styles.highlightSubtext}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Floor-rounded (÷ {seats} seats)
                </Text>
              </View>
              <Text
                style={styles.highlightAmount}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatPesewasToGhc(seatContributionPesewas)}
              </Text>
            </View>

            <Text style={styles.receiptLegalNote}>
              Strict not-for-profit cost recovery. Host receives zero surplus above verified SVOC expenses.
            </Text>
          </View>

          {/* Publishing CTA with State Lock */}
          <TouchableOpacity
            style={[
              styles.publishButton,
              verificationStatus === 'VERIFIED' ? styles.publishActive : styles.publishLocked,
            ]}
            onPress={handlePublish}
            activeOpacity={0.85}
          >
            {verificationStatus === 'VERIFICATION_PENDING' ? (
              <View style={styles.buttonInnerRow}>
                <Text style={styles.lockIcon}>🔒</Text>
                <Text style={styles.publishLockedText}>
                  AWAITING VEHICLE CLEARANCE (LOCKED)
                </Text>
              </View>
            ) : (
              <Text style={styles.publishActiveText}>PUBLISH COMMUTE ROUTE →</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FeScoSpacing.md,
    paddingVertical: FeScoSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: FeScoColors.indigoLight,
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  placeholder: {
    width: 60,
  },
  scrollContent: {
    padding: FeScoSpacing.md,
    paddingBottom: 40,
  },
  pendingGatewayCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: FeScoRadii.lg,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.md,
  },
  pendingGatewayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radarPulse: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radarIcon: {
    fontSize: 18,
  },
  gatewayTextCol: {
    flex: 1,
  },
  pendingTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  pendingGatewayTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  pendingGatewayBody: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 10,
  },
  gatewayActionRow: {
    flexDirection: 'row',
  },
  instantVerifyChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: FeScoRadii.pill,
  },
  instantVerifyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDE68A',
  },
  verifiedBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: FeScoRadii.md,
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.md,
    borderLeftWidth: 4,
    borderLeftColor: FeScoColors.emerald,
  },
  verifiedPill: {
    backgroundColor: FeScoColors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: FeScoRadii.pill,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  verifiedPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  verifiedSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: FeScoRadii.lg,
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.md,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: FeScoColors.indigoLight,
    letterSpacing: 1,
    marginBottom: FeScoSpacing.sm,
  },
  inputRow: {
    marginBottom: FeScoSpacing.sm,
  },
  splitRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: FeScoRadii.md,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: FeScoSpacing.sm,
    height: 48,
  },
  seatsSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  seatChip: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingVertical: 10,
    borderRadius: FeScoRadii.md,
    alignItems: 'center',
  },
  seatChipActive: {
    borderColor: FeScoColors.indigo,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  seatChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  seatChipTextActive: {
    color: '#FFFFFF',
  },
  receiptCard: {
    backgroundColor: '#090D16',
    borderRadius: FeScoRadii.lg,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.lg,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  npaBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: FeScoRadii.pill,
  },
  npaBadgeText: {
    color: FeScoColors.emerald,
    fontWeight: '800',
    fontSize: 10,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 10,
  },
  receiptDividerDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  receiptMonoLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  receiptMonoValue: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  receiptRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    padding: 10,
    borderRadius: FeScoRadii.md,
    marginBottom: 10,
  },
  highlightTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  highlightSubtext: {
    color: '#94A3B8',
    fontSize: 11,
  },
  highlightAmount: {
    color: FeScoColors.indigoLight,
    fontWeight: '900',
    fontSize: 20,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  receiptLegalNote: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
    fontStyle: 'italic',
  },
  publishButton: {
    paddingVertical: 16,
    borderRadius: FeScoRadii.md,
    alignItems: 'center',
  },
  publishActive: {
    backgroundColor: FeScoColors.indigo,
  },
  publishLocked: {
    backgroundColor: '#334155',
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  publishActiveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  publishLockedText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
