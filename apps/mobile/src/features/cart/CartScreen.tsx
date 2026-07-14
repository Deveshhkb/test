import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Stepper } from '@/components/Stepper';
import { VegBadge } from '@/components/VegBadge';
import { useCartStore, useCartTotals } from '@/store/cartStore';
import { useCoupons } from '@/api/hooks';
import { radii, spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import type { Coupon } from '@/api/types';
import type { TabScreenProps } from '@/navigation/types';

export const computeCouponDiscount = (coupon: Coupon, itemsTotal: number): number => {
  if (itemsTotal < coupon.minOrderAmount) return 0;
  const raw = coupon.discountType === 'percent'
    ? (itemsTotal * coupon.discountValue) / 100
    : coupon.discountValue;
  return Math.round(Math.min(raw, coupon.maxDiscount ?? raw, itemsTotal));
};

export const CartScreen: React.FC<TabScreenProps<'Cart'>> = ({ navigation }) => {
  const { colors } = useTheme();
  const lines = useCartStore((s) => s.lines);
  const restaurantName = useCartStore((s) => s.restaurantName);
  const couponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const changeQuantity = useCartStore((s) => s.changeQuantity);
  const { itemsTotal } = useCartTotals();
  const coupons = useCoupons();

  const appliedCoupon = coupons.data?.find((c) => c.code === couponCode);
  const discount = appliedCoupon ? computeCouponDiscount(appliedCoupon, itemsTotal) : 0;

  const eligibleCoupons = useMemo(
    () => coupons.data?.filter((c) => computeCouponDiscount(c, itemsTotal) > 0) ?? [],
    [coupons.data, itemsTotal],
  );

  if (lines.length === 0) {
    return (
      <Screen>
        <EmptyState
          emoji="🛒"
          title={t('cart.empty')}
          subtitle={t('cart.emptyHint')}
          actionTitle={t('home.allRestaurants')}
          onAction={() => navigation.navigate('Home')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[typography.title, styles.title, { color: colors.text }]}>
        {t('cart.title')} · {restaurantName}
      </Text>

      <FlatList
        data={lines}
        keyExtractor={(l) => l.key}
        renderItem={({ item }) => (
          <View style={[styles.line, { borderBottomColor: colors.border }]}>
            <VegBadge isVeg={item.isVeg} />
            <View style={styles.lineInfo}>
              <Text style={[typography.bodyBold, { color: colors.text }]}>{item.name}</Text>
              {item.variant ? (
                <Text style={[typography.caption, { color: colors.textMuted }]}>{item.variant}</Text>
              ) : null}
              {item.addOns.length > 0 ? (
                <Text numberOfLines={1} style={[typography.caption, { color: colors.textMuted }]}>
                  + {item.addOns.map((a) => a.name).join(', ')}
                </Text>
              ) : null}
            </View>
            <Stepper value={item.quantity} onChange={(d) => changeQuantity(item.key, d)} />
            <Text style={[typography.bodyBold, styles.linePrice, { color: colors.text }]}>
              ₹{item.unitPrice * item.quantity}
            </Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {/* Coupons */}
            <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm }]}>
              {t('cart.coupon')}
            </Text>
            {eligibleCoupons.map((c) => {
              const active = c.code === couponCode;
              return (
                <Pressable
                  key={c._id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setCoupon(active ? null : c.code)}
                  style={[
                    styles.coupon,
                    {
                      borderColor: active ? colors.mint : colors.border,
                      backgroundColor: active ? `${colors.mint}18` : colors.surface,
                    },
                  ]}
                >
                  <View style={styles.flex}>
                    <Text style={[typography.bodyBold, { color: colors.text }]}>{c.code}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{c.title}</Text>
                  </View>
                  <Text style={[typography.bodyBold, { color: colors.mint }]}>
                    −₹{computeCouponDiscount(c, itemsTotal)}
                  </Text>
                </Pressable>
              );
            })}

            {/* Bill summary — final amounts are recomputed server-side at order time. */}
            <View style={[styles.bill, { backgroundColor: colors.surface }]}>
              <BillRow label={t('cart.itemsTotal')} value={`₹${itemsTotal}`} />
              {discount > 0 ? (
                <BillRow label={t('cart.discount')} value={`−₹${discount}`} accent />
              ) : null}
              <BillRow label={`${t('cart.deliveryFee')} + ${t('cart.taxes')}`} value="At checkout" muted />
              <View style={[styles.billDivider, { backgroundColor: colors.border }]} />
              <BillRow label={t('cart.grandTotal')} value={`₹${itemsTotal - discount}`} bold />
            </View>

            <Button title={t('cart.checkout')} onPress={() => navigation.navigate('Checkout')} />
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
};

const BillRow: React.FC<{ label: string; value: string; bold?: boolean; accent?: boolean; muted?: boolean }> = ({
  label, value, bold, accent, muted,
}) => {
  const { colors } = useTheme();
  const color = accent ? colors.mint : muted ? colors.textMuted : colors.text;
  const style = bold ? typography.bodyBold : typography.body;
  return (
    <View style={styles.billRow}>
      <Text style={[style, { color }]}>{label}</Text>
      <Text style={[style, { color }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineInfo: { flex: 1 },
  linePrice: { minWidth: 56, textAlign: 'right' },
  footer: { padding: spacing.lg, gap: spacing.md },
  coupon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    padding: spacing.md,
    gap: spacing.md,
  },
  bill: { borderRadius: radii.md, padding: spacing.lg, gap: spacing.sm, marginTop: spacing.md },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },
  billDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
});
