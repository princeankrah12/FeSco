import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { FeScoColors, FeScoSpacing, FeScoRadii, FeScoElevation } from '../theme';

export interface PendingReviewProps {
  commuteId: string;
  counterpartyName: string;
  counterpartyRole: 'HOST' | 'COCOMMUTER';
  vehicleSummary: string;
  routeSummary: string;
  completedAt?: string;
}

export interface RatingModalProps {
  visible: boolean;
  reviewData: PendingReviewProps;
  onSubmit: (result: {
    commuteId: string;
    ratingStars: number;
    safetyTags: string[];
    feedbackComment?: string;
    isSafetyEscalation: boolean;
  }) => void;
  onDismissPolicyNotice?: () => void;
}

const EMERALD_TAGS = ['Punctual', 'Respectful', 'Smooth Driving', 'Clean Vehicle', 'Great Atmosphere'];
const AMBER_TAGS = ['Minor Delay', 'Bumpy Drive', 'AC Ineffective', 'Music Volume', 'Navigation Issue'];
const CRIMSON_TAGS = [
  'Unsafe Driving',
  'Aggressive Behavior',
  'Severe Delay',
  'Unauthorized Deviation',
  'Vehicle Defect',
];

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  reviewData,
  onSubmit,
  onDismissPolicyNotice,
}) => {
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState<string>('');

  // Star status classification
  const isEmerald = ratingStars >= 4;
  const isAmber = ratingStars === 3;
  const isCrimson = ratingStars <= 2;

  // Active tags selection by tier
  const currentAvailableTags = isEmerald
    ? EMERALD_TAGS
    : isAmber
    ? AMBER_TAGS
    : CRIMSON_TAGS;

  const handleStarSelect = (stars: number) => {
    setRatingStars(stars);
    // Clear tags when switching between positive, coaching, or escalation tiers
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Dynamic Validation Lock:
  // 4-5 Stars: Instantly active.
  // 1-3 Stars: Disabled until at least one mandatory quick-tag is selected.
  const isSubmitLocked = !isEmerald && selectedTags.length === 0;

  const handleSubmit = () => {
    if (isSubmitLocked) return;

    if (isCrimson) {
      Alert.alert(
        'Submit Safety Escalation?',
        'Your report will be forwarded directly to the Corporate Fleet Admin and Private Security Response team.',
        [
          { text: 'Review Edits', style: 'cancel' },
          {
            text: 'Submit Report',
            style: 'destructive',
            onPress: () => {
              onSubmit({
                commuteId: reviewData.commuteId,
                ratingStars,
                safetyTags: selectedTags,
                feedbackComment: feedbackComment.trim() || undefined,
                isSafetyEscalation: true,
              });
            },
          },
        ],
      );
      return;
    }

    onSubmit({
      commuteId: reviewData.commuteId,
      ratingStars,
      safetyTags: selectedTags,
      feedbackComment: feedbackComment.trim() || undefined,
      isSafetyEscalation: false,
    });
  };

  const getThemeColor = () => {
    if (isEmerald) return FeScoColors.emerald;
    if (isAmber) return FeScoColors.amber;
    return FeScoColors.crimson;
  };

  const getButtonText = () => {
    if (isEmerald) return 'Submit Rating';
    if (isAmber) return 'Submit Feedback';
    return 'Submit Safety Report';
  };

  const getPlaceholder = () => {
    if (isEmerald) return 'Optional: Leave a thank-you note or compliment...';
    if (isAmber) return 'Help us coach your co-commuter with specific feedback...';
    return 'Mandatory detail: Describe the safety or conduct concern for fleet review...';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onDismissPolicyNotice}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalCard, FeScoElevation.raised]}>
          {/* Header Policy Banner */}
          <View style={styles.policyBanner}>
            <Text style={styles.policyTag}>TWO-WAY SAFETY VERIFICATION</Text>
            <Text style={styles.policyTitle}>Rate Last Commute to Unlock</Text>
            <Text style={styles.policySubtitle}>
              Quick 5-second safety check required before your next commute.
            </Text>
          </View>

          {/* Commute Summary Card */}
          <View style={styles.commuteContextBox}>
            <View style={styles.contextRow}>
              <Text style={styles.contextRole}>
                {reviewData.counterpartyRole === 'HOST' ? 'HOST' : 'CO-COMMUTER'}
              </Text>
              <Text style={styles.contextName}>{reviewData.counterpartyName}</Text>
            </View>
            <Text style={styles.contextRoute}>{reviewData.routeSummary}</Text>
            <Text style={styles.contextVehicle}>{reviewData.vehicleSummary}</Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Interactive 5-Star Selector */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={`star-${star}`}
                  style={styles.starTouchArea}
                  onPress={() => handleStarSelect(star)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.starGlyph,
                      star <= ratingStars ? { color: getThemeColor() } : styles.starMuted,
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Star Rating Label & Description */}
            <View style={styles.ratingLabelContainer}>
              <Text style={[styles.ratingTierText, { color: getThemeColor() }]}>
                {isEmerald
                  ? `${ratingStars} Stars • Verified Safe Commute`
                  : isAmber
                  ? '3 Stars • Constructive Coaching'
                  : `${ratingStars} Star${ratingStars > 1 ? 's' : ''} • Safety Escalation`}
              </Text>
              {!isEmerald && (
                <Text style={styles.mandatoryHelperText}>
                  * Please select at least one tag below to submit
                </Text>
              )}
            </View>

            {/* Tag Grouping Grid (Inline flex-wrap layout with 8px gaps) */}
            <View style={styles.tagGrid}>
              {currentAvailableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagPill,
                      isSelected && {
                        backgroundColor: isEmerald
                          ? FeScoColors.emeraldSubtle
                          : isAmber
                          ? FeScoColors.amberSubtle
                          : FeScoColors.crimsonSubtle,
                        borderColor: getThemeColor(),
                      },
                    ]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.tagPillText,
                        isSelected && { color: getThemeColor(), fontWeight: '700' },
                      ]}
                    >
                      {isSelected ? `✓ ${tag}` : tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Feedback Comment Input */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.commentInput}
                multiline={true}
                numberOfLines={3}
                placeholder={getPlaceholder()}
                placeholderTextColor={FeScoColors.slateLight}
                value={feedbackComment}
                onChangeText={setFeedbackComment}
                maxLength={400}
              />
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: isSubmitLocked ? FeScoColors.slate : getThemeColor() },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitLocked}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitLocked ? 'Select a Tag to Continue' : getButtonText()}
              </Text>
            </TouchableOpacity>

            {/* Subtext info */}
            <Text style={styles.footerNotice}>
              FeSCo is strictly not-for-profit. Reviews protect all corporate participants.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: FeScoSpacing.md,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: FeScoRadii.xl,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  policyBanner: {
    backgroundColor: '#0F172A',
    padding: FeScoSpacing.md,
  },
  policyTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  policySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  commuteContextBox: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: FeScoSpacing.md,
    paddingVertical: FeScoSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextRole: {
    fontSize: 10,
    fontWeight: '700',
    color: FeScoColors.slate,
    letterSpacing: 0.6,
  },
  contextName: {
    fontSize: 14,
    fontWeight: '700',
    color: FeScoColors.slateDark,
  },
  contextRoute: {
    fontSize: 13,
    color: FeScoColors.indigo,
    fontWeight: '600',
    marginTop: 2,
  },
  contextVehicle: {
    fontSize: 11,
    color: FeScoColors.slate,
    marginTop: 1,
  },
  scrollBody: {
    padding: FeScoSpacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: FeScoSpacing.xs,
  },
  starTouchArea: {
    padding: 8,
  },
  starGlyph: {
    fontSize: 38,
  },
  starMuted: {
    color: '#CBD5E1',
  },
  ratingLabelContainer: {
    alignItems: 'center',
    marginBottom: FeScoSpacing.sm,
  },
  ratingTierText: {
    fontSize: 14,
    fontWeight: '700',
  },
  mandatoryHelperText: {
    fontSize: 11,
    color: FeScoColors.crimson,
    marginTop: 2,
    fontWeight: '600',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // 8px inline spacing
    justifyContent: 'center',
    marginVertical: FeScoSpacing.sm,
  },
  tagPill: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: FeScoRadii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagPillText: {
    fontSize: 12,
    color: FeScoColors.slateDark,
    fontWeight: '500',
  },
  inputWrapper: {
    marginTop: FeScoSpacing.xs,
    marginBottom: FeScoSpacing.md,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: FeScoRadii.md,
    backgroundColor: '#F8FAFC',
    padding: FeScoSpacing.sm,
    fontSize: 13,
    color: FeScoColors.slateDark,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: FeScoRadii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNotice: {
    fontSize: 10,
    color: FeScoColors.slate,
    textAlign: 'center',
    marginTop: 10,
  },
});
