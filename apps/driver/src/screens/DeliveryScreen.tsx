import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, colors, getSocket } from '@/core';
import type { RootParams } from '../../App';

type Props = NativeStackScreenProps<RootParams, 'Delivery'>;

interface OrderDetail {
  _id: string;
  orderNumber: string;
  status: string;
  restaurant: { name: string; address: string; location: { coordinates: [number, number] } };
  deliveryAddress: { line1: string; city: string; location: { coordinates: [number, number] } };
}

/** Advance through: picked_up → on_the_way → delivered. */
const NEXT_ACTION: Record<string, { next: string; label: string }> = {
  placed: { next: 'picked_up', label: 'Mark picked up' },
  confirmed: { next: 'picked_up', label: 'Mark picked up' },
  preparing: { next: 'picked_up', label: 'Mark picked up' },
  ready_for_pickup: { next: 'picked_up', label: 'Mark picked up' },
  picked_up: { next: 'on_the_way', label: 'Start delivery' },
  on_the_way: { next: 'delivered', label: 'Mark delivered' },
};

export const DeliveryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then((res) => setOrder(res.data.data)).catch(() => undefined);
  }, [orderId]);

  // Publish live GPS over the socket for the customer's tracking map.
  useEffect(() => {
    const socket = getSocket();
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      watcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 20 },
        (pos) => {
          socket.emit('driver:location', {
            orderId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
      );
    })();
    return () => watcher.current?.remove();
  }, [orderId]);

  const advance = async () => {
    if (!order) return;
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: action.next });
      setOrder(res.data.data ? { ...order, status: res.data.data.status } : order);
      if (action.next === 'delivered') {
        Alert.alert('Savora Rider', 'Delivery complete — payout added to your earnings! 🎉');
        navigation.goBack();
      }
    } catch {
      Alert.alert('Savora Rider', 'Could not update the order status.');
    }
  };

  if (!order) {
    return (
      <View style={styles.body}>
        <Text style={styles.muted}>Loading order…</Text>
      </View>
    );
  }

  const pickup = {
    latitude: order.restaurant.location.coordinates[1],
    longitude: order.restaurant.location.coordinates[0],
  };
  const drop = {
    latitude: order.deliveryAddress.location.coordinates[1],
    longitude: order.deliveryAddress.location.coordinates[0],
  };
  const target = ['picked_up', 'on_the_way'].includes(order.status) ? drop : pickup;
  const action = NEXT_ACTION[order.status];

  return (
    <View style={styles.body}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        userInterfaceStyle="dark"
        showsUserLocation
        followsUserLocation
        initialRegion={{ ...pickup, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        <Marker coordinate={pickup} title={order.restaurant.name}>
          <Text style={styles.marker}>🍳</Text>
        </Marker>
        <Marker coordinate={drop} title="Customer">
          <Text style={styles.marker}>🏠</Text>
        </Marker>
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.orderNo}>{order.orderNumber} · {order.status.replace(/_/g, ' ')}</Text>
        <Text style={styles.addr}>
          {['picked_up', 'on_the_way'].includes(order.status)
            ? `🏠 ${order.deliveryAddress.line1}, ${order.deliveryAddress.city}`
            : `🍳 ${order.restaurant.name} — ${order.restaurant.address}`}
        </Text>

        <Pressable
          style={styles.navBtn}
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=driving`,
            )
          }
        >
          <Text style={styles.navText}>🧭 Navigate</Text>
        </Pressable>

        {action ? (
          <Pressable style={styles.actionBtn} onPress={advance}>
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.background },
  muted: { color: colors.textMuted, textAlign: 'center', marginTop: 120 },
  map: { flex: 1 },
  marker: { fontSize: 26 },
  panel: { padding: 20, gap: 12, backgroundColor: colors.surface },
  orderNo: { color: colors.gold, fontWeight: '800' },
  addr: { color: colors.text, fontSize: 16 },
  navBtn: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { color: colors.primary, fontWeight: '700' },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: colors.background, fontWeight: '800', fontSize: 16 },
});
