import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, colors } from '@/core';

interface Earnings {
  today: number;
  week: number;
  month: number;
  lifetime: number;
  totalDeliveries: number;
  rating: number;
  recent: { date: string; amount: number }[];
}

export const EarningsScreen: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['earnings'],
    queryFn: async () => (await api.get<{ data: Earnings }>('/drivers/me/earnings')).data.data,
    refetchInterval: 60_000,
  });

  const Stat: React.FC<{ label: string; value: string; big?: boolean }> = ({ label, value, big }) => (
    <View style={[styles.stat, big && styles.statBig]}>
      <Text style={[styles.statValue, big && styles.statValueBig]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.body}>
      <Text style={styles.title}>Earnings</Text>

      <Stat label="Today" value={`₹${data?.today ?? 0}`} big />
      <View style={styles.grid}>
        <Stat label="This week" value={`₹${data?.week ?? 0}`} />
        <Stat label="This month" value={`₹${data?.month ?? 0}`} />
      </View>
      <View style={styles.grid}>
        <Stat label="Deliveries" value={`${data?.totalDeliveries ?? 0}`} />
        <Stat label="Rating" value={`★ ${data?.rating?.toFixed(1) ?? '—'}`} />
      </View>

      <Text style={styles.section}>Recent payouts</Text>
      <FlatList
        data={data?.recent ?? []}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowDate}>{new Date(item.date).toLocaleString()}</Text>
            <Text style={styles.rowAmount}>+₹{item.amount}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>Complete deliveries to see payouts here.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 64 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 16 },
  grid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  statBig: { alignItems: 'center', paddingVertical: 24 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statValueBig: { fontSize: 36, color: colors.success },
  statLabel: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  section: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 24, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowDate: { color: colors.textMuted, fontSize: 13 },
  rowAmount: { color: colors.success, fontWeight: '700' },
  muted: { color: colors.textMuted, marginTop: 12 },
});
