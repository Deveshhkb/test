import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/Button';
import { useMyOrders } from '@/api/hooks';
import { radii, shadow, spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import type { Order, OrderStatus } from '@/api/types';
import type { TabScreenProps } from '@/navigation/types';

const ACTIVE_STATUSES: OrderStatus[] = [
  'pending_payment', 'placed', 'confirmed', 'preparing',
  'ready_for_pickup', 'picked_up', 'on_the_way',
];

export const OrdersScreen: React.FC<TabScreenProps<'Orders'>> = ({ navigation }) => {
  const { colors } = useTheme();
  const orders = useMyOrders();

  const renderOrder = ({ item }: { item: Order }) => {
    const isActive = ACTIVE_STATUSES.includes(item.status);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Order from ${item.restaurant.name}, ${t(`orders.status.${item.status}`)}`}
        onPress={() => navigation.navigate('OrderTracking', { orderId: item._id })}
        style={[styles.card, shadow.card, { backgroundColor: colors.surface }]}
      >
        <View style={styles.row}>
          <Image source={item.restaurant.coverImageUrl} style={styles.thumb} cachePolicy="memory-disk" />
          <View style={styles.flex}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>{item.restaurant.name}</Text>
            <Text numberOfLines={1} style={[typography.caption, { color: colors.textMuted }]}>
              {item.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {new Date(item.createdAt).toLocaleDateString()} · ₹{item.pricing.grandTotal}
            </Text>
          </View>
          <Text
            style={[
              typography.micro,
              styles.status,
              {
                color: isActive ? colors.gold : item.status === 'delivered' ? colors.success : colors.danger,
              },
            ]}
          >
            {t(`orders.status.${item.status}`).toUpperCase()}
          </Text>
        </View>

        {isActive ? (
          <Button
            title={t('orders.track')}
            variant="secondary"
            style={styles.action}
            onPress={() => navigation.navigate('OrderTracking', { orderId: item._id })}
          />
        ) : item.status === 'delivered' && !item.rated ? (
          <Button
            title={`★ ${t('orders.rate')}`}
            variant="secondary"
            style={styles.action}
            onPress={() =>
              navigation.navigate('RateOrder', {
                orderId: item._id,
                restaurantName: item.restaurant.name,
              })
            }
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Screen>
      <Text style={[typography.title, styles.title, { color: colors.text }]}>
        {t('orders.title')}
      </Text>
      <FlatList
        data={orders.data ?? []}
        keyExtractor={(o) => o._id}
        renderItem={renderOrder}
        refreshControl={
          <RefreshControl
            refreshing={orders.isRefetching}
            onRefresh={() => orders.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          orders.isLoading ? (
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={96} />)}
            </View>
          ) : (
            <EmptyState
              emoji="🧾"
              title={t('orders.empty')}
              actionTitle={t('home.allRestaurants')}
              onAction={() => navigation.navigate('Home')}
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
  flex: { flex: 1 },
  title: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { flexGrow: 1, paddingBottom: spacing.xl },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  thumb: { width: 54, height: 54, borderRadius: radii.sm },
  status: { alignSelf: 'flex-start' },
  action: { marginTop: spacing.md, minHeight: 42 },
});
