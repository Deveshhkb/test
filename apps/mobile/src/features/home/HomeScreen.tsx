import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Screen } from '@/components/Screen';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantCardSkeleton, Skeleton } from '@/components/Skeleton';
import { useCategories, useRecommendations, useRestaurants } from '@/api/hooks';
import { useAuthStore } from '@/store/authStore';
import { radii, spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import type { Restaurant } from '@/api/types';
import type { TabScreenProps } from '@/navigation/types';

export const HomeScreen: React.FC<TabScreenProps<'Home'>> = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getLastKnownPositionAsync() ?? await Location.getCurrentPositionAsync({});
      if (pos) setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  const categories = useCategories();
  const recommendations = useRecommendations();
  const feed = useRestaurants({ ...coords });

  const restaurants = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

  const openRestaurant = useCallback(
    (id: string) => navigation.navigate('Restaurant', { id }),
    [navigation],
  );

  const Header = (
    <View>
      {/* Address + greeting */}
      <View style={styles.topBar}>
        <View style={styles.flex}>
          <Text style={[typography.micro, { color: colors.primary }]}>
            {t('home.deliverTo').toUpperCase()}
          </Text>
          <Text numberOfLines={1} style={[typography.bodyBold, { color: colors.text }]}>
            {defaultAddress ? `${defaultAddress.label} · ${defaultAddress.line1}` : 'Set your location'}
          </Text>
        </View>
      </View>

      {/* Search entry */}
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={t('home.searchHint')}
        onPress={() => navigation.navigate('Search')}
        style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[typography.body, { color: colors.textMuted }]}>⌕ {t('home.searchHint')}</Text>
      </Pressable>

      {/* Category rail */}
      <Text style={[typography.heading, styles.sectionTitle, { color: colors.text }]}>
        {t('home.categories')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {categories.isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width={64} height={88} style={{ borderRadius: radii.md }} />
            ))
          : categories.data?.map((cat) => (
              <Pressable
                key={cat._id}
                accessibilityRole="button"
                accessibilityLabel={`Browse ${cat.name}`}
                onPress={() => navigation.navigate('Search', { category: cat.slug })}
                style={styles.categoryChip}
              >
                <Image source={cat.imageUrl} style={styles.categoryImage} cachePolicy="memory-disk" />
                <Text style={[typography.caption, { color: colors.text }]}>{cat.name}</Text>
              </Pressable>
            ))}
      </ScrollView>

      {/* AI recommendations rail */}
      {recommendations.data && recommendations.data.length > 0 ? (
        <>
          <Text style={[typography.heading, styles.sectionTitle, { color: colors.text }]}>
            ✦ {t('home.forYou')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {recommendations.data.map((r: Restaurant) => (
              <Pressable
                key={r._id}
                accessibilityRole="button"
                accessibilityLabel={`${r.name}. ${r._reason ?? ''}`}
                onPress={() => openRestaurant(r._id)}
                style={[styles.recoCard, { backgroundColor: colors.surface }]}
              >
                <Image source={r.coverImageUrl} style={styles.recoImage} cachePolicy="memory-disk" />
                <View style={styles.recoBody}>
                  <Text numberOfLines={1} style={[typography.bodyBold, { color: colors.text }]}>
                    {r.name}
                  </Text>
                  <Text numberOfLines={1} style={[typography.micro, { color: colors.mint }]}>
                    {r._reason}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text style={[typography.heading, styles.sectionTitle, { color: colors.text }]}>
        {t('home.allRestaurants')}
      </Text>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <RestaurantCard restaurant={item} onPress={openRestaurant} />}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          feed.isLoading ? (
            <View>
              {Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => feed.refetch()}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
        onEndReachedThreshold={0.4}
        // FlatList perf: fixed-height cards let us window aggressively.
        removeClippedSubviews
        maxToRenderPerBatch={6}
        windowSize={7}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md },
  rail: { paddingHorizontal: spacing.lg, gap: spacing.md },
  categoryChip: { alignItems: 'center', gap: spacing.xs, width: 68 },
  categoryImage: { width: 60, height: 60, borderRadius: radii.full },
  recoCard: { width: 200, borderRadius: radii.md, overflow: 'hidden' },
  recoImage: { width: '100%', height: 100 },
  recoBody: { padding: spacing.sm },
});
