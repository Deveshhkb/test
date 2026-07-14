import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { api, colors } from '@/core';
import { useSession } from '@/core';

/** Same Firebase phone-OTP flow as the customer app, single-screen. */
export const LoginScreen: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const setSession = useSession((s) => s.setSession);

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Savora Rider', 'Enter a valid 10-digit mobile number.');
      return;
    }
    try {
      setBusy(true);
      setConfirmation(await auth().signInWithPhoneNumber(`+91${phone}`));
    } catch {
      Alert.alert('Savora Rider', 'Could not send the OTP.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    try {
      setBusy(true);
      const credential = await confirmation?.confirm(code);
      const idToken = await credential?.user.getIdToken();
      const res = await api.post('/auth/firebase', { idToken });
      setSession(res.data.data.token, res.data.data.user.name);
    } catch {
      Alert.alert('Savora Rider', 'Verification failed — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.body}>
      <Text style={styles.logo}>🛵</Text>
      <Text style={styles.title}>Savora Rider</Text>
      <Text style={styles.subtitle}>Deliver joy. Earn on every drop.</Text>

      {!confirmation ? (
        <>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Mobile number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.input}
          />
          <Pressable style={styles.button} onPress={sendOtp} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? '…' : 'Send OTP'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="6-digit OTP"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />
          <Pressable style={styles.button} onPress={verify} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? '…' : 'Verify & start'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: 32, marginTop: 4 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.background, fontWeight: '700', fontSize: 15 },
});
