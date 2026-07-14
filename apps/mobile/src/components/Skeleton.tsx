import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { radii, spacing, useTheme } from '@/theme';

export const Skeleton: React.FC<{ width?: number | `${number}%`; height?: number; style?: ViewStyle }> = ({
  width = '100%', height = 16, style,
}) => {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        { width, height, borderRadius: radii.sm, backgroundColor: colors.surfaceAlt },
        animated,
        style,
      ]}
    />
  );
};

/** Placeholder matching RestaurantCard's layout, shown while the feed loads. */
export const RestaurantCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <Skeleton height={160} style={{ borderRadius: radii.lg }} />
    <Skeleton width="60%" style={{ marginTop: spacing.md }} />
    <Skeleton width="40%" height={12} style={{ marginTop: spacing.sm }} />
  </View>
);

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.xl },
});
