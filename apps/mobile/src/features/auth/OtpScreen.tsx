import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import auth from '@react-native-firebase/auth';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { radii, spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import { api, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { registerForPushNotifications } from '@/services/notifications';
import { otpConfirmation } from './LoginScreen';
import type { AuthScreenProps } from '@/navigation/types';
import type { ApiEnvelope, User } from '@/api/types';

const OTP_LENGTH = 6;

export const OtpScreen: React.FC<AuthScreenProps<'Otp'>> = ({ route }) => {
  const { colors } = useTheme();
  const { phone } = route.params;
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);
  const setSession = useAuthStore((s) => s.setSession);

  const onDigit = (index: number, value: string) => {
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (!value && index > 0) inputs.current[index - 1]?.focus();
  };

  const verify = async () => {
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) {
      Alert.alert('Savora', t('auth.invalidOtp'));
      return;
    }
    try {
      setVerifying(true);
      // 1. Confirm OTP with Firebase, 2. exchange the ID token for a Savora session.
      const credential = await otpConfirmation?.confirm(code);
      const idToken = await credential?.user.getIdToken();
      if (!idToken) throw new Error('no-token');

      const fcmToken = await registerForPushNotifications();
      const res = await api.post<ApiEnvelope<{ token: string; user: User }>>('/auth/firebase', {
        idToken,
        fcmToken,
      });
      setSession(res.data.data.token, res.data.data.user);
    } catch (err) {
      Alert.alert('Savora', getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={[typography.title, { color: colors.text }]}>{t('auth.otpTitle')}</Text>
        <Text style={[typography.body, styles.subtitle, { color: colors.textMuted }]}>
          {t('auth.otpSubtitle', { phone })}
        </Text>

        <View style={styles.otpRow} accessibilityLabel="One-time password input">
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              value={digit}
              onChangeText={(v) => onDigit(i, v)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
              style={[
                styles.otpBox,
                typography.title,
                {
                  color: colors.text,
                  borderColor: digit ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            />
          ))}
        </View>

        <Button title={t('auth.verify')} onPress={verify} loading={verifying} />
        <Button
          title={t('auth.resend')}
          variant="ghost"
          onPress={() => auth().signInWithPhoneNumber(phone)}
          style={styles.resend}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  otpRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    borderWidth: 1.5,
    borderRadius: radii.md,
    textAlign: 'center',
  },
  resend: { marginTop: spacing.sm },
});
