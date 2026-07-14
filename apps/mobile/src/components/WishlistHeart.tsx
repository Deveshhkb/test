import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useAuthStore } from '@/store/authStore';
import { useToggleWishlist } from '@/api/hooks';

export const WishlistHeart: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const wishlisted = useAuthStore((s) => s.user?.wishlist?.includes(restaurantId) ?? false);
  const toggle = useToggleWishlist();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      accessibilityState={{ selected: wishlisted }}
      hitSlop={12}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        scale.value = withSequence(withSpring(1.35, { damping: 8 }), withSpring(1));
        toggle.mutate(restaurantId);
      }}
      style={styles.wrap}
    >
      <Animated.View style={animated}>
        <Text style={styles.icon}>{wishlisted ? '♥' : '♡'}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { color: '#FF7A4D', fontSize: 18, lineHeight: 20 },
});
