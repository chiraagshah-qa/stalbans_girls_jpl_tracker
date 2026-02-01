import { Tabs } from 'expo-router';
import { TabIcons } from '../../components/TabIcons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: '#0a2463' },
        headerTintColor: '#FFD700',
        tabBarStyle: { backgroundColor: '#0a2463' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="table"
        options={{
          title: 'Table',
          tabBarLabel: 'Table',
          tabBarIcon: ({ color, size }) => <TabIcons name="trophy" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color, size }) => <TabIcons name="grid" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="fixtures"
        options={{
          title: 'Fixtures',
          tabBarIcon: ({ color, size }) => <TabIcons name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <TabIcons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
