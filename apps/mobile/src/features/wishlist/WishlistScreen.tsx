import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useWishlist } from '@/api/hooks';
import { spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';

export const WishlistScreen: React.FC<RootScreenProps<'Wishlist'>> = ({ navigation }) => {
  const { colors } = useTheme();
  const wishlist = useWishlist();

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[typography.title, { color: colors.text }]}>‹</Text>
        </Pressable>
        <Text style={[typography.title, { color: colors.text }]}>♥ {t('profile.wishlist')}</Text>
      </View>
      <FlatList
        data={wishlist.data ?? []}
        keyExtractor={(r) => r._id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={(id) => navigation.navigate('Restaurant', { id })}
          />
        )}
        ListEmptyComponent={
          wishlist.isLoading ? (
            <View>{Array.from({ length: 2 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}</View>
          ) : (
            <EmptyState
              emoji="💔"
              title="Nothing saved yet"
              subtitle="Tap the heart on any restaurant to keep it here."
            />
          )
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  list: { flexGrow: 1, paddingBottom: spacing.xl },
});
