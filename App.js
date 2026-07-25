import React, { useRef, useState } from 'react';
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
import AppErrorBoundary from './src/components/AppErrorBoundary';
import ReportIssueButton from './src/components/ReportIssueButton';
import FeedbackReportsScreen from './src/screens/FeedbackReportsScreen';
import AdminOpsScreen from './src/screens/AdminOpsScreen';
import BecomeHostScreen from './src/screens/BecomeHostScreen';
import TermsSafetyScreen from './src/screens/TermsSafetyScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef(null);
  const [routeName, setRouteName] = useState('Home');

  return (
    <AppErrorBoundary routeName={routeName}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => setRouteName(navigationRef.current?.getCurrentRoute()?.name || 'Home')}
        onStateChange={() => setRouteName(navigationRef.current?.getCurrentRoute()?.name || 'Home')}
      >
        <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetail} />
          <Stack.Screen name="ProviderDetail" component={ProviderDetail} />
          <Stack.Screen name="ReviewScreen" component={ReviewScreen} />
          <Stack.Screen name="RenterReview" component={RenterReviewScreen} />
          <Stack.Screen name="Booking" component={BookingScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="FeedbackReports" component={FeedbackReportsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="AdminOps" component={AdminOpsScreen} />
          <Stack.Screen name="BecomeHost" component={BecomeHostScreen} />
          <Stack.Screen name="TermsSafety" component={TermsSafetyScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="MapSearch" component={MapSearchScreen} />
        </Stack.Navigator>
        <ReportIssueButton routeName={routeName} />
      </NavigationContainer>
    </AppErrorBoundary>
  );
}
