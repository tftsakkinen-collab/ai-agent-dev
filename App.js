import React, { useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from './src/config';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ToastProvider } from './src/contexts/ToastContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import HomeScreen from './src/screens/HomeScreen';
import ProductDetail from './src/screens/ProductDetail';
import BookingScreen from './src/screens/BookingScreen';
import GroupBookingScreen from './src/screens/GroupBookingScreen';
import GuideArticleScreen from './src/screens/GuideArticleScreen';
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
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [
    'https://gearspot.xyz',
    'https://www.gearspot.xyz',
    'https://ai-agent-dev-eight.vercel.app',
    'http://localhost:3000',
    'http://localhost:19006'
  ],
  config: {
    screens: {
      Home: '',
      ProductDetail: 'lauta/:productId',
      ProviderDetail: 'tarjoaja/:providerId',
      Booking: 'varaa/:productId',
      GroupBooking: 'ryhmavaraus',
      GuideArticle: 'opas/:slug',
      Profile: 'profiili',
      MapSearch: 'noutopiste/:initialQuery?',
      BecomeHost: 'liity-isannaksi',
      Auth: 'kirjaudu',
      TermsOfService: 'kayttoehdot',
      PrivacyPolicy: 'tietosuoja',
      Chat: 'viestit',
      AdminOps: 'yllapito',
      TermsSafety: 'turvallisuusehdot',
      FeedbackReports: 'palaute-raportit',
      ReviewScreen: 'arvostelu',
      RenterReview: 'vuokraajan-arvostelu'
    }
  }
};

export default function App() {
  const navigationRef = useRef(null);
  const [routeName, setRouteName] = useState('Home');

  return (
    <AppErrorBoundary routeName={routeName}>
      <LanguageProvider>
        <ToastProvider>
          <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
            <NavigationContainer
              ref={navigationRef}
              linking={linking}
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
                <Stack.Screen name="GroupBooking" component={GroupBookingScreen} />
                <Stack.Screen name="GuideArticle" component={GuideArticleScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="FeedbackReports" component={FeedbackReportsScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="AdminOps" component={AdminOpsScreen} />
                <Stack.Screen name="BecomeHost" component={BecomeHostScreen} />
                <Stack.Screen name="TermsSafety" component={TermsSafetyScreen} />
                <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="MapSearch" component={MapSearchScreen} />
              </Stack.Navigator>
              <ReportIssueButton routeName={routeName} />
            </NavigationContainer>
          </StripeProvider>
        </ToastProvider>
      </LanguageProvider>
    </AppErrorBoundary>
  );
}
