import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ProductDetail from './src/screens/ProductDetail';
import BookingScreen from './src/screens/BookingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Gearspot' }} />
        <Stack.Screen name="ProductDetail" component={ProductDetail} options={{ title: 'Tuote' }} />
        <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Varaus' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profiili' }} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Kirjaudu' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
