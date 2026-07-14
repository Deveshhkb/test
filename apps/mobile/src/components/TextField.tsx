import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { radii, spacing, typography, useTheme } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const TextField = React.forwardRef<TextInput, TextFieldProps>(
  ({ label, error, style, ...rest }, ref) => {
    const { colors } = useTheme();
    return (
      <View style={styles.wrap}>
        {label ? (
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
            {label}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label ?? rest.placeholder}
          style={[
            styles.input,
            typography.body,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: error ? colors.danger : colors.border,
            },
            style,
          ]}
          {...rest}
        />
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}
          >
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);
TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
});
