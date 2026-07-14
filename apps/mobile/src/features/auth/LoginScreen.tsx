import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import type { AuthScreenProps } from '@/navigation/types';

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, t('auth.invalidPhone')),
});
type FormValues = z.infer<typeof schema>;

// Confirmation objects aren't serializable → kept module-level, not in nav params.
export let otpConfirmation: ReturnType<typeof auth>['signInWithPhoneNumber'] extends (
  ...args: never[]
) => Promise<infer R>
  ? R | null
  : never = null;

export const LoginScreen: React.FC<AuthScreenProps<'Login'>> = ({ navigation }) => {
  const { colors } = useTheme();
  const [sending, setSending] = useState(false);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });

  const sendOtp = handleSubmit(async ({ phone }) => {
    try {
      setSending(true);
      otpConfirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
      navigation.navigate('Otp', { phone: `+91${phone}` });
    } catch {
      Alert.alert('Savora', 'Could not send the OTP. Please try again.');
    } finally {
      setSending(false);
    }
  });

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <Text style={styles.logo}>🍽️</Text>
          <Text style={[typography.display, { color: colors.text }]}>{t('auth.welcomeTitle')}</Text>
          <Text style={[typography.body, styles.subtitle, { color: colors.textMuted }]}>
            {t('auth.welcomeSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <TextField
                label={t('auth.phonePlaceholder')}
                placeholder="98765 43210"
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
                value={value}
                onChangeText={onChange}
                error={formState.errors.phone?.message}
              />
            )}
          />
          <Button title={t('auth.sendOtp')} onPress={sendOtp} loading={sending} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  logo: { fontSize: 64, marginBottom: spacing.lg },
  subtitle: { marginTop: spacing.sm },
  form: { padding: spacing.xl },
});
