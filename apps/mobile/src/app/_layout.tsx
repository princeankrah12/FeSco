import { SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FeScoColors } from '../theme';
import { PilotTelemetryBar } from '../components/PilotTelemetryBar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={{ backgroundColor: '#F8FAFC' }}>
        <PilotTelemetryBar />
      </SafeAreaView>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: FeScoColors.background,
          },
          headerTintColor: FeScoColors.indigo,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: FeScoColors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="kyc-document" options={{ headerShown: false }} />
        <Stack.Screen name="kyc-liveness" options={{ headerShown: false }} />
        <Stack.Screen
          name="corporate-bridge"
          options={{
            title: 'Corridor Onboarding',
            headerShown: false,
          }}
        />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="club-hub" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
