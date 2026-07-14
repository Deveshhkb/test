import React from 'react';
import { StyleSheet, View } from 'react-native';

/** Indian FSSAI-style veg/non-veg marker. */
export const VegBadge: React.FC<{ isVeg: boolean; size?: number }> = ({ isVeg, size = 14 }) => {
  const color = isVeg ? '#2E9E5B' : '#B4432C';
  return (
    <View
      accessibilityLabel={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      style={[styles.box, { borderColor: color, width: size, height: size }]}
    >
      <View style={[styles.dot, { backgroundColor: color, width: size / 2, height: size / 2 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  dot: { borderRadius: 99 },
});
