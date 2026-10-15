import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';

export interface PermissionRecoveryViewProps {
  permissionType: 'Camera' | 'Location' | 'Bluetooth';
  purposeDescription: string;
  onRetry: () => void;
  onBack?: () => void;
}

export const PermissionRecoveryView: React.FC<PermissionRecoveryViewProps> = ({
  permissionType,
  purposeDescription,
  onRetry,
  onBack,
}) => {
  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      // Fallback
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, FeScoElevation.raised]}>
        {/* Warning Icon Badge */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>📷</Text>
        </View>

        <Text style={styles.title}>{permissionType} Access Required</Text>
        <Text style={styles.description}>{purposeDescription}</Text>

        <View style={styles.instructionBox}>
          <Text style={styles.instructionStep}>1. Tap &quot;Open OS Settings&quot; below</Text>
          <Text style={styles.instructionStep}>2. Toggle &quot;{permissionType}&quot; to Enabled</Text>
          <Text style={styles.instructionStep}>3. Return to FeSCo to resume verification</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleOpenSettings} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Open Device OS Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>I&apos;ve Enabled It — Check Again</Text>
        </TouchableOpacity>

        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>Return to Previous Step</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FeScoColors.background,
    justifyContent: 'center',
    padding: FeScoSpacing.lg,
  },
  card: {
    backgroundColor: FeScoColors.card,
    borderRadius: FeScoRadii.xl,
    padding: FeScoSpacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: FeScoColors.amberSubtle,
    borderWidth: 1,
    borderColor: FeScoColors.amberBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: FeScoSpacing.md,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: FeScoColors.slateDark,
    textAlign: 'center',
    marginBottom: FeScoSpacing.xs,
  },
  description: {
    fontSize: 14,
    color: FeScoColors.slate,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: FeScoSpacing.md,
  },
  instructionBox: {
    width: '100%',
    backgroundColor: FeScoColors.background,
    borderRadius: FeScoRadii.md,
    padding: FeScoSpacing.md,
    marginBottom: FeScoSpacing.lg,
    borderWidth: 1,
    borderColor: FeScoColors.slateBorder,
  },
  instructionStep: {
    fontSize: 13,
    color: FeScoColors.slateDark,
    fontWeight: '500',
    marginVertical: 3,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: FeScoColors.indigo,
    borderRadius: FeScoRadii.md,
    paddingVertical: FeScoSpacing.sm + 2,
    alignItems: 'center',
    marginBottom: FeScoSpacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: FeScoColors.emeraldSubtle,
    borderWidth: 1,
    borderColor: FeScoColors.emeraldBorder,
    borderRadius: FeScoRadii.md,
    paddingVertical: FeScoSpacing.sm,
    alignItems: 'center',
    marginBottom: FeScoSpacing.xs,
  },
  secondaryButtonText: {
    color: FeScoColors.emerald,
    fontSize: 14,
    fontWeight: '700',
  },
  backButton: {
    marginTop: FeScoSpacing.xs,
    paddingVertical: FeScoSpacing.xs,
  },
  backButtonText: {
    color: FeScoColors.slate,
    fontSize: 13,
    fontWeight: '500',
  },
});
