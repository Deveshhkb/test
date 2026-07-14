import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useCartStore, useCartTotals } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { usePlaceOrder, useVerifyRazorpay, useCoupons } from '@/api/hooks';
import { getErrorMessage } from '@/api/client';
import { radii, spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import { computeCouponDiscount } from '@/features/cart/CartScreen';
import type { RootScreenProps } from '@/navigation/types';

type PayMethod = 'razorpay' | 'cod';

export const CheckoutScreen: React.FC<RootScreenProps<'Checkout'>> = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const cart = useCartStore();
  const { itemsTotal } = useCartTotals();
  const coupons = useCoupons();
  const placeOrder = usePlaceOrder();
  const verifyPayment = useVerifyRazorpay();

  const [addressId, setAddressId] = useState<string | undefined>(
    user?.addresses?.find((a) => a.isDefault)?._id ?? user?.addresses?.[0]?._id,
  );
  const [method, setMethod] = useState<PayMethod>('razorpay');
  const [placing, setPlacing] = useState(false);

  const appliedCoupon = coupons.data?.find((c) => c.code === cart.couponCode);
  const discount = appliedCoupon ? computeCouponDiscount(appliedCoupon, itemsTotal) : 0;
  const estimatedTotal = itemsTotal - discount;

  const submit = async () => {
    if (!addressId) {
      Alert.alert('Savora', 'Please add a delivery address first.');
      return;
    }
    try {
      setPlacing(true);
      const { order, paymentIntent } = await placeOrder.mutateAsync({
        restaurantId: cart.restaurantId!,
        items: cart.lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          variant: l.variant,
          addOns: l.addOns.map((a) => a.name),
        })),
        addressId,
        couponCode: cart.couponCode ?? undefined,
        paymentProvider: method,
      });

      if (method === 'razorpay' && paymentIntent) {
        // Open the native Razorpay sheet, then verify the signature server-side.
        const result = await RazorpayCheckout.open({
          key: paymentIntent.keyId!,
          order_id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          name: 'Savora',
          description: `Order ${order.orderNumber}`,
          theme: { color: '#E4572E' },
          prefill: { contact: user?.phone ?? '', email: user?.email ?? '' },
        });
        await verifyPayment.mutateAsync({
          razorpayOrderId: paymentIntent.id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        });
      }

      cart.clear();
      navigation.replace('OrderTracking', { orderId: order._id });
    } catch (err) {
      Alert.alert('Savora', getErrorMessage(err));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[typography.title, { color: colors.text }]}>{t('checkout.title')}</Text>

        {/* Address selection */}
        <Text style={[typography.heading, styles.section, { color: colors.text }]}>
          {t('checkout.deliveryAddress')}
        </Text>
        {user?.addresses?.length ? (
          user.addresses.map((a) => {
            const active = a._id === addressId;
            return (
              <Pressable
                key={a._id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setAddressId(a._id)}
                style={[
                  styles.card,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primarySoft : colors.surface,
                  },
                ]}
              >
                <Text style={[typography.bodyBold, { color: colors.text }]}>
                  {a.label.toUpperCase()}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {a.line1}, {a.city} {a.pincode}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={[typography.body, { color: colors.textMuted }]}>
            {t('checkout.addAddress')} — Profile → {t('profile.addresses')}
          </Text>
        )}

        {/* Payment method */}
        <Text style={[typography.heading, styles.section, { color: colors.text }]}>
          {t('checkout.payment')}
        </Text>
        {(
          [
            { key: 'razorpay', label: t('checkout.payOnline'), icon: '💳' },
            { key: 'cod', label: t('checkout.cod'), icon: '💵' },
          ] as { key: PayMethod; label: string; icon: string }[]
        ).map((m) => {
          const active = method === m.key;
          return (
            <Pressable
              key={m.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => setMethod(m.key)}
              style={[
                styles.card,
                styles.payRow,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primarySoft : colors.surface,
                },
              ]}
            >
              <Text style={styles.payIcon}>{m.icon}</Text>
              <Text style={[typography.bodyBold, { color: colors.text }]}>{m.label}</Text>
            </Pressable>
          );
        })}

        <Text style={[typography.caption, styles.note, { color: colors.textMuted }]}>
          Delivery fee and taxes are calculated at order placement. Estimated payable: ₹{estimatedTotal} + fees.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t('checkout.placeOrder', { amount: estimatedTotal })}
          onPress={submit}
          loading={placing}
          disabled={cart.lines.length === 0}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: spacing.xl, paddingBottom: spacing.xxl },
  section: { marginTop: spacing.xl, marginBottom: spacing.md },
  card: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  payIcon: { fontSize: 20 },
  note: { marginTop: spacing.md },
  footer: { padding: spacing.lg },
});
