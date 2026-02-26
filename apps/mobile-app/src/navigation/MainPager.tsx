import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CaptureEngine from '../components/CaptureEngine';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LogScreen } from '../screens/LogScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export function MainPager() {
  return (
    <Tab.Navigator
      initialRouteName="Camera"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#001F3F',
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
        tabBarActiveTintColor: '#34C759',
        tabBarInactiveTintColor: '#ccc',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Logs" component={LogScreen} />
      <Tab.Screen
        name="Camera"
        component={CaptureEngine}
        options={{
          tabBarStyle: { display: 'none' } // Hide tab bar on camera screen for full screen
        }}
      />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
