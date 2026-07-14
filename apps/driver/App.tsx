import React from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, useSession } from '@/core';
import { LoginScreen } from '@/screens/LoginScreen';
import { DutyScreen } from '@/screens/DutyScreen';
import { DeliveryScreen } from '@/screens/DeliveryScreen';
import { EarningsScreen } from '@/screens/EarningsScreen';

export type RootParams = {
  Login: undefined;
  Tabs: undefined;
  Delivery: { orderId: string };
};

const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
};

const MainTabs = () => (
  <Tabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      tabBarIcon: ({ color }) => (
        <Text style={{ color, fontSize: 20 }}>{route.name === 'Duty' ? '🛵' : '₹'}</Text>
      ),
    })}
  >
    <Tabs.Screen name="Duty" component={DutyScreen} />
    <Tabs.Screen name="Earnings" component={EarningsScreen} />
  </Tabs.Navigator>
);

export default function App() {
  const token = useSession((s) => s.token);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={theme}>
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {token ? (
              <>
                <Stack.Screen name="Tabs" component={MainTabs} />
                <Stack.Screen name="Delivery" component={DeliveryScreen} />
              </>
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
