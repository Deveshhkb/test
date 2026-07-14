import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/store/authStore';
import { useCartTotals } from '@/store/cartStore';
import { useTheme } from '@/theme';
import { t } from '@/i18n';
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from './types';

import { LoginScreen } from '@/features/auth/LoginScreen';
import { OtpScreen } from '@/features/auth/OtpScreen';
import { HomeScreen } from '@/features/home/HomeScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { CartScreen } from '@/features/cart/CartScreen';
import { OrdersScreen } from '@/features/orders/OrdersScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { RestaurantScreen } from '@/features/restaurant/RestaurantScreen';
import { CheckoutScreen } from '@/features/checkout/CheckoutScreen';
import { OrderTrackingScreen } from '@/features/orders/OrderTrackingScreen';
import { RateOrderScreen } from '@/features/reviews/RateOrderScreen';
import { WishlistScreen } from '@/features/wishlist/WishlistScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Otp" component={OtpScreen} />
  </AuthStack.Navigator>
);

const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Home: '⌂',
  Search: '⌕',
  Cart: '☰',
  Orders: '◷',
  Profile: '☺',
};

const MainTabs = () => {
  const { colors } = useTheme();
  const { itemCount } = useCartTotals();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 20 }} accessibilityElementsHidden>
            {TAB_ICONS[route.name]}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Search" component={SearchScreen} />
      <Tabs.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarBadge: itemCount > 0 ? itemCount : undefined }}
      />
      <Tabs.Screen name="Orders" component={OrdersScreen} options={{ title: t('orders.title') }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
};

export const RootNavigator = () => {
  const token = useAuthStore((s) => s.token);
  const { isDark, colors } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      primary: colors.primary,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {token ? (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen name="Restaurant" component={RestaurantScreen} />
            <RootStack.Screen name="Checkout" component={CheckoutScreen} />
            <RootStack.Screen name="OrderTracking" component={OrderTrackingScreen} />
            <RootStack.Screen
              name="RateOrder"
              component={RateOrderScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen name="Wishlist" component={WishlistScreen} />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
