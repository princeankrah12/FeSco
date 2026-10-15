import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';
import { formatPesewasToGhc } from '@fesco/domain';

interface LedgerItem {
  id: string;
  type: 'TOP_UP' | 'SEAT_HOLD' | 'COST_OFFSET';
  title: string;
  subtitle: string;
  amountPesewas: number;
  direction: 'CREDIT' | 'DEBIT';
  timestamp: string;
}

export default function WalletScreen() {
  const router = useRouter();

  // Balance in integer pesewas (GH₵ 120.00 initially)
  const [balancePesewas, setBalancePesewas] = useState(12000);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'MTN' | 'TELECEL' | 'AT'>('MTN');
  const [topUpAmountPesewas, setTopUpAmountPesewas] = useState(5000); // default GH₵ 50
  const [phone, setPhone] = useState('024 123 4567');
  const [isProcessing, setIsProcessing] = useState(false);

  const [ledgerHistory, setLedgerHistory] = useState<LedgerItem[]>([
    {
      id: 'tx_01',
      type: 'TOP_UP',
      title: 'MoMo Top-Up (MTN)',
      subtitle: 'PSP Clearing Ref: HUB-882194',
      amountPesewas: 10000,
      direction: 'CREDIT',
      timestamp: 'Today, 8:15 AM',
    },
    {
      id: 'tx_02',
      type: 'SEAT_HOLD',
      title: 'Seat Contribution Hold',
      subtitle: 'Commute: Agape Junction → Osu',
      amountPesewas: 1155,
      direction: 'DEBIT',
      timestamp: 'Yesterday, 5:40 PM',
    },
    {
      id: 'tx_03',
      type: 'COST_OFFSET',
      title: 'Host Cost Offset Reimbursement',
      subtitle: 'SVOC Verified Fuel Detour Recovery',
      amountPesewas: 3155,
      direction: 'CREDIT',
      timestamp: '12 Oct, 6:10 PM',
    },
  ]);

  const handleExecuteTopUp = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newBalance = balancePesewas + topUpAmountPesewas;
      setBalancePesewas(newBalance);

      const newTx: LedgerItem = {
        id: `tx_${Date.now()}`,
        type: 'TOP_UP',
        title: `MoMo Top-Up (${selectedNetwork})`,
        subtitle: `PSP Clearing Ref: HUB-${Math.floor(100000 + Math.random() * 900000)}`,
        amountPesewas: topUpAmountPesewas,
        direction: 'CREDIT',
        timestamp: 'Just now',
      };
      setLedgerHistory([newTx, ...ledgerHistory]);

      setIsProcessing(false);
      setShowTopUpModal(false);
      Alert.alert(
        'Top-Up Successful',
        `Your FeSCo wallet has been credited with ${formatPesewasToGhc(topUpAmountPesewas)}. Funds are safely pre-funded with our licensed PSP.`,
      );
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← DASHBOARD</Text>
          </TouchableOpacity>
          <Text style={styles.title}>PRE-FUNDED WALLET</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Balance Display Card */}
          <View style={[styles.balanceCard, FeScoElevation.raised]}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceTag}>SPENDABLE WALLET BALANCE</Text>
              <View style={styles.pspBadge}>
                <Text style={styles.pspBadgeText}>BoG Licensed PSP</Text>
              </View>
            </View>

            <Text style={styles.balanceAmount}>{formatPesewasToGhc(balancePesewas)}</Text>
            <Text style={styles.balanceSubtext}>
              Stored safely in integer pesewas ({balancePesewas} pesewas)
            </Text>

            {/* Quick Top-Up Action Buttons */}
            <View style={styles.quickTopUpRow}>
              <TouchableOpacity
                style={styles.topUpButtonMain}
                onPress={() => setShowTopUpModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.topUpButtonMainText}>+ Top Up via MoMo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preset Top-Up Pills */}
          <View style={styles.presetsContainer}>
            <Text style={styles.sectionHeading}>QUICK TOP-UP PRESETS</Text>
            <View style={styles.presetButtonsRow}>
              {[2000, 5000, 10000].map((pesewas) => (
                <TouchableOpacity
                  key={pesewas}
                  style={styles.presetButton}
                  onPress={() => {
                    setTopUpAmountPesewas(pesewas);
                    setShowTopUpModal(true);
                  }}
                >
                  <Text style={styles.presetButtonText}>+ {formatPesewasToGhc(pesewas)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ledger Activity Feed (Double-Entry Log) */}
          <View style={styles.ledgerSection}>
            <View style={styles.ledgerHeader}>
              <Text style={styles.sectionHeading}>TRANSACTION LEDGER</Text>
              <Text style={styles.ledgerBadge}>Double-Entry Verified</Text>
            </View>

            {ledgerHistory.map((item) => (
              <View key={item.id} style={styles.ledgerItemCard}>
                <View style={styles.ledgerLeft}>
                  <View
                    style={[
                      styles.ledgerIconCircle,
                      item.direction === 'CREDIT' ? styles.iconCredit : styles.iconDebit,
                    ]}
                  >
                    <Text style={styles.ledgerIconText}>
                      {item.direction === 'CREDIT' ? '↓' : '↑'}
                    </Text>
                  </View>
                  <View style={styles.ledgerDetails}>
                    <Text style={styles.ledgerTitle}>{item.title}</Text>
                    <Text style={styles.ledgerSubtitle}>{item.subtitle}</Text>
                    <Text style={styles.ledgerTimestamp}>{item.timestamp}</Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.ledgerAmount,
                    item.direction === 'CREDIT' ? styles.amountCredit : styles.amountDebit,
                  ]}
                >
                  {item.direction === 'CREDIT' ? '+' : '-'} {formatPesewasToGhc(item.amountPesewas)}
                </Text>
              </View>
            ))}
          </View>

          {/* Legal Compliance Footer Note */}
          <View style={styles.complianceNoteCard}>
            <Text style={styles.complianceHeading}>HOSTILE-AUDITOR-PROOF COMPLIANCE</Text>
            <Text style={styles.complianceText}>
              In compliance with Bank of Ghana (BoG) e-money directives and DVLA non-profit
              safeguards, user contributions are held strictly in non-interest settlement escrows.
              Hosts receive only verified fuel cost offsets; no commercial transport fees or commercial income
              are generated.
            </Text>
          </View>
        </ScrollView>

        {/* Top-Up via MoMo Modal */}
        <Modal visible={showTopUpModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>TOP UP VIA MOBILE MONEY</Text>
              <Text style={styles.modalSubtitle}>
                Pre-fund your FeSCo wallet through licensed Ghanaian PSP rails
              </Text>

              {/* Network Selector */}
              <Text style={styles.modalInputLabel}>SELECT NETWORK</Text>
              <View style={styles.networkSelectorRow}>
                {(['MTN', 'TELECEL', 'AT'] as const).map((net) => (
                  <TouchableOpacity
                    key={net}
                    style={[
                      styles.networkChip,
                      selectedNetwork === net && styles.networkChipActive,
                    ]}
                    onPress={() => setSelectedNetwork(net)}
                  >
                    <Text
                      style={[
                        styles.networkChipText,
                        selectedNetwork === net && styles.networkChipTextActive,
                      ]}
                    >
                      {net === 'MTN' ? 'MTN MoMo' : net === 'TELECEL' ? 'Telecel Cash' : 'AT Money'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Mobile Phone Number */}
              <Text style={styles.modalInputLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.modalInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="024 XXX XXXX"
                placeholderTextColor="#64748B"
              />

              {/* Amount Selection */}
              <Text style={styles.modalInputLabel}>AMOUNT TO PRE-FUND</Text>
              <View style={styles.amountPillsRow}>
                {[2000, 5000, 10000, 20000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.amountPill,
                      topUpAmountPesewas === amt && styles.amountPillActive,
                    ]}
                    onPress={() => setTopUpAmountPesewas(amt)}
                  >
                    <Text
                      style={[
                        styles.amountPillText,
                        topUpAmountPesewas === amt && styles.amountPillTextActive,
                      ]}
                    >
                      {formatPesewasToGhc(amt)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <TouchableOpacity
                style={[styles.modalConfirmButton, isProcessing && styles.buttonDisabled]}
                onPress={handleExecuteTopUp}
                disabled={isProcessing}
                activeOpacity={0.85}
              >
                <Text style={styles.modalConfirmButtonText}>
                  {isProcessing
                    ? 'INITIATING USSD PROMPT...'
                    : `PRE-FUND ${formatPesewasToGhc(topUpAmountPesewas)}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTopUpModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  balanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: FeScoRadii.xl,
    padding: FeScoSpacing.lg,
    marginBottom: FeScoSpacing.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  pspBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: FeScoRadii.pill,
  },
  pspBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: FeScoColors.indigoLight,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#F8FAFC',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: FeScoSpacing.md,
  },
  quickTopUpRow: {
    flexDirection: 'row',
  },
  topUpButtonMain: {
    backgroundColor: FeScoColors.indigo,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: FeScoRadii.md,
    alignItems: 'center',
    flex: 1,
  },
  topUpButtonMainText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  presetsContainer: {
    marginBottom: FeScoSpacing.md,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    borderRadius: FeScoRadii.md,
    alignItems: 'center',
  },
  presetButtonText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  ledgerSection: {
    marginBottom: FeScoSpacing.lg,
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ledgerBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: FeScoColors.emerald,
  },
  ledgerItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: FeScoSpacing.sm,
    borderRadius: FeScoRadii.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ledgerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ledgerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconCredit: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  iconDebit: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  ledgerIconText: {
    fontWeight: '900',
    fontSize: 14,
    color: '#F8FAFC',
  },
  ledgerDetails: {
    flex: 1,
  },
  ledgerTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  ledgerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  ledgerTimestamp: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  ledgerAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    marginLeft: 8,
  },
  amountCredit: {
    color: FeScoColors.emerald,
  },
  amountDebit: {
    color: '#F8FAFC',
  },
  complianceNoteCard: {
    backgroundColor: '#090D16',
    borderRadius: FeScoRadii.md,
    padding: FeScoSpacing.md,
    borderLeftWidth: 3,
    borderLeftColor: FeScoColors.indigo,
  },
  complianceHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: FeScoColors.indigoLight,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  complianceText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: FeScoRadii.xl,
    borderTopRightRadius: FeScoRadii.xl,
    padding: FeScoSpacing.lg,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: FeScoSpacing.md,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  networkSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: FeScoSpacing.md,
  },
  networkChip: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: FeScoRadii.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  networkChipActive: {
    borderColor: FeScoColors.indigo,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  networkChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  networkChipTextActive: {
    color: '#FFFFFF',
  },
  modalInput: {
    backgroundColor: '#1E293B',
    borderRadius: FeScoRadii.md,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    paddingHorizontal: FeScoSpacing.sm,
    height: 48,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: FeScoSpacing.md,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  amountPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: FeScoSpacing.lg,
  },
  amountPill: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: FeScoRadii.pill,
  },
  amountPillActive: {
    borderColor: FeScoColors.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  amountPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  amountPillTextActive: {
    color: FeScoColors.emerald,
  },
  modalConfirmButton: {
    backgroundColor: FeScoColors.indigo,
    paddingVertical: 14,
    borderRadius: FeScoRadii.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCancelButtonText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
  },
});
