import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { useOrder } from '@/api/hooks';
import { getSocket } from '@/services/socket';
import { radii, shadow, spacing, typography, useTheme } from '@/theme';
import { t } from '@/i18n';
import type { OrderStatus } from '@/api/types';
import type { RootScreenProps } from '@/navigation/types';

const STEPS: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'picked_up', 'on_the_way', 'delivered'];

export const OrderTrackingScreen: React.FC<RootScreenProps<'OrderTracking'>> = ({
  navigation, route,
}) => {
  const { colors, isDark } = useTheme();
  const { orderId } = route.params;
  const qc = useQueryClient();
  // Socket pushes are primary; a slow poll is the safety net.
  const order = useOrder(orderId, { refetchInterval: 30_000 });
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('order:watch', orderId);

    const onUpdate = () => qc.invalidateQueries({ queryKey: ['order', orderId] });
    const onDriverLocation = (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId !== orderId) return;
      setDriverPos({ lat: data.lat, lng: data.lng });
      mapRef.current?.animateCamera({ center: { latitude: data.lat, longitude: data.lng } }, { duration: 800 });
    };

    socket.on('order:update', onUpdate);
    socket.on('driver:location', onDriverLocation);
    return () => {
      socket.emit('order:unwatch', orderId);
      socket.off('order:update', onUpdate);
      socket.off('driver:location', onDriverLocation);
    };
  }, [orderId, qc]);

  const data = order.data;
  const restaurantCoord = data?.restaurant?.location
    ? { latitude: data.restaurant.location.coordinates[1], longitude: data.restaurant.location.coordinates[0] }
    : null;
  const dropCoord = data?.deliveryAddress?.location
    ? { latitude: data.deliveryAddress.location.coordinates[1], longitude: data.deliveryAddress.location.coordinates[0] }
    : null;

  const currentStep = useMemo(
    () => (data ? STEPS.indexOf(data.status) : -1),
    [data],
  );

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[typography.title, { color: colors.text }]}>‹</Text>
        </Pressable>
        <View style={styles.flex}>
          <Text style={[typography.heading, { color: colors.text }]}>
            {data ? t(`orders.status.${data.status}`) : '—'}
          </Text>
          {data?.eta && !['delivered', 'cancelled'].includes(data.status) ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Arriving by {new Date(data.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : null}
        </View>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {data?.orderNumber ?? ''}
        </Text>
      </View>

      {restaurantCoord && dropCoord ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          initialRegion={{
            latitude: (restaurantCoord.latitude + dropCoord.latitude) / 2,
            longitude: (restaurantCoord.longitude + dropCoord.longitude) / 2,
            latitudeDelta: Math.abs(restaurantCoord.latitude - dropCoord.latitude) * 2.6 + 0.01,
            longitudeDelta: Math.abs(restaurantCoord.longitude - dropCoord.longitude) * 2.6 + 0.01,
          }}
        >
          <Marker coordinate={restaurantCoord} title={data?.restaurant.name} description="Pickup">
            <Text style={styles.marker}>🍳</Text>
          </Marker>
          <Marker coordinate={dropCoord} title="Delivery address">
            <Text style={styles.marker}>🏠</Text>
          </Marker>
          {driverPos ? (
            <Marker
              coordinate={{ latitude: driverPos.lat, longitude: driverPos.lng }}
              title={data?.driver?.name ?? 'Your rider'}
            >
              <Text style={styles.marker}>🛵</Text>
            </Marker>
          ) : null}
          <Polyline
            coordinates={[
              restaurantCoord,
              ...(driverPos ? [{ latitude: driverPos.lat, longitude: driverPos.lng }] : []),
              dropCoord,
            ]}
            strokeColor={colors.primary}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        </MapView>
      ) : (
        <Skeleton height={280} style={{ marginHorizontal: spacing.lg, borderRadius: radii.lg }} />
      )}

      {/* Status timeline */}
      <View style={[styles.panel, shadow.card, { backgroundColor: colors.surface }]}>
        {STEPS.map((step, i) => {
          const reached = currentStep >= i;
          return (
            <View key={step} style={styles.stepRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: reached ? colors.primary : colors.border },
                ]}
              />
              <Text
                style={[
                  reached ? typography.bodyBold : typography.body,
                  { color: reached ? colors.text : colors.textMuted },
                ]}
              >
                {t(`orders.status.${step}`)}
              </Text>
            </View>
          );
        })}

        {data?.driver ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call rider ${data.driver.name}`}
            onPress={() => data.driver?.phone && Linking.openURL(`tel:${data.driver.phone}`)}
            style={[styles.driverRow, { borderTopColor: colors.border }]}
          >
            <Text style={styles.marker}>🛵</Text>
            <View style={styles.flex}>
              <Text style={[typography.bodyBold, { color: colors.text }]}>{data.driver.name}</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Your rider</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.primary }]}>📞 Call</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  map: { flex: 1, marginHorizontal: spacing.lg, borderRadius: radii.lg, overflow: 'hidden' },
  marker: { fontSize: 26 },
  panel: {
    margin: spacing.lg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
