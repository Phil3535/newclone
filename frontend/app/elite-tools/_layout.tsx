import { Stack } from 'expo-router';

export default function EliteToolsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="index" />
      {/* Phase 1: Elite Sales Tools */}
      <Stack.Screen name="deal-stacker" />
      <Stack.Screen name="payment-calculator" />
      <Stack.Screen name="proposal-builder" />
      <Stack.Screen name="upsell-recommender" />
      {/* Phase 2: AI Power Tools */}
      <Stack.Screen name="ai-objection-handler" />
      <Stack.Screen name="close-probability" />
      <Stack.Screen name="follow-up-timing" />
      {/* Phase 3: Intelligence Tools */}
      <Stack.Screen name="neighborhood-heatmap" />
      <Stack.Screen name="weather-outreach" />
      <Stack.Screen name="competitor-intel" />
    </Stack>
  );
}
