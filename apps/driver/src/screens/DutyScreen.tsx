import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { api, colors, getSocket, OrderOffer } from '@/core';
import type { RootParams } from '../../App';

/** Online/offline toggle + incoming order offers with an accept countdown. */
export const DutyScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootParams>>();
  const [online, setOnline] = useState(false);
  const [offer, setOffer] = useState<OrderOffer | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    const onOffer = (data: OrderOffer) => {
      setOffer(data);
      setCountdown(data.expiresInSec);
    };
    socket.on('order:offer', onOffer);
    return () => { socket.off('order:offer', onOffer); };
  }, []);

  useEffect(() => {
    if (!offer || countdown <= 0) {
      if (offer && countdown <= 0) setOffer(null); // expired
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [offer, countdown]);

  const toggleDuty = async (next: boolean) => {
    try {
      let coords: { lat?: number; lng?: number } = {};
      if (next) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Savora Rider', 'Location permission is required to go online.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      await api.patch('/drivers/me/status', { isOnline: next, ...coords });
      setOnline(next);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      Alert.alert('Savora Rider', message ?? 'Could not update duty status.');
    }
  };

  const accept = async () => {
    if (!offer) return;
    try {
      await api.post(`/drivers/orders/${offer.orderId}/accept`);
      const { orderId } = offer;
      setOffer(null);
      navigation.navigate('Delivery', { orderId });
    } catch {
      Alert.alert('Savora Rider', 'Order was already taken.');
      setOffer(null);
    }
  };

  const reject = async () => {
    if (!offer) return;
    api.post(`/drivers/orders/${offer.orderId}/reject`).catch(() => undefined);
    setOffer(null);
  };

  return (
    <View style={styles.body}>
      <View style={styles.dutyCard}>
        <Text style={styles.dutyTitle}>{online ? 'You are ONLINE' : 'You are offline'}</Text>
        <Text style={styles.dutySubtitle}>
          {online ? 'Waiting for orders near you…' : 'Go online to start receiving orders.'}
        </Text>
        <Switch
          value={online}
          onValueChange={toggleDuty}
          trackColor={{ true: colors.success, false: colors.border }}
          thumbColor={colors.text}
          style={styles.switch}
          accessibilityLabel={online ? 'Go offline' : 'Go online'}
        />
      </View>

      {offer ? (
        <View style={styles.offerCard}>
          <View style={styles.offerHeader}>
            <Text style={styles.offerTitle}>New order 🔔</Text>
            <Text style={styles.countdown}>{countdown}s</Text>
          </View>
          <Text style={styles.offerRestaurant}>{offer.restaurantName}</Text>
          <Text style={styles.offerLine}>📍 Pickup: {offer.pickupAddress}</Text>
          <Text style={styles.offerLine}>🏠 Drop: {offer.dropAddress}</Text>
          <Text style={styles.payout}>Earn ₹{offer.payout}</Text>
          <View style={styles.offerActions}>
            <Pressable style={[styles.offerBtn, styles.rejectBtn]} onPress={reject}>
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
            <Pressable style={[styles.offerBtn, styles.acceptBtn]} onPress={accept}>
              <Text style={styles.acceptText}>Accept</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 64 },
  dutyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  dutyTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  dutySubtitle: { color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  switch: { marginTop: 20, transform: [{ scale: 1.3 }] },
  offerCard: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
  },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  countdown: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  offerRestaurant: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 10 },
  offerLine: { color: colors.textMuted, marginTop: 4 },
  payout: { color: colors.success, fontSize: 20, fontWeight: '800', marginTop: 10 },
  offerActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  offerBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: { borderColor: colors.danger, borderWidth: 1.5 },
  rejectText: { color: colors.danger, fontWeight: '700' },
  acceptBtn: { backgroundColor: colors.success },
  acceptText: { color: '#fff', fontWeight: '700' },
});
