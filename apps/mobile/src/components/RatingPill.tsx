import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radii, typography, useTheme } from '@/theme';

export const RatingPill: React.FC<{ rating: number }> = ({ rating }) => {
  const { colors } = useTheme();
  const bg = rating >= 4 ? colors.success : rating >= 3 ? colors.gold : colors.danger;
  return (
    <View
      accessibilityLabel={`Rating ${rating.toFixed(1)} out of 5`}
      style={[styles.pill, { backgroundColor: bg }]}
    >
      <Text style={[typography.micro, styles.text]}>★ {rating.toFixed(1)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: { borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 3 },
  text: { color: '#fff' },
});
