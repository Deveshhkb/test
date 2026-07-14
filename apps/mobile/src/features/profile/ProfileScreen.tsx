import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import auth from '@react-native-firebase/auth';
import { Screen } from '@/components/Screen';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useUpdateProfile } from '@/api/hooks';
import { disconnectSocket } from '@/services/socket';
import { setLocale, t } from '@/i18n';
import { radii, spacing, typography, useTheme } from '@/theme';
import type { TabScreenProps } from '@/navigation/types';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'es', label: 'Español' },
] as const;

export const ProfileScreen: React.FC<TabScreenProps<'Profile'>> = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const updateProfile = useUpdateProfile();

  const confirmSignOut = () =>
    Alert.alert(t('profile.signOut'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut'),
        style: 'destructive',
        onPress: async () => {
          await auth().signOut().catch(() => undefined);
          disconnectSocket();
          signOut();
        },
      },
    ]);

  const Row: React.FC<{ label: string; onPress?: () => void; trailing?: React.ReactNode }> = ({
    label, onPress, trailing,
  }) => (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{label}</Text>
      {trailing ?? (onPress ? <Text style={{ color: colors.textMuted }}>›</Text> : null)}
    </Pressable>
  );

  const Segmented: React.FC<{
    options: { key: string; label: string }[];
    value: string;
    onChange: (key: string) => void;
  }> = ({ options, value, onChange }) => (
    <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.key)}
            style={[styles.segmentItem, active && { backgroundColor: colors.surface }]}
          >
            <Text
              style={[
                typography.caption,
                { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '700' : '400' },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Text style={[typography.title, { color: colors.primary }]}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View>
            <Text style={[typography.title, { color: colors.text }]}>{user?.name}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {user?.phone ?? user?.email}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Row label={`♥ ${t('profile.wishlist')}`} onPress={() => navigation.navigate('Wishlist')} />
          <Row
            label={`📍 ${t('profile.addresses')} (${user?.addresses?.length ?? 0})`}
            onPress={() => Alert.alert('Savora', 'Address management — add addresses at checkout.')}
          />
        </View>

        {/* Appearance */}
        <Text style={[typography.heading, styles.sectionTitle, { color: colors.text }]}>
          {t('profile.theme')}
        </Text>
        <Segmented
          options={[
            { key: 'system', label: t('profile.themeSystem') },
            { key: 'light', label: t('profile.themeLight') },
            { key: 'dark', label: t('profile.themeDark') },
          ]}
          value={preference}
          onChange={(key) => setPreference(key as 'system' | 'light' | 'dark')}
        />

        {/* Language */}
        <Text style={[typography.heading, styles.sectionTitle, { color: colors.text }]}>
          {t('profile.language')}
        </Text>
        <Segmented
          options={LANGUAGES.map((l) => ({ key: l.code, label: l.label }))}
          value={user?.language ?? 'en'}
          onChange={(code) => {
            setLocale(code);
            updateProfile.mutate({ language: code as 'en' });
          }}
        />

        <Pressable
          accessibilityRole="button"
          onPress={confirmSignOut}
          style={[styles.signOut, { borderColor: colors.danger }]}
        >
          <Text style={[typography.bodyBold, { color: colors.danger }]}>{t('profile.signOut')}</Text>
        </Pressable>

        <Text style={[typography.caption, styles.version, { color: colors.textMuted }]}>
          Savora v1.0.0
        </Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radii.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  segment: { flexDirection: 'row', borderRadius: radii.md, padding: 3 },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  signOut: {
    marginTop: spacing.xxl,
    borderWidth: 1.5,
    borderRadius: radii.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  version: { textAlign: 'center', marginTop: spacing.lg },
});
