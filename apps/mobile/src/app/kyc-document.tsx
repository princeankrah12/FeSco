import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { validateGhanaCardPin } from '@fesco/domain';
import { SubtractiveMask } from '../components/SubtractiveMask';
import { PermissionRecoveryView } from '../components/PermissionRecoveryView';
import { FeScoColors, FeScoSpacing, FeScoRadii } from '../theme';

export default function KycDocumentScreen() {
  const router = useRouter();

  // Camera permissions & recovery state
  const [hasPermission, setHasPermission] = useState<boolean | null>(true);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  // Scan state
  const [scanStatus, setScanStatus] = useState<
    'aligning' | 'detected' | 'blinking' | 'success' | 'failed'
  >('aligning');
  const [extractedPin, setExtractedPin] = useState('');
  const [manualPinInput, setManualPinInput] = useState('');
  const [pinValidationMessage, setPinValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    // Simulate auto-detecting Ghana Card in viewport after 2.5 seconds
    const timer = setTimeout(() => {
      const mockDetected = 'GHA-712345678-9';
      setExtractedPin(mockDetected);
      setManualPinInput(mockDetected);
      setScanStatus('success');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleManualCapture = () => {
    const mock = 'GHA-712345678-9';
    setExtractedPin(mock);
    setManualPinInput(mock);
    setScanStatus('success');
  };

  const handleConfirmDocument = () => {
    const validation = validateGhanaCardPin(manualPinInput);
    if (!validation.isValid) {
      setPinValidationMessage(validation.errorMessage ?? 'Invalid Ghana Card PIN');
      return;
    }

    // Advance to KYC Step B (Facial Liveness)
    router.push({
      pathname: '/kyc-liveness' as any,
      params: { pin: validation.formattedPin },
    });
  };

  if (isPermissionDenied || hasPermission === false) {
    return (
      <PermissionRecoveryView
        permissionType="Camera"
        purposeDescription="FeSCo requires camera access to scan your Ghana Card and verify biometric liveness against the National Identification Authority (NIA)."
        onRetry={() => {
          setIsPermissionDenied(false);
          setHasPermission(true);
        }}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Subtractive Dark Mask with Rectangular Punch-out */}
      <SubtractiveMask
        mode="document"
        status={scanStatus}
        title="Biometric KYC • Step A"
        instruction={
          scanStatus === 'success'
            ? 'Ghana Card Detected! Verify PIN below.'
            : 'Center front of Ghana Card within the frame for auto-capture'
        }
        onManualCapture={handleManualCapture}
        onClose={() => router.back()}
      />

      {/* Simulated camera background feed */}
      <View style={styles.cameraBackground}>
        <View style={styles.cameraPlaceholderContent}>
          <Text style={styles.cameraWatermark}>[Live Camera Feed Active]</Text>
          <Text style={styles.cameraSubtext}>ML-Kit Optical Character Recognition</Text>
        </View>
      </View>

      {/* Bottom Confirmation Tray */}
      {scanStatus === 'success' && (
        <View style={styles.confirmationTray}>
          <Text style={styles.trayLabel}>EXTRACTED GHANA CARD PIN</Text>
          <TextInput
            style={styles.pinInput}
            value={manualPinInput}
            onChangeText={(t) => {
              setManualPinInput(t);
              setPinValidationMessage(null);
            }}
            placeholder="GHA-XXXXXXXXX-X"
            placeholderTextColor={FeScoColors.slateLight}
            autoCapitalize="characters"
          />

          {pinValidationMessage && (
            <Text style={styles.errorText}>{pinValidationMessage}</Text>
          )}

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleConfirmDocument}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Confirm &amp; Proceed to Liveness</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dev permission toggle for testing */}
      <TouchableOpacity
        style={styles.devTrapButton}
        onPress={() => setIsPermissionDenied(true)}
      >
        <Text style={styles.devTrapText}>Simulate OS Deny</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FeScoColors.darkMaskSolid,
  },
  cameraBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholderContent: {
    alignItems: 'center',
  },
  cameraWatermark: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraSubtext: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 12,
    marginTop: 4,
  },
  confirmationTray: {
    position: 'absolute',
    bottom: 24,
    left: FeScoSpacing.md,
    right: FeScoSpacing.md,
    backgroundColor: FeScoColors.card,
    borderRadius: FeScoRadii.xl,
    padding: FeScoSpacing.md,
    zIndex: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  trayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.8,
  },
  pinInput: {
    backgroundColor: FeScoColors.background,
    borderWidth: 1.5,
    borderColor: FeScoColors.emerald,
    borderRadius: FeScoRadii.md,
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    color: FeScoColors.slateDark,
    marginVertical: FeScoSpacing.xs,
    fontFamily: Platform.select({ ios: 'SF Mono', android: 'monospace' }),
    textAlign: 'center',
  },
  errorText: {
    color: FeScoColors.crimson,
    fontSize: 12,
    marginBottom: FeScoSpacing.xs,
  },
  continueButton: {
    backgroundColor: FeScoColors.indigo,
    borderRadius: FeScoRadii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  devTrapButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  devTrapText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
