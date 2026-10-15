import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FeScoColors, FeScoTypography, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';
import { ParityDisclosureModal } from '../components/ParityDisclosureModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RosterDaySchedule {
  id: string;
  dayName: string;
  dateStr: string;
  amTime: string;
  pmTime: string;
  scheduledHost: string;
  actualHost: string;
  isSwap: boolean;
  penaltyFreeRelease: boolean;
  ridingCreditRebatePesewas: number;
  rosteredCommuters: string[];
}

export default function ClubHubScreen() {
  const router = useRouter();

  // Active Week in 4-Week Rotation (1 to 4)
  const [selectedWeek, setSelectedWeek] = useState<number>(2); // Default to Week 2 (Co-Commuting/Resting)

  // AI Concierge Proposal Banner Visibility
  const [showConciergeCard, setShowConciergeCard] = useState<boolean>(true);
  const [swappedWed, setSwappedWed] = useState<boolean>(false);

  // Parity Modal Visibility
  const [showParityModal, setShowParityModal] = useState<boolean>(false);

  // Drawer Visibility
  const [showDrawer, setShowDrawer] = useState<boolean>(false);

  // Transient Emerald pulse animation for swapped card
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // 4-Week Schedule State
  const weeksConfig = [
    { weekNum: 1, hostLabel: 'Kwesi', isUserHosting: false },
    { weekNum: 2, hostLabel: 'Resting', isUserHosting: false }, // User Co-Commuting Week
    { weekNum: 3, hostLabel: 'Ama', isUserHosting: false },
    { weekNum: 4, hostLabel: 'Kofi', isUserHosting: true }, // User Hosting Week
  ];

  // Daily Rosters for Selected Week
  const [rosterData, setRosterData] = useState<Record<number, RosterDaySchedule[]>>({
    1: [
      {
        id: 'w1_mon',
        dayName: 'Monday',
        dateStr: 'Oct 12',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwesi Mensah',
        actualHost: 'Kwesi Mensah',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KA', 'AB', 'YA'],
      },
      {
        id: 'w1_tue',
        dayName: 'Tuesday',
        dateStr: 'Oct 13',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwesi Mensah',
        actualHost: 'Kwesi Mensah',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KA', 'AB', 'YA'],
      },
      {
        id: 'w1_wed',
        dayName: 'Wednesday',
        dateStr: 'Oct 14',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwesi Mensah',
        actualHost: 'Kwesi Mensah',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KA', 'AB', 'YA'],
      },
      {
        id: 'w1_thu',
        dayName: 'Thursday',
        dateStr: 'Oct 15',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwesi Mensah',
        actualHost: 'Kwesi Mensah',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KA', 'AB', 'YA'],
      },
      {
        id: 'w1_fri',
        dayName: 'Friday',
        dateStr: 'Oct 16',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwesi Mensah',
        actualHost: 'Kwesi Mensah',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KA', 'AB', 'YA'],
      },
    ],
    2: [
      {
        id: 'w2_mon',
        dayName: 'Monday',
        dateStr: 'Oct 19',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kofi Mensah',
        actualHost: 'Kofi Mensah',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 1400, // Relief Rebate active
        rosteredCommuters: ['KA', 'AM', 'YA'],
      },
      {
        id: 'w2_tue',
        dayName: 'Tuesday',
        dateStr: 'Oct 20',
        amTime: '05:45',
        pmTime: '17:45',
        scheduledHost: 'Kofi Mensah',
        actualHost: 'Kofi Mensah',
        isSwap: false,
        penaltyFreeRelease: true, // Time-Shift Dissenter flag
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KA', 'AM', 'YA'],
      },
      {
        id: 'w2_wed',
        dayName: 'Wednesday',
        dateStr: 'Oct 21',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwesi Mensah',
        actualHost: 'Kwesi Mensah',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KA', 'AM', 'YA'],
      },
      {
        id: 'w2_thu',
        dayName: 'Thursday',
        dateStr: 'Oct 22',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kofi Mensah',
        actualHost: 'Kofi Mensah',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KA', 'AM', 'YA'],
      },
      {
        id: 'w2_fri',
        dayName: 'Friday',
        dateStr: 'Oct 23',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kofi Mensah',
        actualHost: 'Kofi Mensah',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KA', 'AM', 'YA'],
      },
    ],
    3: [
      {
        id: 'w3_mon',
        dayName: 'Monday',
        dateStr: 'Oct 26',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Ama Asante',
        actualHost: 'Ama Asante',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'KM', 'YA'],
      },
      {
        id: 'w3_tue',
        dayName: 'Tuesday',
        dateStr: 'Oct 27',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Ama Asante',
        actualHost: 'Ama Asante',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'KM', 'YA'],
      },
      {
        id: 'w3_wed',
        dayName: 'Wednesday',
        dateStr: 'Oct 28',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Ama Asante',
        actualHost: 'Ama Asante',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'KM', 'YA'],
      },
      {
        id: 'w3_thu',
        dayName: 'Thursday',
        dateStr: 'Oct 29',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Ama Asante',
        actualHost: 'Ama Asante',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'KM', 'YA'],
      },
      {
        id: 'w3_fri',
        dayName: 'Friday',
        dateStr: 'Oct 30',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Ama Asante',
        actualHost: 'Ama Asante',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'KM', 'YA'],
      },
    ],
    4: [
      {
        id: 'w4_mon',
        dayName: 'Monday',
        dateStr: 'Nov 02',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwame Asante (You)',
        actualHost: 'Kwame Asante (You)',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'AM', 'KM'],
      },
      {
        id: 'w4_tue',
        dayName: 'Tuesday',
        dateStr: 'Nov 03',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwame Asante (You)',
        actualHost: 'Kwame Asante (You)',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'AM', 'KM'],
      },
      {
        id: 'w4_wed',
        dayName: 'Wednesday',
        dateStr: 'Nov 04',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwame Asante (You)',
        actualHost: 'Kwame Asante (You)',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'AM', 'KM'],
      },
      {
        id: 'w4_thu',
        dayName: 'Thursday',
        dateStr: 'Nov 05',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwame Asante (You)',
        actualHost: 'Kwame Asante (You)',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'AM', 'KM'],
      },
      {
        id: 'w4_fri',
        dayName: 'Friday',
        dateStr: 'Nov 06',
        amTime: '05:30',
        pmTime: '17:30',
        scheduledHost: 'Kwame Asante (You)',
        actualHost: 'Kwame Asante (You)',
        isSwap: false,
        penaltyFreeRelease: false,
        ridingCreditRebatePesewas: 0,
        rosteredCommuters: ['KW', 'AM', 'KM'],
      },
    ],
  });

  const isCurrentWeekHosting = selectedWeek === 4;

  /**
   * Zone 3 Action: Accept Reciprocal Swap
   * Wraps transition in LayoutAnimation over 250ms and triggers transient Emerald pulse
   */
  const handleAcceptReciprocalSwap = () => {
    // 1. LayoutAnimation to smoothly collapse Zone 3 without reflow snap
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowConciergeCard(false);
    setSwappedWed(true);

    // 2. Update roster schedule for Wednesday
    setRosterData((prev) => {
      const w2 = prev[2]!.map((day) =>
        day.dayName === 'Wednesday'
          ? {
              ...day,
              actualHost: 'Ama Asante',
              isSwap: true,
            }
          : day,
      );
      return { ...prev, 2: w2 };
    });

    // 3. Transient Emerald border pulse (0 -> 1 -> 0 over 600ms)
    pulseAnim.setValue(0);
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleDismissConciergeCard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowConciergeCard(false);
  };

  const handleReleasePenaltyFree = (dayName: string) => {
    Alert.alert(
      'Seat Released Without Penalty',
      `Your seat for ${dayName} morning commute has been released to the Ad-hoc pool. No cancellation penalty applied due to approved departure time shift.`,
      [{ text: 'OK' }],
    );
  };

  const currentDays = rosterData[selectedWeek] ?? [];

  // Interpolated border color for Wednesday swap pulse
  const wedBorderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [FeScoColors.slateBorder, FeScoColors.emerald],
  });
  const wedBgColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', FeScoColors.emeraldSubtle],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Navigation */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
            accessibilityLabel="Back to Dashboard"
          >
            <Text style={styles.backButtonText}>← Dashboard</Text>
          </TouchableOpacity>
          <View style={styles.navTitleGroup}>
            <Text style={styles.clubTitle}>Airport City Express</Text>
            <Text style={styles.clubSubtitle}>Cycle 1 • 4-Week Rotation</Text>
          </View>
          <TouchableOpacity
            style={styles.parityProofButton}
            onPress={() => setShowParityModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="View mixed fleet cost parity proof"
          >
            <Text style={styles.parityProofText}>⚖ Parity</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ────────────────────────────────────────────────────────
              ZONE 1: CYCLE STATUS BANNER (TOP ANCHOR)
             ──────────────────────────────────────────────────────── */}
          <View
            style={[
              styles.zone1Banner,
              isCurrentWeekHosting
                ? styles.zone1BannerHosting
                : styles.zone1BannerCoCommuting,
            ]}
          >
            <View style={styles.zone1TextCol}>
              <Text style={styles.zone1Eyebrow}>
                {isCurrentWeekHosting ? 'ACTIVE CYCLE 1 • WEEK 4/4' : `ACTIVE CYCLE 1 • WEEK ${selectedWeek}/4`}
              </Text>
              <Text style={styles.zone1Heading}>
                {isCurrentWeekHosting
                  ? 'Hosting Week • 100% Fuel Offset'
                  : 'Co-Commuting Week (Vehicle Resting)'}
              </Text>
            </View>

            <View style={styles.zone1StakePill}>
              <Text style={styles.zone1StakePillText}>
                {isCurrentWeekHosting
                  ? 'Stake: GH₵ 60.00 Secured'
                  : 'Stake: GH₵ 38.00 / 60.00'}
              </Text>
            </View>
          </View>

          {/* ────────────────────────────────────────────────────────
              ZONE 2: 4-WEEK CAROUSEL (HORIZONTAL SELECTOR)
             ──────────────────────────────────────────────────────── */}
          <View style={styles.zone2CarouselContainer}>
            <Text style={styles.zone2Header}>4-WEEK ROTATION SCHEDULE</Text>
            <View style={styles.zone2TabsRow}>
              {weeksConfig.map((wk) => {
                const isActive = wk.weekNum === selectedWeek;
                return (
                  <TouchableOpacity
                    key={wk.weekNum}
                    style={[
                      styles.zone2Tab,
                      isActive && styles.zone2TabActive,
                    ]}
                    onPress={() => setSelectedWeek(wk.weekNum)}
                    activeOpacity={0.85}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text
                      style={[
                        styles.zone2TabText,
                        isActive && styles.zone2TabTextActive,
                      ]}
                    >
                      Wk {wk.weekNum}: {wk.hostLabel}
                    </Text>
                    {isActive && <View style={styles.zone2ActiveIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ────────────────────────────────────────────────────────
              ZONE 3: CONDITIONAL AI CONCIERGE CARD (LAYOUT-ANIMATED)
             ──────────────────────────────────────────────────────── */}
          {showConciergeCard && selectedWeek === 2 && (
            <View style={[styles.zone3Card, FeScoElevation.raised]}>
              <View style={styles.zone3HeaderRow}>
                <View style={styles.zone3Badge}>
                  <Text style={styles.zone3BadgeText}>
                    🤖 AI CONCIERGE PROPOSAL • SINGLE-DAY RELIEF SWAP
                  </Text>
                </View>
              </View>

              <Text style={styles.zone3Title}>
                Swap Wed Oct 21 ↔ Wed Oct 28 with Ama
              </Text>
              <Text style={styles.zone3Body}>
                Detected 3 consecutive Wednesday morning delays (+40m avg). Ama is available to swap hosting days. Both members maintain exactly 5 hosting days across the 4-week cycle.
              </Text>

              <View style={styles.zone3ActionsRow}>
                <TouchableOpacity
                  style={styles.zone3AcceptBtn}
                  onPress={handleAcceptReciprocalSwap}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Accept Reciprocal Swap"
                >
                  <Text style={styles.zone3AcceptBtnText}>Accept Reciprocal Swap</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zone3DismissBtn}
                  onPress={handleDismissConciergeCard}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss proposal"
                >
                  <Text style={styles.zone3DismissBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ────────────────────────────────────────────────────────
              ZONE 4: MON–FRI ROSTER STACK (STATEFUL DAY CARDS)
             ──────────────────────────────────────────────────────── */}
          <View style={styles.zone4Container}>
            <View style={styles.zone4HeaderRow}>
              <Text style={styles.zone4Title}>ROSTERED COMMUTES</Text>
              <Text style={styles.zone4Subtitle}>3 Seats Capped at Baseline Rate</Text>
            </View>

            {currentDays.map((day) => {
              const isSwappedWedCard = day.dayName === 'Wednesday' && (day.isSwap || swappedWed);

              return (
                <Animated.View
                  key={day.id}
                  style={[
                    styles.dayCard,
                    FeScoElevation.raised,
                    day.penaltyFreeRelease ? styles.dayCardAmberBorder : null,
                    isSwappedWedCard
                      ? {
                          borderColor: wedBorderColor,
                          backgroundColor: wedBgColor,
                        }
                      : null,
                  ]}
                >
                  {/* Card Header: Day, Date, AM/PM Times */}
                  <View style={styles.dayCardHeader}>
                    <View style={styles.dayCardDayCol}>
                      <Text style={styles.dayCardDayName}>{day.dayName}</Text>
                      <Text style={styles.dayCardDateStr}>{day.dateStr}</Text>
                    </View>

                    <View style={styles.dayCardTimesPill}>
                      <Text style={styles.dayCardTimesText}>
                        {day.amTime} / {day.pmTime}
                      </Text>
                    </View>
                  </View>

                  {/* Host Identity Row */}
                  <View style={styles.hostRow}>
                    <View style={styles.hostAvatarRing}>
                      <Text style={styles.hostAvatarInitial}>
                        {day.actualHost.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.hostDetailsCol}>
                      <View style={styles.hostNamePillRow}>
                        {day.isSwap ? (
                          <View style={styles.swappedHostGroup}>
                            <Text style={styles.originalHostStrikethrough}>
                              ~{day.scheduledHost.split(' ')[0]}~
                            </Text>
                            <Text style={styles.hostNameText}> → {day.actualHost.split(' ')[0]}</Text>
                            <View style={styles.swappedBadgePill}>
                              <Text style={styles.swappedBadgeText}>⇄ Swapped Host</Text>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.hostNameText}>{day.actualHost}</Text>
                        )}
                      </View>

                      <Text style={styles.hostSubText}>
                        {day.actualHost.includes('Kwame')
                          ? 'Toyota Camry • Class B (1798cc)'
                          : 'Club Assigned Host'}
                      </Text>
                    </View>
                  </View>

                  {/* Rostered Commuter Mini-Avatars & Special Badges */}
                  <View style={styles.cardFooterRow}>
                    <View style={styles.cocommutersGroup}>
                      <Text style={styles.cocommutersLabel}>Co-Commuters:</Text>
                      <View style={styles.avatarsCluster}>
                        {day.rosteredCommuters.map((init, i) => (
                          <View key={i} style={styles.commuterAvatarPill}>
                            <Text style={styles.commuterAvatarText}>{init}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Relief Rebate Chip */}
                    {day.ridingCreditRebatePesewas > 0 && (
                      <View style={styles.reliefRebateChip}>
                        <Text style={styles.reliefRebateChipText}>
                          GH₵ 0.00 Lock (Relief Rebate)
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Time-Shift Dissenter 1-Tap Action */}
                  {day.penaltyFreeRelease && (
                    <View style={styles.penaltyFreeActionBox}>
                      <View style={styles.penaltyFreeNoticeRow}>
                        <Text style={styles.amberWarningIcon}>⚠</Text>
                        <Text style={styles.penaltyFreeNoticeText}>
                          Departure time shifted to 05:45. You voted against this shift.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.penaltyFreeButton}
                        onPress={() => handleReleasePenaltyFree(day.dayName)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Release Seat (No Penalty)"
                      >
                        <Text style={styles.penaltyFreeButtonText}>
                          [Release Seat (No Penalty)]
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        {/* ────────────────────────────────────────────────────────
            ZONE 5: AVAILABILITY & SWAP TRIGGER DRAWER BUTTON
           ──────────────────────────────────────────────────────── */}
        <View style={styles.zone5BottomBar}>
          <TouchableOpacity
            style={styles.zone5DrawerBtn}
            onPress={() => setShowDrawer(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Manage Availability / Propose Swap"
          >
            <Text style={styles.zone5DrawerBtnText}>
              [Manage Availability / Propose Swap]
            </Text>
          </TouchableOpacity>
        </View>

        {/* Drawer Modal */}
        <Modal
          visible={showDrawer}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDrawer(false)}
        >
          <View style={styles.drawerOverlay}>
            <View style={[styles.drawerCard, FeScoElevation.popped]}>
              <View style={styles.drawerHandle} />
              <Text style={styles.drawerTitle}>Availability & Swap Consensus</Text>
              <Text style={styles.drawerSubtitle}>
                Carpool Club Two-Party Handshake & Roster Flexibility
              </Text>

              <TouchableOpacity
                style={styles.drawerOption}
                onPress={() => {
                  setShowDrawer(false);
                  Alert.alert(
                    'Two-Party Swap Initiated',
                    'Reciprocal single-day swap proposed to Ama Asante for next Wednesday. Status: Awaiting acceptance.',
                  );
                }}
              >
                <Text style={styles.drawerOptionIcon}>⇄</Text>
                <View style={styles.drawerOptionTextCol}>
                  <Text style={styles.drawerOptionTitle}>Propose Single-Day Swap</Text>
                  <Text style={styles.drawerOptionSub}>
                    Two-Party Handshake ensures 5 hosting days per member
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerOption}
                onPress={() => {
                  setShowDrawer(false);
                  Alert.alert(
                    'Release Seat to Ad-hoc Pool',
                    'Your seat has been released for Oct 20. Another verified corporate commuter can reserve it.',
                  );
                }}
              >
                <Text style={styles.drawerOptionIcon}>🚪</Text>
                <View style={styles.drawerOptionTextCol}>
                  <Text style={styles.drawerOptionTitle}>Release Seat to Ad-hoc Pool</Text>
                  <Text style={styles.drawerOptionSub}>
                    Temporarily surrender seat without defecting from club
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerOption}
                onPress={() => {
                  setShowDrawer(false);
                  setShowParityModal(true);
                }}
              >
                <Text style={styles.drawerOptionIcon}>⚖</Text>
                <View style={styles.drawerOptionTextCol}>
                  <Text style={styles.drawerOptionTitle}>Mixed-Fleet Cost Parity Proof</Text>
                  <Text style={styles.drawerOptionSub}>
                    Inspect 4-week cash neutrality and SVOC baseline caps
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerCloseButton}
                onPress={() => setShowDrawer(false)}
              >
                <Text style={styles.drawerCloseButtonText}>Close Drawer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Mixed-Fleet Cost Parity Disclosure Modal */}
        <ParityDisclosureModal
          visible={showParityModal}
          vehicleModel="Toyota Land Cruiser Prado 3.0L • Class C"
          vehicleEngineClass="Class C (> 2500cc)"
          vehicleSvocCeilingGhc="GH₵ 22.20"
          clubBaselineRateGhc="GH₵ 14.00"
          uncompensatedFuelDeltaGhc="-GH₵ 8.20"
          netRotationCashDeltaGhc="GH₵  0.00"
          onAccept={() => {
            setShowParityModal(false);
            Alert.alert(
              'Parity Cap Accepted',
              '4-Week Cost Parity Invariant locked. Your recovery during Hosting Week is capped at GH₵ 14.00 / seat.',
            );
          }}
          onDecline={() => setShowParityModal(false)}
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
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: FeScoSpacing.md,
    paddingVertical: FeScoSpacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: FeScoColors.slateBorder,
  },
  backButton: {
    paddingVertical: FeScoSpacing.xs,
  },
  backButtonText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    color: FeScoColors.indigo,
    fontWeight: '700',
  },
  navTitleGroup: {
    alignItems: 'center',
  },
  clubTitle: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.base,
    fontWeight: '800',
    color: FeScoColors.slateDark,
  },
  clubSubtitle: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slate,
  },
  parityProofButton: {
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: FeScoSpacing.xxs,
    backgroundColor: FeScoColors.indigoSubtle,
    borderRadius: FeScoRadii.pill,
    borderWidth: 1,
    borderColor: FeScoColors.indigo,
  },
  parityProofText: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.indigo,
    fontWeight: '700',
  },
  scrollContent: {
    padding: FeScoSpacing.md,
    paddingBottom: 100,
  },
  // Zone 1
  zone1Banner: {
    borderRadius: FeScoRadii.lg,
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zone1BannerHosting: {
    backgroundColor: FeScoColors.indigo,
  },
  zone1BannerCoCommuting: {
    backgroundColor: FeScoColors.slate,
  },
  zone1TextCol: {
    flex: 1,
    marginRight: FeScoSpacing.sm,
  },
  zone1Eyebrow: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: 10,
    color: '#93C5FD',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  zone1Heading: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.base,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  zone1StakePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: FeScoSpacing.xs,
    borderRadius: FeScoRadii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  zone1StakePillText: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Zone 2
  zone2CarouselContainer: {
    marginBottom: FeScoSpacing.md,
  },
  zone2Header: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.5,
    marginBottom: FeScoSpacing.xs,
  },
  zone2TabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: FeScoRadii.md,
    padding: 3,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
  },
  zone2Tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: FeScoRadii.sm,
    position: 'relative',
    paddingHorizontal: 2,
  },
  zone2TabActive: {
    backgroundColor: FeScoColors.indigoSubtle,
  },
  zone2TabText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slate,
    fontWeight: '600',
  },
  zone2TabTextActive: {
    color: FeScoColors.indigo,
    fontWeight: '800',
  },
  zone2ActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: FeScoColors.emerald,
    borderRadius: 1,
  },
  // Zone 3
  zone3Card: {
    backgroundColor: FeScoColors.indigoSubtle,
    borderWidth: 1.5,
    borderColor: FeScoColors.indigo,
    borderRadius: FeScoRadii.lg,
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.md,
  },
  zone3HeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FeScoSpacing.xs,
  },
  zone3Badge: {
    backgroundColor: FeScoColors.indigo,
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: 3,
    borderRadius: FeScoRadii.pill,
  },
  zone3BadgeText: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  zone3Title: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.base,
    fontWeight: '800',
    color: FeScoColors.indigoDark,
    marginBottom: FeScoSpacing.xxs,
  },
  zone3Body: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    lineHeight: 18,
    color: FeScoColors.slateDark,
    marginBottom: FeScoSpacing.md,
  },
  zone3ActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zone3AcceptBtn: {
    backgroundColor: FeScoColors.indigo,
    paddingHorizontal: FeScoSpacing.md,
    paddingVertical: FeScoSpacing.sm,
    borderRadius: FeScoRadii.md,
    marginRight: FeScoSpacing.md,
  },
  zone3AcceptBtnText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  zone3DismissBtn: {
    paddingVertical: FeScoSpacing.sm,
  },
  zone3DismissBtnText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    fontWeight: '600',
    color: FeScoColors.slate,
  },
  // Zone 4
  zone4Container: {
    marginBottom: FeScoSpacing.lg,
  },
  zone4HeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FeScoSpacing.xs,
  },
  zone4Title: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.5,
  },
  zone4Subtitle: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.emerald,
    fontWeight: '600',
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: FeScoRadii.md,
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.sm,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
  },
  dayCardAmberBorder: {
    borderLeftWidth: 4,
    borderLeftColor: FeScoColors.amber,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FeScoSpacing.sm,
  },
  dayCardDayCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dayCardDayName: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.base,
    fontWeight: '800',
    color: FeScoColors.slateDark,
    marginRight: FeScoSpacing.xs,
  },
  dayCardDateStr: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slate,
  },
  dayCardTimesPill: {
    backgroundColor: FeScoColors.background,
    paddingHorizontal: FeScoSpacing.sm,
    paddingVertical: 2,
    borderRadius: FeScoRadii.pill,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
  },
  dayCardTimesText: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slateDark,
    fontWeight: '700',
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FeScoSpacing.sm,
  },
  hostAvatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: FeScoColors.emerald,
    backgroundColor: FeScoColors.indigoSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: FeScoSpacing.sm,
  },
  hostAvatarInitial: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    fontWeight: '800',
    color: FeScoColors.indigo,
  },
  hostDetailsCol: {
    flex: 1,
  },
  hostNamePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  hostNameText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    fontWeight: '700',
    color: FeScoColors.slateDark,
  },
  swappedHostGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  originalHostStrikethrough: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    color: FeScoColors.slate,
    textDecorationLine: 'line-through',
  },
  swappedBadgePill: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: FeScoSpacing.xs,
    paddingVertical: 2,
    borderRadius: FeScoRadii.sm,
    marginLeft: FeScoSpacing.xs,
  },
  swappedBadgeText: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: 10,
    color: FeScoColors.indigo,
    fontWeight: '700',
  },
  hostSubText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slate,
    marginTop: 2,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: FeScoColors.slateBorder,
    paddingTop: FeScoSpacing.xs,
  },
  cocommutersGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cocommutersLabel: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slate,
    marginRight: FeScoSpacing.xs,
  },
  avatarsCluster: {
    flexDirection: 'row',
  },
  commuterAvatarPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: FeScoColors.background,
    borderWidth: 1,
    borderColor: FeScoColors.slateMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  commuterAvatarText: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: 9,
    fontWeight: '700',
    color: FeScoColors.slateDark,
  },
  reliefRebateChip: {
    backgroundColor: FeScoColors.emeraldSubtle,
    borderWidth: 1,
    borderColor: FeScoColors.emeraldBorder,
    paddingHorizontal: FeScoSpacing.xs,
    paddingVertical: 2,
    borderRadius: FeScoRadii.pill,
  },
  reliefRebateChipText: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: 10,
    color: FeScoColors.emerald,
    fontWeight: '700',
  },
  penaltyFreeActionBox: {
    marginTop: FeScoSpacing.xs,
    paddingTop: FeScoSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: FeScoColors.amberBorder,
    backgroundColor: FeScoColors.amberSubtle,
    padding: FeScoSpacing.xs,
    borderRadius: FeScoRadii.sm,
  },
  penaltyFreeNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FeScoSpacing.xxs,
  },
  amberWarningIcon: {
    fontSize: 12,
    color: FeScoColors.amber,
    marginRight: FeScoSpacing.xxs,
  },
  penaltyFreeNoticeText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: 10,
    color: '#92400E',
    flex: 1,
  },
  penaltyFreeButton: {
    paddingVertical: 4,
  },
  penaltyFreeButtonText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.amber,
    fontWeight: '700',
  },
  // Zone 5
  zone5BottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: FeScoColors.slateBorder,
    paddingHorizontal: FeScoSpacing.md,
    paddingTop: FeScoSpacing.sm,
    paddingBottom: FeScoSpacing.xl,
  },
  zone5DrawerBtn: {
    minHeight: 48,
    borderRadius: FeScoRadii.md,
    borderWidth: 1.5,
    borderColor: FeScoColors.indigo,
    backgroundColor: FeScoColors.indigoSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zone5DrawerBtnText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    fontWeight: '700',
    color: FeScoColors.indigo,
  },
  // Drawer
  drawerOverlay: {
    flex: 1,
    backgroundColor: FeScoColors.darkMask,
    justifyContent: 'flex-end',
  },
  drawerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: FeScoRadii.xl,
    borderTopRightRadius: FeScoRadii.xl,
    padding: FeScoSpacing.lg,
    paddingBottom: FeScoSpacing.giant,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: FeScoColors.slateMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: FeScoSpacing.md,
  },
  drawerTitle: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.lg,
    fontWeight: '800',
    color: FeScoColors.slateDark,
  },
  drawerSubtitle: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slate,
    marginBottom: FeScoSpacing.md,
  },
  drawerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FeScoSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: FeScoColors.slateBorder,
  },
  drawerOptionIcon: {
    fontSize: 20,
    color: FeScoColors.indigo,
    marginRight: FeScoSpacing.sm,
    width: 28,
    textAlign: 'center',
  },
  drawerOptionTextCol: {
    flex: 1,
  },
  drawerOptionTitle: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    fontWeight: '700',
    color: FeScoColors.slateDark,
  },
  drawerOptionSub: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.xs,
    color: FeScoColors.slate,
    marginTop: 2,
  },
  drawerCloseButton: {
    marginTop: FeScoSpacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: FeScoRadii.md,
    backgroundColor: FeScoColors.background,
  },
  drawerCloseButtonText: {
    fontFamily: FeScoTypography.fontFamilies.sans,
    fontSize: FeScoTypography.sizes.sm,
    color: FeScoColors.slateDark,
    fontWeight: '600',
  },
});
