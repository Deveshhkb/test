import React, { useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Screen } from '@/components/Screen';
import { RatingPill } from '@/components/RatingPill';
import { VegBadge } from '@/components/VegBadge';
import { WishlistHeart } from '@/components/WishlistHeart';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/Button';
import { useMenu, useRestaurant } from '@/api/hooks';
import { useCartStore, useCartTotals } from '@/store/cartStore';
import { radii, shadow, spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import type { MenuItem } from '@/api/types';
import type { RootScreenProps } from '@/navigation/types';
import { CustomizeSheet } from './CustomizeSheet';

export const RestaurantScreen: React.FC<RootScreenProps<'Restaurant'>> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { id } = route.params;
  const restaurant = useRestaurant(id);
  const menu = useMenu(id);
  const [customizing, setCustomizing] = useState<MenuItem | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const replaceCart = useCartStore((s) => s.replaceCart);
  const cartRestaurantName = useCartStore((s) => s.restaurantName);
  const { itemCount, itemsTotal } = useCartTotals();

  const quickAdd = (item: MenuItem) => {
    // Items with options must go through the customize sheet.
    if (item.variants.length > 0 || item.addOns.length > 0) {
      setCustomizing(item);
      return;
    }
    commitAdd(item, { addOns: [], quantity: 1 });
  };

  const commitAdd = (
    item: MenuItem,
    opts: { variant?: string; addOns: { name: string; price: number }[]; quantity: number },
  ) => {
    if (!restaurant.data) return;
    const result = addItem({ id: restaurant.data._id, name: restaurant.data.name }, item, opts);
    if (result === 'different_restaurant') {
      Alert.alert(
        t('restaurant.replaceCartTitle'),
        t('restaurant.replaceCartBody', { restaurant: cartRestaurantName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.continue'), style: 'destructive', onPress: replaceCart },
        ],
      );
    }
  };

  const sections =
    menu.data?.map((s) => ({ title: s.title, data: s.items })) ?? [];

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          restaurant.isLoading ? (
            <View style={styles.headerPad}>
              <Skeleton height={190} style={{ borderRadius: radii.lg }} />
              <Skeleton width="55%" style={{ marginTop: spacing.lg }} />
            </View>
          ) : restaurant.data ? (
            <View style={styles.headerPad}>
              <View>
                <Image
                  source={restaurant.data.coverImageUrl}
                  style={styles.cover}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  onPress={() => navigation.goBack()}
                  style={styles.back}
                >
                  <Text style={styles.backIcon}>‹</Text>
                </Pressable>
                <View style={styles.heart}>
                  <WishlistHeart restaurantId={restaurant.data._id} />
                </View>
              </View>

              <View style={[styles.infoCard, shadow.card, { backgroundColor: colors.surface }]}>
                <View style={styles.titleRow}>
                  <Text style={[typography.title, { color: colors.text, flex: 1 }]}>
                    {restaurant.data.name}
                  </Text>
                  <RatingPill rating={restaurant.data.rating} />
                </View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {restaurant.data.cuisines.join(' · ')}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  {t('restaurant.deliveryIn', { mins: restaurant.data.deliveryTimeMins })} ·{' '}
                  ₹{restaurant.data.deliveryFee} delivery ·{' '}
                  {t('restaurant.minOrder', { amount: restaurant.data.minOrderAmount })}
                </Text>
                {!restaurant.data.isOpen ? (
                  <Text style={[typography.bodyBold, { color: colors.danger, marginTop: spacing.sm }]}>
                    Currently closed
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text style={[typography.heading, styles.sectionHeader, { color: colors.text }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={[styles.itemRow, { borderBottomColor: colors.border }]}>
            <View style={styles.itemInfo}>
              <View style={styles.itemBadges}>
                <VegBadge isVeg={item.isVeg} />
                {item.isBestseller ? (
                  <Text style={[typography.micro, { color: colors.gold }]}>★ BESTSELLER</Text>
                ) : null}
              </View>
              <Text style={[typography.bodyBold, { color: colors.text }]}>{item.name}</Text>
              <Text style={[typography.bodyBold, { color: colors.textMuted }]}>
                ₹{item.basePrice}
              </Text>
              {item.description ? (
                <Text numberOfLines={2} style={[typography.caption, { color: colors.textMuted }]}>
                  {item.description}
                </Text>
              ) : null}
            </View>

            <View style={styles.itemRight}>
              {item.imageUrl ? (
                <Image source={item.imageUrl} style={styles.itemImage} cachePolicy="memory-disk" />
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name} to cart`}
                onPress={() => quickAdd(item)}
                style={[styles.addBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
              >
                <Text style={[typography.bodyBold, { color: colors.primary }]}>ADD</Text>
              </Pressable>
              {item.variants.length > 0 || item.addOns.length > 0 ? (
                <Text style={[typography.micro, { color: colors.textMuted }]}>
                  {t('restaurant.customize')}
                </Text>
              ) : null}
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: itemCount > 0 ? 96 : spacing.xl }}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating cart bar */}
      {itemCount > 0 ? (
        <View style={[styles.cartBar, shadow.card]}>
          <Button
            title={`${itemCount} item${itemCount > 1 ? 's' : ''} · ₹${itemsTotal} — ${t('cart.title')} →`}
            onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
          />
        </View>
      ) : null}

      {customizing ? (
        <CustomizeSheet
          item={customizing}
          onClose={() => setCustomizing(null)}
          onAdd={(opts) => {
            commitAdd(customizing, opts);
            setCustomizing(null);
          }}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerPad: { padding: spacing.lg },
  cover: { width: '100%', height: 190, borderRadius: radii.lg },
  back: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: '#fff', fontSize: 24, lineHeight: 26, fontWeight: '700' },
  heart: { position: 'absolute', top: spacing.md, right: spacing.md },
  infoCard: { borderRadius: radii.lg, padding: spacing.lg, marginTop: -spacing.xl, marginHorizontal: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  itemRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  itemInfo: { flex: 1, gap: 3 },
  itemBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemRight: { alignItems: 'center', gap: spacing.xs },
  itemImage: { width: 96, height: 84, borderRadius: radii.md },
  addBtn: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 6,
    marginTop: -spacing.lg,
  },
  cartBar: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
});
