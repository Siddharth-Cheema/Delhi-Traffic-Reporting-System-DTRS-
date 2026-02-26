import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthScreen } from '../screens/AuthScreen';
import { MainPager } from './MainPager';
import { ReviewScreen } from '../screens/ReviewScreen';
import { RecordingScreen } from '../screens/RecordingScreen';

const Stack = createStackNavigator();

export function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="MainApp" component={MainPager} />
      <Stack.Screen name="Review" component={ReviewScreen} />
      <Stack.Screen name="Recording" component={RecordingScreen} />
    </Stack.Navigator>
  );
}
