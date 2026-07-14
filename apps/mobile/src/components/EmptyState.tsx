import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography, useTheme } from '@/theme';
import { Button } from './Button';

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  emoji, title, subtitle, actionTitle, onAction,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[typography.title, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      {subtitle ? (
        <Text style={[typography.body, styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emoji: { fontSize: 56, marginBottom: spacing.lg },
  subtitle: { textAlign: 'center', marginTop: spacing.sm },
  action: { marginTop: spacing.xl, alignSelf: 'stretch' },
});
