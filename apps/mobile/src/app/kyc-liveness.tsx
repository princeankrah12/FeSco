import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SubtractiveMask } from '../components/SubtractiveMask';
import { FeScoColors, FeScoSpacing, FeScoRadii } from '../theme';

export default function KycLivenessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ghanaCardPin = (params.pin as string) || 'GHA-712345678-9';

  const [livenessStatus, setLivenessStatus] = useState<
    'aligning' | 'detected' | 'blinking' | 'success' | 'failed'
  >('aligning');
  const [blinkCount, setBlinkCount] = useState(0);

  useEffect(() => {
    // Stage 1: Face detected after 1.5 seconds
    const t1 = setTimeout(() => {
      setLivenessStatus('detected');
    }, 1500);

    // Stage 2: Prompt to blink after 2.5 seconds
    const t2 = setTimeout(() => {
      setLivenessStatus('blinking');
    }, 2500);

    // Stage 3: Blink detected + Emerald success after 4 seconds
    const t3 = setTimeout(() => {
      setBlinkCount(1);
      setLivenessStatus('success');
    }, 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleSimulateBlink = () => {
    setBlinkCount(1);
    setLivenessStatus('success');
  };

  const handleProceedToBridge = () => {
    router.push('/corporate-bridge' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Subtractive Dark Mask with Circular Punch-out */}
      <SubtractiveMask
        mode="liveness"
        status={livenessStatus}
        title="Biometric KYC • Step B"
        instruction={
          livenessStatus === 'success'
            ? 'Facial Liveness Confirmed with NIA Biometric Registry!'
            : livenessStatus === 'blinking'
            ? 'Please blink once naturally to confirm liveness'
            : livenessStatus === 'detected'
            ? 'Face centered. Hold still...'
            : 'Center your face within the circle'
        }
        blinkCount={blinkCount}
        onClose={() => router.back()}
      />

      {/* Simulated camera feed */}
      <View style={styles.cameraBackground}>
        <View style={styles.faceTargetCenter}>
          <Text style={styles.faceTargetIcon}>👤</Text>
          <Text style={styles.cameraSubtext}>Front Camera • Facial Biometrics</Text>
        </View>
      </View>

      {/* Success Bottom Tray */}
      {livenessStatus === 'success' && (
        <View style={styles.successTray}>
          <View style={styles.successBadgeRow}>
            <View style={styles.emeraldCheckCircle}>
              <Text style={styles.emeraldCheckText}>✓</Text>
            </View>
            <View style={styles.successDetails}>
              <Text style={styles.successName}>KWAME ASANTE</Text>
              <Text style={styles.successPin}>{ghanaCardPin}</Text>
            </View>
          </View>

          <Text style={styles.niaVerifiedNotice}>
            ✓ National Identification Authority (NIA) Biometric Match Confirmed
          </Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleProceedToBridge}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Complete Onboarding</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual blink trigger for test speed */}
      {livenessStatus !== 'success' && (
        <TouchableOpacity style={styles.quickBlinkButton} onPress={handleSimulateBlink}>
          <Text style={styles.quickBlinkText}>Tap to Simulate Blink</Text>
        </TouchableOpacity>
      )}
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
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceTargetCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceTargetIcon: {
    fontSize: 90,
    opacity: 0.25,
  },
  cameraSubtext: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    marginTop: 8,
  },
  successTray: {
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
  successBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FeScoSpacing.xs,
  },
  emeraldCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: FeScoColors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FeScoSpacing.sm,
  },
  emeraldCheckText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  successDetails: {
    flex: 1,
  },
  successName: {
    fontSize: 16,
    fontWeight: '700',
    color: FeScoColors.slateDark,
  },
  successPin: {
    fontSize: 13,
    color: FeScoColors.slate,
    fontWeight: '600',
  },
  niaVerifiedNotice: {
    fontSize: 11,
    color: FeScoColors.emerald,
    fontWeight: '600',
    marginVertical: FeScoSpacing.xs,
  },
  continueButton: {
    backgroundColor: FeScoColors.indigo,
    borderRadius: FeScoRadii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: FeScoSpacing.xxs,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickBlinkButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    zIndex: 25,
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickBlinkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
