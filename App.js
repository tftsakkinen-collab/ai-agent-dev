import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ProductDetail from './src/screens/ProductDetail';
import BookingScreen from './src/screens/BookingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import MapSearchScreen from './src/screens/MapSearchScreen';
import ProviderDetail from './src/screens/ProviderDetail';
import ReviewScreen from './src/screens/ReviewScreen';
import RenterReviewScreen from './src/screens/RenterReviewScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ProductDetail" component={ProductDetail} />
        <Stack.Screen name="ProviderDetail" component={ProviderDetail} />
        <Stack.Screen name="ReviewScreen" component={ReviewScreen} />
        <Stack.Screen name="RenterReview" component={RenterReviewScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="MapSearch" component={MapSearchScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
