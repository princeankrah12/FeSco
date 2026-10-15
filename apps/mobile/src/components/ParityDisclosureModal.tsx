import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { FeScoColors, FeScoTypography, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';

export interface ParityDisclosureModalProps {
  visible: boolean;
  vehicleModel?: string;
  vehicleEngineClass?: string;
  vehicleSvocCeilingGhc: string;
  clubBaselineRateGhc: string;
  uncompensatedFuelDeltaGhc: string;
  netRotationCashDeltaGhc?: string;
  onAccept: () => void;
  onDecline?: () => void;
}

/**
 * Mixed-Fleet Cost Parity Disclosure Modal
 *
 * Enforces intentional consent friction and audit-proof ledger transparency
 * when a member joins a Carpool Club with an engine displacement above the Club Baseline Rate.
 */
export function ParityDisclosureModal({
  visible,
  vehicleModel = 'Toyota Land Cruiser Prado 3.0L',
  vehicleEngineClass = 'Class C (> 2500cc)',
  vehicleSvocCeilingGhc = 'GH₵ 22.20',
  clubBaselineRateGhc = 'GH₵ 14.00',
  uncompensatedFuelDeltaGhc = '-GH₵ 8.20',
  netRotationCashDeltaGhc = 'GH₵  0.00',
  onAccept,
  onDecline,
}: ParityDisclosureModalProps) {
  const [consented, setConsented] = useState(false);

  const handleAccept = () => {
    if (!consented) return;
    onAccept();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, FeScoElevation.popped]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header Badge */}
            <View style={styles.headerBadgeContainer}>
              <View style={styles.shieldPill}>
                <Text style={styles.shieldPillText}>⚖ COST PARITY INVARIANT</Text>
              </View>
            </View>

            <Text style={styles.modalTitle}>Mixed-Fleet Cost Parity Disclosure</Text>
            <Text style={styles.modalSubtitle}>
              {vehicleModel} • {vehicleEngineClass}
            </Text>

            {/* Audit-Proof Ledger Box */}
            <View style={styles.ledgerBox}>
              <Text style={styles.ledgerHeader}>MIXED-FLEET COST PARITY DISCLOSURE</Text>
              <Text style={styles.ledgerDivider}>
                ────────────────────────────────────────────────────
              </Text>

              <View style={styles.ledgerRow}>
                <Text
                  style={styles.ledgerLabel}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Your Vehicle SVOC Ceiling .........
                </Text>
                <Text
                  style={styles.ledgerValue}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {vehicleSvocCeilingGhc} / seat
                </Text>
              </View>

              <View style={styles.ledgerRow}>
                <Text
                  style={styles.ledgerLabel}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Club Baseline Rate (Capped) .......
                </Text>
                <Text
                  style={styles.ledgerValue}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {clubBaselineRateGhc} / seat
                </Text>
              </View>

              <View style={styles.ledgerRow}>
                <Text
                  style={styles.ledgerLabel}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Uncompensated Fuel Delta ..........
                </Text>
                <Text
                  style={[styles.ledgerValue, styles.deltaText]}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {uncompensatedFuelDeltaGhc} / seat
                </Text>
              </View>

              <Text
                style={styles.ledgerDivider}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ────────────────────────────────────────────────────
              </Text>

              <View style={styles.ledgerRow}>
                <Text
                  style={styles.ledgerBoldLabel}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  4-Week Net Rotation Cash Delta ....
                </Text>
                <Text
                  style={[styles.ledgerValue, styles.neutralText]}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {netRotationCashDeltaGhc}
                </Text>
              </View>
            </View>

            {/* Legal Rationale Note */}
            <View style={styles.rationaleBox}>
              <Text style={styles.rationaleText}>
                Under FeSCo not-for-profit rules, your vehicle fuel cost offset during your Hosting Week is capped at the Club Baseline Rate to maintain 4-week cash neutrality with peers operating lower-cost vehicles.
              </Text>
            </View>

            {/* Intentional Consent Friction: Interactive Checkbox Row (minHeight: 48dp) */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsented(!consented)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consented }}
              accessibilityLabel="Consent to mixed fleet cost parity cap"
            >
              <View style={[styles.checkboxBox, consented && styles.checkboxBoxChecked]}>
                {consented && <Text style={styles.checkmarkText}>✓</Text>}
              </View>
              <Text style={styles.consentLabel}>
                I understand my recovery during my Hosting Week is capped at the Club Baseline Rate to maintain 4-week cost parity.
              </Text>
            </TouchableOpacity>

            {/* Actions: Button State Lock */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                consented ? styles.primaryButtonActive : styles.primaryButtonDisabled,
              ]}
              onPress={handleAccept}
              disabled={!consented}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Accept Parity Cap & Join Club"
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  !consented && styles.primaryButtonTextDisabled,
                ]}
              >
                [Accept Parity Cap & Join Club]
              </Text>
            </TouchableOpacity>

            {onDecline && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onDecline}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Decline and explore other clubs"
              >
                <Text style={styles.secondaryButtonText}>Review Other Clubs</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: FeScoColors.darkMask,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FeScoSpacing.md,
  },
  modalCard: {
    backgroundColor: FeScoColors.card,
    borderRadius: FeScoRadii.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  scrollContent: {
    padding: FeScoSpacing.lg,
  },
  headerBadgeContainer: {
    alignItems: 'flex-start',
    marginBottom: FeScoSpacing.xs,
  },
  shieldPill: {
    backgroundColor: FeScoColors.indigoSubtle,
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: FeScoSpacing.xxs,
    borderRadius: FeScoRadii.pill,
    borderWidth: 1,
    borderColor: FeScoColors.indigo,
  },
  shieldPillText: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.indigo,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xl,
    fontWeight: '800',
    color: FeScoColors.slateDark,
    marginTop: FeScoSpacing.xs,
  },
  modalSubtitle: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    color: FeScoColors.slate,
    marginTop: FeScoSpacing.xxs,
    marginBottom: FeScoSpacing.md,
  },
  ledgerBox: {
    backgroundColor: FeScoColors.background,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
    borderRadius: FeScoRadii.md,
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.md,
  },
  ledgerHeader: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    fontWeight: '700',
    color: FeScoColors.slateDark,
    textAlign: 'center',
    marginBottom: FeScoSpacing.xxs,
  },
  ledgerDivider: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: 10,
    color: FeScoColors.slateMuted,
    textAlign: 'center',
    marginVertical: FeScoSpacing.xxs,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  ledgerLabel: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slate,
    flex: 1,
  },
  ledgerBoldLabel: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slateDark,
    fontWeight: '700',
    flex: 1,
  },
  ledgerValue: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slateDark,
    fontWeight: '600',
  },
  deltaText: {
    color: FeScoColors.amber,
  },
  neutralText: {
    color: FeScoColors.emerald,
    fontWeight: '800',
  },
  rationaleBox: {
    backgroundColor: FeScoColors.indigoSubtle,
    borderLeftWidth: 3,
    borderLeftColor: FeScoColors.indigo,
    padding: FeScoSpacing.sm,
    borderRadius: FeScoRadii.sm,
    marginBottom: FeScoSpacing.lg,
  },
  rationaleText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    lineHeight: 18,
    color: FeScoColors.indigoDark,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: FeScoSpacing.xs,
    marginBottom: FeScoSpacing.lg,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: FeScoColors.slate,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: FeScoSpacing.sm,
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: FeScoColors.indigo,
    borderColor: FeScoColors.indigo,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  consentLabel: {
    flex: 1,
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    lineHeight: 18,
    color: FeScoColors.slateDark,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: FeScoRadii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: FeScoSpacing.md,
    marginBottom: FeScoSpacing.xs,
  },
  primaryButtonActive: {
    backgroundColor: FeScoColors.indigo,
  },
  primaryButtonDisabled: {
    backgroundColor: FeScoColors.slate,
  },
  primaryButtonText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.base,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryButtonTextDisabled: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: FeScoSpacing.xxs,
  },
  secondaryButtonText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    color: FeScoColors.slate,
    fontWeight: '600',
  },
});
