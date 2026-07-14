import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { radii, typography, useTheme } from '@/theme';

interface StepperProps {
  value: number;
  onChange: (delta: 1 | -1) => void;
  min?: number;
}

export const Stepper: React.FC<StepperProps> = ({ value, onChange, min = 0 }) => {
  const { colors } = useTheme();
  const tap = (delta: 1 | -1) => {
    Haptics.selectionAsync();
    onChange(delta);
  };
  return (
    <View style={[styles.wrap, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        disabled={value <= min}
        hitSlop={8}
        onPress={() => tap(-1)}
        style={styles.btn}
      >
        <Text style={[typography.heading, { color: colors.primary }]}>−</Text>
      </Pressable>
      <Text
        accessibilityLiveRegion="polite"
        style={[typography.bodyBold, styles.value, { color: colors.primary }]}
      >
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        hitSlop={8}
        onPress={() => tap(1)}
        style={styles.btn}
      >
        <Text style={[typography.heading, { color: colors.primary }]}>+</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  btn: { paddingHorizontal: 12, paddingVertical: 6 },
  value: { minWidth: 24, textAlign: 'center' },
});
