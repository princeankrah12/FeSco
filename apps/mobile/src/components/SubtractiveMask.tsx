import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { FeScoColors, FeScoSpacing, FeScoRadii } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Document punch-out dimensions (ID-1 Ghana Card aspect ratio ~85.6mm x 53.98mm)
const DOC_WIDTH = SCREEN_WIDTH * 0.88;
const DOC_HEIGHT = DOC_WIDTH * 0.63;

// Liveness circular punch-out diameter
const FACE_DIAMETER = SCREEN_WIDTH * 0.72;

export interface SubtractiveMaskProps {
  mode: 'document' | 'liveness';
  status: 'aligning' | 'detected' | 'blinking' | 'success' | 'failed';
  title: string;
  instruction: string;
  blinkCount?: number;
  onManualCapture?: () => void;
  onFlipCamera?: () => void;
  onClose?: () => void;
}

export const SubtractiveMask: React.FC<SubtractiveMaskProps> = ({
  mode,
  status,
  title,
  instruction,
  blinkCount = 0,
  onManualCapture,
  onFlipCamera,
  onClose,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringScaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Pulse animation while aligning
    if (status === 'aligning' || status === 'detected') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [status, pulseAnim]);

  useEffect(() => {
    if (status === 'success') {
      Animated.spring(ringScaleAnim, {
        toValue: 1.05,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }
  }, [status, ringScaleAnim]);

  const isSuccess = status === 'success';
  const isLiveness = mode === 'liveness';

  const ringBorderColor = isSuccess
    ? FeScoColors.emerald
    : status === 'detected' || status === 'blinking'
    ? FeScoColors.emerald
    : FeScoColors.amber;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 70% Dark Mask surrounding the transparent punch-out */}
      <View style={styles.topMask}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          {onFlipCamera ? (
            <TouchableOpacity onPress={onFlipCamera} style={styles.flipButton}>
              <Text style={styles.flipButtonText}>⟲</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      <View style={styles.centerRow}>
        <View style={styles.sideMask} />

        {/* The Transparent Punch-out Viewport */}
        <Animated.View
          style={[
            isLiveness ? styles.circularPunchout : styles.rectangularPunchout,
            {
              borderColor: ringBorderColor,
              transform: [{ scale: isSuccess ? ringScaleAnim : pulseAnim }],
            },
          ]}
        >
          {/* Visual alignment corner brackets for document */}
          {!isLiveness && (
            <>
              <View style={[styles.cornerBracket, styles.bracketTL, { borderColor: ringBorderColor }]} />
              <View style={[styles.cornerBracket, styles.bracketTR, { borderColor: ringBorderColor }]} />
              <View style={[styles.cornerBracket, styles.bracketBL, { borderColor: ringBorderColor }]} />
              <View style={[styles.cornerBracket, styles.bracketBR, { borderColor: ringBorderColor }]} />
            </>
          )}

          {/* Liveness Blink Progress Indicator */}
          {isLiveness && (
            <View style={styles.livenessStatusCenter}>
              {status === 'blinking' && (
                <View style={styles.blinkPromptBox}>
                  <Text style={styles.blinkPromptText}>Blink Now</Text>
                  <Text style={styles.blinkCountMono}>{blinkCount}/1</Text>
                </View>
              )}
              {isSuccess && (
                <View style={styles.successPill}>
                  <Text style={styles.successPillText}>✓ Verified</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        <View style={styles.sideMask} />
      </View>

      {/* Bottom Mask with Instruction & Controls */}
      <View style={styles.bottomMask}>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>{instruction}</Text>
          <Text style={styles.complianceNotice}>
            FeSCo Trust Engine • Ghana NIA Cryptographic Verification
          </Text>
        </View>

        {onManualCapture && (
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                { borderColor: isSuccess ? FeScoColors.emerald : FeScoColors.indigo },
              ]}
              onPress={onManualCapture}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.captureInnerCircle,
                  { backgroundColor: isSuccess ? FeScoColors.emerald : FeScoColors.indigo },
                ]}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    justifyContent: 'space-between',
  },
  topMask: {
    flex: 1,
    backgroundColor: FeScoColors.darkMask,
    justifyContent: 'flex-start',
    paddingTop: Platform.select({ ios: 60, android: 40 }),
    paddingHorizontal: FeScoSpacing.md,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideMask: {
    flex: 1,
    height: DOC_HEIGHT,
    backgroundColor: FeScoColors.darkMask,
  },
  rectangularPunchout: {
    width: DOC_WIDTH,
    height: DOC_HEIGHT,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: FeScoRadii.md,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  circularPunchout: {
    width: FACE_DIAMETER,
    height: FACE_DIAMETER,
    borderWidth: 3,
    borderRadius: FACE_DIAMETER / 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3,
  },
  bracketTL: {
    top: 4,
    left: 4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  bracketTR: {
    top: 4,
    right: 4,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bracketBL: {
    bottom: 4,
    left: 4,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bracketBR: {
    bottom: 4,
    right: 4,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  livenessStatusCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blinkPromptBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: FeScoSpacing.md,
    paddingVertical: FeScoSpacing.xs,
    borderRadius: FeScoRadii.pill,
    alignItems: 'center',
  },
  blinkPromptText: {
    color: FeScoColors.emerald,
    fontSize: 16,
    fontWeight: '700',
  },
  blinkCountMono: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'SF Mono', android: 'monospace' }),
    marginTop: 2,
  },
  successPill: {
    backgroundColor: FeScoColors.emerald,
    paddingHorizontal: FeScoSpacing.lg,
    paddingVertical: FeScoSpacing.sm,
    borderRadius: FeScoRadii.pill,
  },
  successPillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomMask: {
    flex: 1.4,
    backgroundColor: FeScoColors.darkMask,
    justifyContent: 'space-between',
    paddingBottom: Platform.select({ ios: 48, android: 24 }),
    paddingHorizontal: FeScoSpacing.lg,
    alignItems: 'center',
  },
  instructionContainer: {
    alignItems: 'center',
    marginTop: FeScoSpacing.md,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  complianceNotice: {
    color: FeScoColors.slateMuted,
    fontSize: 11,
    marginTop: FeScoSpacing.xs,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  captureInnerCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
});
