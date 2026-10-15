import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { VinInput } from '../components/VinInput';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';
import { validateChassisVin, validateVehicleAge } from '@fesco/domain';

type RegistrationState = 'IDLE' | 'SCANNING' | 'SUBMITTING' | 'VERIFIED' | 'PENDING' | 'REJECTED';

export default function VehicleRegistrationScreen() {
  const router = useRouter();

  const [licensePlate, setLicensePlate] = useState('GW 2021-26');
  const [chassisNumber, setChassisNumber] = useState('1HGCR2F83HA049101');
  const [status, setStatus] = useState<RegistrationState>('IDLE');
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [engineClass, setEngineClass] = useState<'A' | 'B' | 'C'>('B');
  const [manufactureYear, setManufactureYear] = useState<number>(2021);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('manual');

  const handleSimulateScan = () => {
    setStatus('SCANNING');
    setTimeout(() => {
      setChassisNumber('1HGCR2F83HA049101');
      setStatus('IDLE');
      setActiveTab('manual');
      Alert.alert('Chassis Tag Scanned', 'VIN captured from vehicle windshield barcode.');
    }, 1200);
  };

  const handleRegister = async () => {
    setStatus('SUBMITTING');

    // Simulate backend call to VehicleService
    setTimeout(() => {
      const cleanPlate = licensePlate.trim().toUpperCase().replace(/\s+/g, '');
      const vinCheck = validateChassisVin(chassisNumber);

      if (!vinCheck.isValid) {
        setStatus('REJECTED');
        setResponseMessage(vinCheck.error ?? 'Invalid chassis number (ISO 3779).');
        return;
      }

      // 1. Test hook: Timeout / 500 downtime simulation
      if (cleanPlate.includes('TIMEOUT') || cleanPlate.includes('500')) {
        setStatus('PENDING');
        setResponseMessage(
          "Verification Pending: We're having trouble reaching the DVLA network right now. You can draft your commute route while records sync in the background.",
        );
        return;
      }

      // 2. Test hook: Vehicle >15 years old simulation
      if (cleanPlate.includes('OLD') || cleanPlate.includes('2008') || cleanPlate.includes('2010')) {
        const year = cleanPlate.includes('2010') ? 2010 : 2008;
        const ageCheck = validateVehicleAge(year, 2026);
        setStatus('REJECTED');
        setManufactureYear(year);
        setResponseMessage(`Registration Blocked: ${ageCheck.message}`);
        return;
      }

      // 3. Test hook: Third-party only insurance simulation
      if (cleanPlate.includes('THIRD') || cleanPlate.includes('TP')) {
        setStatus('REJECTED');
        setResponseMessage(
          'Registration Blocked: Vehicle has Third-Party cover only. Active Comprehensive Insurance is mandatory under FeSCo safety guidelines.',
        );
        return;
      }

      // Default: Clean Verification
      setStatus('VERIFIED');
      setEngineClass('B');
      setManufactureYear(2021);
      setResponseMessage(
        'Vehicle Verified! Class B (1798cc) registered with Hollard Comprehensive Insurance active.',
      );
    }, 900);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.title}>VEHICLE REGISTRATION</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Instructions Header */}
          <View style={styles.introCard}>
            <Text style={styles.introBadge}>SAFETY & LIABILITY GATE</Text>
            <Text style={styles.introHeading}>Private Vehicle Verification</Text>
            <Text style={styles.introSubtext}>
              To host corporate commutes, your vehicle must hold active Comprehensive Insurance and
              satisfy the 15-year statutory roadworthiness ceiling.
            </Text>
          </View>

          {/* Tab Selector: Camera OCR vs Manual Entry */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'manual' && styles.tabButtonActive]}
              onPress={() => setActiveTab('manual')}
            >
              <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
                MANUAL VIN ENTRY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'camera' && styles.tabButtonActive]}
              onPress={() => setActiveTab('camera')}
            >
              <Text style={[styles.tabText, activeTab === 'camera' && styles.tabTextActive]}>
                CAMERA OCR SCANNER
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'camera' ? (
            /* Camera Viewfinder View */
            <View style={[styles.cameraViewfinder, FeScoElevation.raised]}>
              <View style={styles.viewfinderGuide}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <Text style={styles.viewfinderText}>
                  Align 17-digit Chassis Tag or Windshield Barcode
                </Text>
              </View>

              <TouchableOpacity
                style={styles.scanActionButton}
                onPress={handleSimulateScan}
                disabled={status === 'SCANNING'}
              >
                <Text style={styles.scanActionButtonText}>
                  {status === 'SCANNING' ? 'SCANNING OPTICAL CODE...' : 'AUTO-CAPTURE VIN'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Form Fields */
            <View style={styles.formCard}>
              {/* License Plate Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>GHANA LICENSE PLATE</Text>
                <TextInput
                  style={styles.licenseInput}
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  placeholder="e.g. GW 2021-26"
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              {/* Formatted 4-4-4-5 VIN Input */}
              <VinInput
                value={chassisNumber}
                onChangeText={setChassisNumber}
                label="CHASSIS NUMBER (ISO 3779 VIN)"
              />

              {/* Quick Testing Preset Badges */}
              <View style={styles.presetsRow}>
                <Text style={styles.presetsLabel}>TEST PRESETS:</Text>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => {
                    setLicensePlate('GW 2021-26');
                    setChassisNumber('1HGCR2F83HA049101');
                  }}
                >
                  <Text style={styles.presetChipText}>Clean Class B</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => {
                    setLicensePlate('ER-500-26');
                    setChassisNumber('1HGCR2F83HA049101');
                  }}
                >
                  <Text style={styles.presetChipText}>Timeout (Pending)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => {
                    setLicensePlate('GT-2010-OLD');
                    setChassisNumber('1HGCR2F83HA049101');
                  }}
                >
                  <Text style={styles.presetChipText}>16 Yrs (Reject)</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Submission Button */}
          <TouchableOpacity
            style={[styles.submitButton, status === 'SUBMITTING' && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={status === 'SUBMITTING'}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>
              {status === 'SUBMITTING' ? 'VERIFYING WITH DVLA & NIC...' : 'VERIFY VEHICLE'}
            </Text>
          </TouchableOpacity>

          {/* 3-State Feedback UI Cards */}
          {status === 'VERIFIED' && (
            <View style={[styles.feedbackCard, styles.cardSuccess]}>
              <View style={styles.feedbackHeader}>
                <View style={styles.successIconCircle}>
                  <Text style={styles.iconText}>✓</Text>
                </View>
                <View style={styles.feedbackTextCol}>
                  <Text style={styles.successHeading}>Vehicle Verified</Text>
                  <Text style={styles.successSubheading}>
                    Class {engineClass} • 2021 Toyota Corolla ({manufactureYear})
                  </Text>
                </View>
              </View>
              <Text style={styles.feedbackBody}>{responseMessage}</Text>
              <TouchableOpacity
                style={styles.gatewayProceedButton}
                onPress={() => router.push('/host-commute')}
              >
                <Text style={styles.gatewayProceedText}>PROCEED TO HOST A COMMUTE →</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'PENDING' && (
            <View style={[styles.feedbackCard, styles.cardPending]}>
              <View style={styles.feedbackHeader}>
                <View style={styles.pendingIconCircle}>
                  <Text style={styles.iconText}>⏳</Text>
                </View>
                <View style={styles.feedbackTextCol}>
                  <Text style={styles.pendingHeading}>Verification Pending</Text>
                  <Text style={styles.pendingSubheading}>Government registries temporarily busy</Text>
                </View>
              </View>
              <Text style={styles.feedbackBody}>{responseMessage}</Text>
              <TouchableOpacity
                style={[styles.gatewayProceedButton, { backgroundColor: '#F59E0B' }]}
                onPress={() => router.push('/host-commute')}
              >
                <Text style={styles.gatewayProceedText}>OPEN DRAFT COMMUTE GATEWAY →</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'REJECTED' && (
            <View style={[styles.feedbackCard, styles.cardError]}>
              <View style={styles.feedbackHeader}>
                <View style={styles.errorIconCircle}>
                  <Text style={styles.iconText}>✕</Text>
                </View>
                <View style={styles.feedbackTextCol}>
                  <Text style={styles.errorHeading}>Registration Blocked</Text>
                  <Text style={styles.errorSubheading}>Safety compliance criteria not met</Text>
                </View>
              </View>
              <Text style={styles.feedbackBody}>{responseMessage}</Text>
            </View>
          )}
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
    paddingHorizontal: 10,
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
  introCard: {
    backgroundColor: '#1E293B',
    borderRadius: FeScoRadii.md,
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.md,
    borderLeftWidth: 4,
    borderLeftColor: FeScoColors.indigo,
  },
  introBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: FeScoColors.indigoLight,
    letterSpacing: 1,
    marginBottom: 4,
  },
  introHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  introSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: FeScoRadii.pill,
    padding: 3,
    marginBottom: FeScoSpacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: FeScoRadii.pill,
  },
  tabButtonActive: {
    backgroundColor: FeScoColors.indigo,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  cameraViewfinder: {
    backgroundColor: '#020617',
    borderRadius: FeScoRadii.lg,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  viewfinderGuide: {
    width: '90%',
    height: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: FeScoColors.indigoLight,
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
  viewfinderText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanActionButton: {
    backgroundColor: FeScoColors.indigo,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: FeScoRadii.pill,
  },
  scanActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: FeScoRadii.lg,
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.md,
  },
  inputGroup: {
    marginBottom: FeScoSpacing.sm,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  licenseInput: {
    backgroundColor: '#0F172A',
    borderRadius: FeScoRadii.md,
    borderWidth: 1.5,
    borderColor: '#334155',
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: FeScoSpacing.sm,
    height: 50,
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  presetsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginRight: 4,
  },
  presetChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: FeScoRadii.pill,
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  submitButton: {
    backgroundColor: FeScoColors.indigo,
    paddingVertical: 16,
    borderRadius: FeScoRadii.md,
    alignItems: 'center',
    marginBottom: FeScoSpacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  feedbackCard: {
    borderRadius: FeScoRadii.lg,
    padding: FeScoSpacing.md,
    borderWidth: 1.5,
  },
  cardSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: FeScoColors.emerald,
  },
  cardPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#F59E0B',
  },
  cardError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: FeScoColors.crimson,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  successIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: FeScoColors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pendingIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  errorIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: FeScoColors.crimson,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  feedbackTextCol: {
    flex: 1,
  },
  successHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: FeScoColors.emerald,
  },
  successSubheading: {
    fontSize: 12,
    color: '#94A3B8',
  },
  pendingHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F59E0B',
  },
  pendingSubheading: {
    fontSize: 12,
    color: '#94A3B8',
  },
  errorHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: FeScoColors.crimson,
  },
  errorSubheading: {
    fontSize: 12,
    color: '#94A3B8',
  },
  feedbackBody: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 12,
  },
  gatewayProceedButton: {
    backgroundColor: FeScoColors.emerald,
    paddingVertical: 12,
    borderRadius: FeScoRadii.md,
    alignItems: 'center',
  },
  gatewayProceedText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
