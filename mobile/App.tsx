import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StatusBar, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { colors } from './src/theme';
import { extractSurveySlug, type PublicSurvey } from './src/api';
import HomeScreen from './src/screens/HomeScreen';
import SurveyScreen from './src/screens/SurveyScreen';
import ThankYouScreen from './src/screens/ThankYouScreen';
import LoginScreen from './src/staff/screens/LoginScreen';
import StaffHomeScreen from './src/staff/screens/StaffHomeScreen';
import ShiftsScreen from './src/staff/screens/ShiftsScreen';
import TicketsScreen from './src/staff/screens/TicketsScreen';
import TicketDetailScreen from './src/staff/screens/TicketDetailScreen';
import type { StaffUser } from './src/staff/api';

/**
 * One mobile app, two personas (per the Phase 3 plan):
 *  - Guest mode (no token): customer survey flow (Home → Survey → Thank you).
 *  - Staff mode (token set): authenticated work screens (Login → Home → Shifts /
 *    Maintenance Tickets → Ticket detail).
 * Persona is chosen by presence of an in-memory JWT. The token lives only in
 * memory (no persistence library installed on SDK 52); reloading the app signs
 * the staff member out back to guest mode. expo-secure-store can be added later
 * for real persistence.
 *
 * Plain state-based navigation (deliberately dependency-free). Deep links
 * (omniops://s/<slug>) are handled with React Native's built-in Linking API in
 * guest mode.
 */
type GuestRoute =
  | { name: 'home' }
  | { name: 'survey'; slug: string }
  | { name: 'thankyou'; survey: PublicSurvey }
  | { name: 'staff-login' };

type StaffRoute =
  | { name: 'staff-home' }
  | { name: 'staff-shifts' }
  | { name: 'staff-tickets' }
  | { name: 'staff-ticket-detail'; ticketId: string };

export default function App() {
  const [guestRoute, setGuestRoute] = useState<GuestRoute>({ name: 'home' });
  const [staffRoute, setStaffRoute] = useState<StaffRoute>({ name: 'staff-home' });
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const isStaff = token !== null && user !== null;

  const openSlug = useCallback((slug: string) => {
    setGuestRoute({ name: 'survey', slug });
  }, []);

  const handleLoginSuccess = useCallback((u: StaffUser, accessToken: string) => {
    setUser(u);
    setToken(accessToken);
    setStaffRoute({ name: 'staff-home' });
  }, []);

  const handleSignOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setGuestRoute({ name: 'home' });
  }, []);

  useEffect(() => {
    if (isStaff) return; // Deep links are for guest survey taking only.
    Linking.getInitialURL()
      .then((url) => {
        if (url) openSlugFromUrl(url, openSlug);
      })
      .catch(() => {
        // Ignore — deep linking is best-effort.
      });

    const sub = Linking.addEventListener('url', ({ url }) => openSlugFromUrl(url, openSlug));
    return () => sub.remove();
  }, [openSlug, isStaff]);

  if (!fontsLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {isStaff ? (
        // ─── STAFF MODE (authenticated) ───
        <>
          {staffRoute.name === 'staff-home' && (
            <StaffHomeScreen
              user={user}
              onOpenShifts={() => setStaffRoute({ name: 'staff-shifts' })}
              onOpenTickets={() => setStaffRoute({ name: 'staff-tickets' })}
              onSignOut={handleSignOut}
            />
          )}
          {staffRoute.name === 'staff-shifts' && (
            <ShiftsScreen
              user={user}
              token={token}
              onBack={() => setStaffRoute({ name: 'staff-home' })}
            />
          )}
          {staffRoute.name === 'staff-tickets' && (
            <TicketsScreen
              user={user}
              token={token}
              onOpenTicket={(ticketId) => setStaffRoute({ name: 'staff-ticket-detail', ticketId })}
              onBack={() => setStaffRoute({ name: 'staff-home' })}
            />
          )}
          {staffRoute.name === 'staff-ticket-detail' && (
            <TicketDetailScreen
              user={user}
              token={token}
              ticketId={staffRoute.ticketId}
              onBack={() => setStaffRoute({ name: 'staff-tickets' })}
            />
          )}
        </>
      ) : (
        // ─── GUEST MODE (customer survey flow) ───
        <>
          {guestRoute.name === 'home' && (
            <HomeScreen onStartSurvey={openSlug} onStaffLogin={() => setGuestRoute({ name: 'staff-login' })} />
          )}
          {guestRoute.name === 'survey' && (
            <SurveyScreen
              key={guestRoute.slug}
              slug={guestRoute.slug}
              onBack={() => setGuestRoute({ name: 'home' })}
              onSubmitted={(survey) => setGuestRoute({ name: 'thankyou', survey })}
            />
          )}
          {guestRoute.name === 'thankyou' && (
            <ThankYouScreen
              surveyTitle={guestRoute.survey.title}
              siteName={guestRoute.survey.siteName}
              onDone={() => setGuestRoute({ name: 'home' })}
            />
          )}
          {guestRoute.name === 'staff-login' && (
            <LoginScreen onLoginSuccess={handleLoginSuccess} onBack={() => setGuestRoute({ name: 'home' })} />
          )}
        </>
      )}
    </View>
  );
}

function openSlugFromUrl(url: string, open: (slug: string) => void): void {
  const slug = extractSurveySlug(url);
  if (slug) open(slug);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
