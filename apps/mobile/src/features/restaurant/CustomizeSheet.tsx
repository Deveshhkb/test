import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { Stepper } from '@/components/Stepper';
import { VegBadge } from '@/components/VegBadge';
import { radii, spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import type { MenuItem } from '@/api/types';

interface CustomizeSheetProps {
  item: MenuItem;
  onClose: () => void;
  onAdd: (opts: { variant?: string; addOns: { name: string; price: number }[]; quantity: number }) => void;
}

/** Bottom sheet for variant + add-on selection with a live price total. */
export const CustomizeSheet: React.FC<CustomizeSheetProps> = ({ item, onClose, onAdd }) => {
  const { colors } = useTheme();
  const [variant, setVariant] = useState<string | undefined>(item.variants[0]?.name);
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);

  const total = useMemo(() => {
    const base = variant
      ? item.variants.find((v) => v.name === variant)?.price ?? item.basePrice
      : item.basePrice;
    const addOnTotal = item.addOns
      .filter((a) => selectedAddOns.has(a.name))
      .reduce((s, a) => s + a.price, 0);
    return (base + addOnTotal) * quantity;
  }, [item, variant, selectedAddOns, quantity]);

  const toggleAddOn = (name: string) =>
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={onClose} />
      <Animated.View
        entering={SlideInDown.springify().damping(18)}
        exiting={SlideOutDown}
        style={[styles.sheet, { backgroundColor: colors.surface }]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.titleRow}>
          <VegBadge isVeg={item.isVeg} />
          <Text style={[typography.title, { color: colors.text, flex: 1 }]}>{item.name}</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {item.variants.length > 0 ? (
            <>
              <Text style={[typography.heading, styles.groupTitle, { color: colors.text }]}>
                Choose size
              </Text>
              {item.variants.map((v) => (
                <Pressable
                  key={v.name}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: variant === v.name }}
                  onPress={() => setVariant(v.name)}
                  style={[styles.optionRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{v.name}</Text>
                  <Text style={[typography.body, { color: colors.textMuted }]}>₹{v.price}</Text>
                  <View
                    style={[
                      styles.radio,
                      { borderColor: variant === v.name ? colors.primary : colors.border },
                    ]}
                  >
                    {variant === v.name ? (
                      <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </>
          ) : null}

          {item.addOns.length > 0 ? (
            <>
              <Text style={[typography.heading, styles.groupTitle, { color: colors.text }]}>
                Add-ons
              </Text>
              {item.addOns.map((a) => {
                const checked = selectedAddOns.has(a.name);
                return (
                  <Pressable
                    key={a.name}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => toggleAddOn(a.name)}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                  >
                    <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{a.name}</Text>
                    <Text style={[typography.body, { color: colors.textMuted }]}>+₹{a.price}</Text>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: checked ? colors.primary : colors.border,
                          backgroundColor: checked ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {checked ? <Text style={styles.check}>✓</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Stepper value={quantity} min={1} onChange={(d) => setQuantity((q) => Math.max(1, q + d))} />
          <Button
            title={t('restaurant.addToCart', { amount: total })}
            style={styles.addBtn}
            onPress={() =>
              onAdd({
                variant,
                addOns: item.addOns.filter((a) => selectedAddOns.has(a.name)),
                quantity,
              })
            }
          />
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  scroll: { flexGrow: 0 },
  groupTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 12, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  addBtn: { flex: 1 },
});
