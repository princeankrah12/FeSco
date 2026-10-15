import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FeScoColors, FeScoTypography, FeScoSpacing } from '../theme';

export interface PilotTelemetryBarProps {
  sseStatus?: 'LIVE' | 'CONNECTING' | 'OFFLINE';
  gpsAccuracyMeters?: number;
  bleStatus?: string;
  mmkvQueueCount?: number;
  forceShow?: boolean;
}

/**
 * Pilot Telemetry Bar
 *
 * Discrete 1-line diagnostics bar for road pilot testing along the Ablekuma-Osu corridor.
 * Gated behind EXPO_PUBLIC_PILOT_DIAGNOSTICS=true.
 * Provides immediate in-cabin visibility of SSE connectivity, GPS precision,
 * BLE RSSI handshakes, and offline MMKV queue states without Xcode/Logcat tethering.
 */
export const PilotTelemetryBar: React.FC<PilotTelemetryBarProps> = ({
  sseStatus = 'LIVE',
  gpsAccuracyMeters = 6,
  bleStatus = '-58dBm ACK',
  mmkvQueueCount = 0,
  forceShow = false,
}) => {
  const isEnabled = forceShow || process.env.EXPO_PUBLIC_PILOT_DIAGNOSTICS === 'true';

  if (!isEnabled) {
    return null;
  }

  const sseColor =
    sseStatus === 'LIVE'
      ? FeScoColors.emerald
      : sseStatus === 'CONNECTING'
      ? FeScoColors.amber
      : FeScoColors.crimson;

  const mmkvColor = mmkvQueueCount > 0 ? FeScoColors.amber : FeScoColors.slate;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.pillSurface}>
        <Text
          style={styles.telemetryText}
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          [SSE: <Text style={{ color: sseColor, fontWeight: '700' }}>{sseStatus}</Text>] • [GPS: ±{gpsAccuracyMeters}m] • [BLE: <Text style={styles.bleValue}>{bleStatus}</Text>] • [MMKV Q: <Text style={{ color: mmkvColor, fontWeight: '700' }}>{mmkvQueueCount}</Text>]
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: FeScoColors.slateBorder,
    paddingVertical: 3,
    paddingHorizontal: FeScoSpacing.xs,
    zIndex: 9999,
  },
  pillSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryText: {
    fontFamily: FeScoTypography.fontFamilies.mono,
    fontSize: 10,
    color: FeScoColors.slate,
    letterSpacing: 0.2,
  },
  bleValue: {
    color: FeScoColors.indigo,
    fontWeight: '700',
  },
});
