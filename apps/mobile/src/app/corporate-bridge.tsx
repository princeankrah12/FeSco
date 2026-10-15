import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';

const HOME_NEIGHBORHOODS = [
  'Ablekuma (Fan Milk / Curve)',
  'Dansoman (Keep Fit)',
  'Pokuase / ACP Estate',
  'Spintex / Coastal',
  'Weija / West Hills',
  'Tema (Community 25)',
];

const CORPORATE_OFFICES = [
  'Osu (Oxford Street Hub)',
  'Airport City (Stanbic Heights / Marina Mall)',
  'Ridge (MTN House / Financial District)',
  'High Street (GCB Head Office / Ministries)',
];

export default function CorporateBridgeScreen() {
  const router = useRouter();

  const [selectedHome, setSelectedHome] = useState(HOME_NEIGHBORHOODS[0]);
  const [selectedOffice, setSelectedOffice] = useState(CORPORATE_OFFICES[0]);

  const handleCompleteBridge = () => {
    router.replace('/dashboard' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>ROUTE ONBOARDING</Text>
          <Text style={styles.title}>Commute Route Pins</Text>
          <Text style={styles.subtitle}>
            Connect your daily corporate commute corridor to join your employer’s Carpool Club.
          </Text>
        </View>

        {/* Section 1: Home Neighborhood */}
        <View style={[styles.card, FeScoElevation.raised]}>
          <Text style={styles.sectionTitle}>1. HOME RESIDENTIAL PIN</Text>
          <Text style={styles.sectionHelp}>Where do you begin your morning commute?</Text>

          <View style={styles.optionsList}>
            {HOME_NEIGHBORHOODS.map((neighborhood) => {
              const isSelected = selectedHome === neighborhood;
              return (
                <TouchableOpacity
                  key={neighborhood}
                  style={[styles.optionRow, isSelected ? styles.optionRowSelected : null]}
                  onPress={() => setSelectedHome(neighborhood)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, isSelected ? styles.radioSelected : null]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                    {neighborhood}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Corporate Office Pin */}
        <View style={[styles.card, FeScoElevation.raised]}>
          <Text style={styles.sectionTitle}>2. CORPORATE DESTINATION PIN</Text>
          <Text style={styles.sectionHelp}>Select your primary corporate office location:</Text>

          <View style={styles.optionsList}>
            {CORPORATE_OFFICES.map((office) => {
              const isSelected = selectedOffice === office;
              return (
                <TouchableOpacity
                  key={office}
                  style={[styles.optionRow, isSelected ? styles.optionRowSelected : null]}
                  onPress={() => setSelectedOffice(office)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, isSelected ? styles.radioSelected : null]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                    {office}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteBridge}
          activeOpacity={0.85}
        >
          <Text style={styles.completeButtonText}>Reveal Matched Carpool Club</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: FeScoColors.background,
  },
  container: {
    padding: FeScoSpacing.lg,
  },
  header: {
    marginBottom: FeScoSpacing.md,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: FeScoColors.indigo,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: FeScoColors.slateDark,
  },
  subtitle: {
    fontSize: 14,
    color: FeScoColors.slate,
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    backgroundColor: FeScoColors.card,
    borderRadius: FeScoRadii.xl,
    padding: FeScoSpacing.md,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
    marginBottom: FeScoSpacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sectionHelp: {
    fontSize: 13,
    color: FeScoColors.slateDark,
    marginBottom: FeScoSpacing.sm,
    fontWeight: '500',
  },
  optionsList: {
    gap: FeScoSpacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: FeScoSpacing.sm,
    borderRadius: FeScoRadii.md,
    backgroundColor: FeScoColors.background,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
  },
  optionRowSelected: {
    borderColor: FeScoColors.indigo,
    backgroundColor: FeScoColors.indigoSubtle,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: FeScoColors.slateLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FeScoSpacing.sm,
  },
  radioSelected: {
    borderColor: FeScoColors.indigo,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: FeScoColors.indigo,
  },
  optionText: {
    fontSize: 14,
    color: FeScoColors.slateDark,
    fontWeight: '500',
    flex: 1,
  },
  optionTextSelected: {
    color: FeScoColors.indigoDark,
    fontWeight: '700',
  },
  completeButton: {
    backgroundColor: FeScoColors.indigo,
    borderRadius: FeScoRadii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: FeScoSpacing.md,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
