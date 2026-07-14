import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useRestaurants, RestaurantFilters } from '@/api/hooks';
import { radii, spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import type { TabScreenProps } from '@/navigation/types';

const SORTS: { key: NonNullable<RestaurantFilters['sort']>; label: string }[] = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'rating', label: 'Top rated' },
  { key: 'delivery_time', label: 'Fastest' },
  { key: 'price_low', label: '₹ Low → High' },
  { key: 'price_high', label: '₹ High → Low' },
];

const useDebounced = (value: string, ms = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
};

export const SearchScreen: React.FC<TabScreenProps<'Search'>> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | undefined>();
  const [fastOnly, setFastOnly] = useState(false);
  const [sort, setSort] = useState<RestaurantFilters['sort']>('relevance');
  const debouncedQuery = useDebounced(query);

  const filters = useMemo<RestaurantFilters>(
    () => ({
      search: debouncedQuery || undefined,
      category: route.params?.category,
      vegOnly: vegOnly || undefined,
      minRating,
      maxDeliveryTime: fastOnly ? 30 : undefined,
      sort,
    }),
    [debouncedQuery, route.params?.category, vegOnly, minRating, fastOnly, sort],
  );

  const feed = useRestaurants(filters);
  const restaurants = feed.data?.pages.flatMap((p) => p.items) ?? [];

  const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
    label, active, onPress,
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[typography.caption, { color: active ? colors.onPrimary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Screen>
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('home.searchHint')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('common.search')}
          autoCorrect={false}
          returnKeyType="search"
          style={[
            styles.searchInput,
            typography.body,
            { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
          ]}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        <Chip label="🌱 Veg only" active={vegOnly} onPress={() => setVegOnly((v) => !v)} />
        <Chip
          label="★ 4.0+"
          active={minRating === 4}
          onPress={() => setMinRating((r) => (r === 4 ? undefined : 4))}
        />
        <Chip label="⚡ Under 30 min" active={fastOnly} onPress={() => setFastOnly((v) => !v)} />
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />
        ))}
      </ScrollView>

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={(id) => navigation.navigate('Restaurant', { id })}
          />
        )}
        ListEmptyComponent={
          feed.isLoading ? (
            <View>{Array.from({ length: 3 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}</View>
          ) : (
            <EmptyState
              emoji="🔍"
              title="No matches found"
              subtitle="Try a different dish, restaurant, or fewer filters."
            />
          )
        }
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
        onEndReachedThreshold={0.4}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchInput: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  chipsScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  chip: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  list: { flexGrow: 1, paddingBottom: spacing.xl },
});
