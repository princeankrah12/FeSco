import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  sanitizeChassisVin,
  formatChassisVin,
  validateChassisVin,
} from '@fesco/domain';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoTypography } from '../theme';

interface VinInputProps {
  value: string;
  onChangeText: (rawVin: string) => void;
  label?: string;
  editable?: boolean;
}

export const VinInput: React.FC<VinInputProps> = ({
  value,
  onChangeText,
  label = 'CHASSIS NUMBER (VIN)',
  editable = true,
}) => {
  const sanitized = sanitizeChassisVin(value);
  const formatted = formatChassisVin(sanitized);
  const validation = validateChassisVin(sanitized);

  const handleChange = (text: string) => {
    // Sanitize immediately as user types
    const clean = sanitizeChassisVin(text).slice(0, 17);
    onChangeText(clean);
  };

  const isComplete = sanitized.length === 17;
  const isValid = validation.isValid;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.charCounter}>{sanitized.length} / 17</Text>
      </View>

      <View
        style={[
          styles.inputContainer,
          isComplete && isValid && styles.inputSuccess,
          isComplete && !isValid && styles.inputError,
        ]}
      >
        <TextInput
          style={styles.textInput}
          value={formatted}
          onChangeText={handleChange}
          placeholder="XXXX - XXXX - XXXX - XXXXX"
          placeholderTextColor="#64748B"
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          editable={editable}
          maxLength={29} // 17 chars + 3 * " - " (12 chars) = 29 chars
        />
        {isComplete && (
          <View style={[styles.statusBadge, isValid ? styles.badgeSuccess : styles.badgeError]}>
            <Text style={styles.badgeText}>{isValid ? '✓ ISO 3779' : '✕ INVALID'}</Text>
          </View>
        )}
      </View>

      {/* Helper / Error Feedback */}
      {sanitized.length > 0 && !isValid && (
        <Text style={styles.errorText}>
          {validation.error ?? 'ISO 3779 requires exactly 17 characters (excluding I, O, Q).'}
        </Text>
      )}
      {sanitized.length === 0 && (
        <Text style={styles.helperText}>
          Letters I, O, and Q are automatically mapped to numerals 1 and 0 per ISO 3779.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: FeScoSpacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FeScoSpacing.xxs,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  charCounter: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: '#64748B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: FeScoRadii.md,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: FeScoSpacing.sm,
    height: 52,
  },
  inputSuccess: {
    borderColor: FeScoColors.emerald,
  },
  inputError: {
    borderColor: FeScoColors.crimson,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    letterSpacing: 1.2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: FeScoRadii.pill,
    marginLeft: 8,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: FeScoColors.crimson,
    marginTop: 4,
  },
});
