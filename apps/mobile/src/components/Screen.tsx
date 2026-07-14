import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom')[];
}

/** Themed safe-area wrapper used by every screen. */
export const Screen: React.FC<ScreenProps> = ({ children, style, edges = ['top'] }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: colors.background,
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        },
        style,
      ]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({ flex: { flex: 1 } });
