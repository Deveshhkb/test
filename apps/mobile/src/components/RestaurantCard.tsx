import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { Restaurant } from '@/api/types';
import { radii, shadow, spacing, typography, useTheme } from '@/theme';
import { RatingPill } from './RatingPill';
import { WishlistHeart } from './WishlistHeart';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface Props {
  restaurant: Restaurant;
  onPress: (id: string) => void;
}

/** Feed card: cached cover image, gradient scrim, rating pill, wishlist heart. */
export const RestaurantCard = memo<Props>(({ restaurant, onPress }) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${restaurant.name}, rated ${restaurant.rating.toFixed(1)} stars, delivery in ${restaurant.deliveryTimeMins} minutes`}
      onPress={() => onPress(restaurant._id)}
      style={({ pressed }) => [
        styles.card,
        shadow.card,
        { backgroundColor: colors.surface, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View>
        <Image
          source={restaurant.coverImageUrl}
          placeholder={{ blurhash }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          style={styles.cover}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.scrim}
        />
        <View style={styles.heart}>
          <WishlistHeart restaurantId={restaurant._id} />
        </View>
        <Text style={[typography.caption, styles.etaBadge]}>
          {restaurant.deliveryTimeMins} min
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[typography.heading, { color: colors.text, flex: 1 }]}>
            {restaurant.name}
          </Text>
          <RatingPill rating={restaurant.rating} />
        </View>
        <Text numberOfLines={1} style={[typography.caption, { color: colors.textMuted }]}>
          {restaurant.cuisines.join(' · ')} · ₹{restaurant.priceForTwo} for two
        </Text>
        {restaurant._reason ? (
          <Text style={[typography.micro, { color: colors.mint, marginTop: spacing.xs }]}>
            ✦ {restaurant._reason}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});
RestaurantCard.displayName = 'RestaurantCard';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 168 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 64 },
  heart: { position: 'absolute', top: spacing.md, right: spacing.md },
  etaBadge: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    color: '#fff',
    fontWeight: '700',
  },
  body: { padding: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
});
