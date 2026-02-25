import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthScreen } from '../screens/AuthScreen';
import { MainPager } from './MainPager';

const Stack = createStackNavigator();

export function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="MainApp" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="MainApp" component={MainPager} />
    </Stack.Navigator>
  );
}
