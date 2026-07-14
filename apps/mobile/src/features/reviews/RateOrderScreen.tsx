import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useSubmitReview } from '@/api/hooks';
import { getErrorMessage } from '@/api/client';
import { radii, spacing, typography, useTheme } from '@/theme';
import type { RootScreenProps } from '@/navigation/types';

const Stars: React.FC<{ value: number; onChange: (v: number) => void; label: string }> = ({
  value, onChange, label,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.starsBlock}>
      <Text style={[typography.body, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.starsRow} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${value} of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(star);
            }}
          >
            <Text style={[styles.star, { color: star <= value ? colors.gold : colors.border }]}>
              ★
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export const RateOrderScreen: React.FC<RootScreenProps<'RateOrder'>> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { orderId, restaurantName } = route.params;
  const [rating, setRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const submit = useSubmitReview();

  const send = async () => {
    if (rating === 0) {
      Alert.alert('Savora', 'Please pick an overall rating.');
      return;
    }
    try {
      await submit.mutateAsync({
        orderId,
        rating,
        foodRating: foodRating || undefined,
        deliveryRating: deliveryRating || undefined,
        comment: comment.trim() || undefined,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Savora', getErrorMessage(err));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={[typography.title, { color: colors.text }]}>How was {restaurantName}?</Text>

        <Stars label="Overall" value={rating} onChange={setRating} />
        <Stars label="Food" value={foodRating} onChange={setFoodRating} />
        <Stars label="Delivery" value={deliveryRating} onChange={setDeliveryRating} />

        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Tell us more (optional)"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          accessibilityLabel="Review comment"
          style={[
            styles.comment,
            typography.body,
            { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
          ]}
        />

        <Button title="Submit review" onPress={send} loading={submit.isPending} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  starsBlock: { gap: spacing.xs },
  starsRow: { flexDirection: 'row', gap: spacing.sm },
  star: { fontSize: 34 },
  comment: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    textAlignVertical: 'top',
  },
});
