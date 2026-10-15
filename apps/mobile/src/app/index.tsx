import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  validateCorporateEmail,
  SEEDED_CORPORATE_ALLOWLIST,
  CorporateEmployer,
} from '@fesco/domain';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';

export default function CorporateGateScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [detectedEmployer, setDetectedEmployer] = useState<CorporateEmployer | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isRequestingCompany, setIsRequestingCompany] = useState(false);
  const [companyNameInput, setCompanyNameInput] = useState('');

  // Step 2: OTP State
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedDebugOtp, setSimulatedDebugOtp] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError(null);

    const parts = text.trim().toLowerCase().split('@');
    if (parts.length === 2 && parts[1]) {
      const employer = SEEDED_CORPORATE_ALLOWLIST.find(
        (e) => e.domain.toLowerCase() === parts[1],
      );
      setDetectedEmployer(employer ?? null);
    } else {
      setDetectedEmployer(null);
    }
  };

  const handleRequestAccess = () => {
    const result = validateCorporateEmail(email);

    if (!result.isValid) {
      setEmailError(result.errorMessage ?? 'Please enter a valid corporate email.');
      if (result.canRequestAddition) {
        setIsRequestingCompany(true);
      }
      return;
    }

    // Generate debug OTP for simulation
    const debugCode = '742918';
    setSimulatedDebugOtp(debugCode);
    setHasRequestedCode(true);
    setOtpError(null);
  };

  const handleVerifyOtp = () => {
    if (otpCode.trim() !== simulatedDebugOtp && otpCode.trim() !== '742918') {
      setOtpError('Invalid 6-digit code. Please enter the code sent to your email.');
      return;
    }

    // Success! Navigate to KYC Step A (Ghana Card document scan)
    router.push('/kyc-document' as any);
  };

  const handleSubmitCompanyAddition = () => {
    if (!companyNameInput.trim()) {
      Alert.alert('Required', 'Please enter your employer or company name.');
      return;
    }

    Alert.alert(
      'Verification Request Received',
      `Thank you. Our compliance team will review "${companyNameInput.trim()}" and notify you at ${email} once approved.`,
      [{ text: 'OK', onPress: () => setIsRequestingCompany(false) }],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header Branding */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetter}>F</Text>
            </View>
            <Text style={styles.appName}>FeSCo</Text>
            <Text style={styles.appSubtitle}>Fuel Share Commute • Corporate Accra</Text>
            <View style={styles.mandateBadge}>
              <Text style={styles.mandateText}>NOT-FOR-PROFIT COST-SHARING UTILITY</Text>
            </View>
          </View>

          {/* Card Form */}
          <View style={[styles.card, FeScoElevation.raised]}>
            {!hasRequestedCode ? (
              <>
                <Text style={styles.stepTitle}>Corporate Gatekeeper</Text>
                <Text style={styles.stepDescription}>
                  FeSCo is exclusively available to verified corporate professionals in Accra.
                  Please enter your work email to begin.
                </Text>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CORPORATE WORK EMAIL</Text>
                  <TextInput
                    style={[
                      styles.input,
                      emailError ? styles.inputError : detectedEmployer ? styles.inputSuccess : null,
                    ]}
                    placeholder="e.g. kwame.asante@gcbbank.com.gh"
                    placeholderTextColor={FeScoColors.slateLight}
                    value={email}
                    onChangeText={handleEmailChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>

                {/* Employer Recognition Pill */}
                {detectedEmployer && (
                  <View style={styles.employerPill}>
                    <View style={styles.employerPillDot} />
                    <Text style={styles.employerPillText}>
                      {detectedEmployer.companyName} • {detectedEmployer.primaryHub}
                    </Text>
                  </View>
                )}

                {/* Error Message */}
                {emailError && <Text style={styles.errorText}>{emailError}</Text>}

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleRequestAccess}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Verify Corporate Access</Text>
                </TouchableOpacity>

                {/* Request Addition Section */}
                {isRequestingCompany && (
                  <View style={styles.companyRequestBox}>
                    <Text style={styles.companyRequestTitle}>Employer Domain Not On List?</Text>
                    <Text style={styles.companyRequestDesc}>
                      Request an admin review to approve your institution:
                    </Text>
                    <TextInput
                      style={styles.companyInput}
                      placeholder="Company / Institution Name"
                      placeholderTextColor={FeScoColors.slateLight}
                      value={companyNameInput}
                      onChangeText={setCompanyNameInput}
                    />
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={handleSubmitCompanyAddition}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.secondaryButtonText}>Submit for Verification</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                {/* OTP Verification Step */}
                <Text style={styles.stepTitle}>Check Your Inbox</Text>
                <Text style={styles.stepDescription}>
                  We sent a 6-digit authentication code and magic link to:
                </Text>
                <Text style={styles.emailHighlighted}>{email}</Text>

                {/* OTP Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>6-DIGIT VERIFICATION CODE</Text>
                  <TextInput
                    style={[styles.input, styles.otpInputMono, otpError ? styles.inputError : null]}
                    placeholder="••••••"
                    placeholderTextColor={FeScoColors.slateLight}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                {otpError && <Text style={styles.errorText}>{otpError}</Text>}

                {/* Simulated OTP notice for testing */}
                {simulatedDebugOtp && (
                  <View style={styles.debugBox}>
                    <Text style={styles.debugLabel}>DEVELOPER OTP FALLBACK:</Text>
                    <Text style={styles.debugCode}>{simulatedDebugOtp}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleVerifyOtp}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Continue to Biometric KYC</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.textButton}
                  onPress={() => setHasRequestedCode(false)}
                >
                  <Text style={styles.textButtonLabel}>Change email address</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer Legal Mandate Notice */}
          <View style={styles.legalFooter}>
            <Text style={styles.legalNotice}>
              FeSCo strictly complies with the National Insurance Commission (NIC) and DVLA
              cost-sharing rules. Commuters share actual operating costs only. No commercial income
              or surcharges are generated.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    padding: FeScoSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: FeScoSpacing.lg,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: FeScoColors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: FeScoSpacing.xs,
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: FeScoColors.indigoDark,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: FeScoColors.slate,
    marginTop: 2,
  },
  mandateBadge: {
    backgroundColor: FeScoColors.emeraldSubtle,
    borderColor: FeScoColors.emeraldBorder,
    borderWidth: 1,
    borderRadius: FeScoRadii.pill,
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: 3,
    marginTop: FeScoSpacing.xs,
  },
  mandateText: {
    fontSize: 10,
    fontWeight: '700',
    color: FeScoColors.emerald,
    letterSpacing: 0.6,
  },
  card: {
    width: '100%',
    backgroundColor: FeScoColors.card,
    borderRadius: FeScoRadii.xl,
    padding: FeScoSpacing.lg,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: FeScoColors.slateDark,
    marginBottom: FeScoSpacing.xxs,
  },
  stepDescription: {
    fontSize: 14,
    color: FeScoColors.slate,
    lineHeight: 20,
    marginBottom: FeScoSpacing.md,
  },
  inputGroup: {
    marginBottom: FeScoSpacing.sm,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.8,
    marginBottom: FeScoSpacing.xxs,
  },
  input: {
    backgroundColor: FeScoColors.background,
    borderWidth: 1.5,
    borderColor: FeScoColors.slateBorder,
    borderRadius: FeScoRadii.md,
    paddingHorizontal: FeScoSpacing.md,
    paddingVertical: Platform.select({ ios: 14, android: 10 }),
    fontSize: 15,
    color: FeScoColors.slateDark,
  },
  inputError: {
    borderColor: FeScoColors.crimson,
    backgroundColor: FeScoColors.crimsonSubtle,
  },
  inputSuccess: {
    borderColor: FeScoColors.emerald,
  },
  employerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FeScoColors.emeraldSubtle,
    borderWidth: 1,
    borderColor: FeScoColors.emeraldBorder,
    borderRadius: FeScoRadii.pill,
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: 5,
    marginBottom: FeScoSpacing.sm,
    alignSelf: 'flex-start',
  },
  employerPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: FeScoColors.emerald,
    marginRight: 6,
  },
  employerPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: FeScoColors.emerald,
  },
  errorText: {
    color: FeScoColors.crimson,
    fontSize: 13,
    marginBottom: FeScoSpacing.sm,
  },
  primaryButton: {
    backgroundColor: FeScoColors.indigo,
    borderRadius: FeScoRadii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: FeScoSpacing.xs,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  companyRequestBox: {
    marginTop: FeScoSpacing.md,
    paddingTop: FeScoSpacing.md,
    borderTopWidth: 1,
    borderTopColor: FeScoColors.slateBorder,
  },
  companyRequestTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: FeScoColors.slateDark,
  },
  companyRequestDesc: {
    fontSize: 12,
    color: FeScoColors.slate,
    marginVertical: FeScoSpacing.xxs,
  },
  companyInput: {
    backgroundColor: FeScoColors.background,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
    borderRadius: FeScoRadii.md,
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: FeScoSpacing.xs,
  },
  secondaryButton: {
    backgroundColor: FeScoColors.indigoSubtle,
    borderRadius: FeScoRadii.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: FeScoColors.indigo,
    fontSize: 13,
    fontWeight: '600',
  },
  emailHighlighted: {
    fontSize: 15,
    fontWeight: '700',
    color: FeScoColors.indigo,
    marginBottom: FeScoSpacing.md,
  },
  otpInputMono: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'SF Mono', android: 'monospace' }),
  },
  debugBox: {
    backgroundColor: FeScoColors.amberSubtle,
    borderWidth: 1,
    borderColor: FeScoColors.amberBorder,
    borderRadius: FeScoRadii.md,
    padding: FeScoSpacing.sm,
    marginBottom: FeScoSpacing.sm,
    alignItems: 'center',
  },
  debugLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: FeScoColors.amber,
  },
  debugCode: {
    fontSize: 18,
    fontWeight: '700',
    color: FeScoColors.amber,
    fontFamily: Platform.select({ ios: 'SF Mono', android: 'monospace' }),
    marginTop: 2,
  },
  textButton: {
    alignItems: 'center',
    marginTop: FeScoSpacing.md,
    paddingVertical: 4,
  },
  textButtonLabel: {
    fontSize: 13,
    color: FeScoColors.slate,
    fontWeight: '500',
  },
  legalFooter: {
    marginTop: FeScoSpacing.lg,
    paddingHorizontal: FeScoSpacing.sm,
  },
  legalNotice: {
    fontSize: 11,
    color: FeScoColors.slateLight,
    textAlign: 'center',
    lineHeight: 16,
  },
});
