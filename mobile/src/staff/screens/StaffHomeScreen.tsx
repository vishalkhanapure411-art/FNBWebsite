import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../../theme';
import { canViewShifts, canViewTickets, type StaffUser } from '../api';
import { formatRole } from '../format';

interface Props {
  user: StaffUser;
  onOpenShifts: () => void;
  onOpenTickets: () => void;
  onSignOut: () => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function StaffHomeScreen({ user, onOpenShifts, onOpenTickets, onSignOut }: Props) {
  const showShifts = canViewShifts(user.role);
  const showTickets = canViewTickets(user.role);
  const hasModules = showShifts || showTickets;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.firstName.charAt(0)}
              {user.lastName.charAt(0)}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.role}>{formatRole(user.role)}</Text>
          </View>
        </View>
      </View>

      {hasModules ? (
        <View style={styles.grid}>
          {showShifts ? (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={onOpenShifts}
            >
              <Text style={styles.cardIcon}>🕒</Text>
              <Text style={styles.cardTitle}>My Shifts</Text>
              <Text style={styles.cardBody}>See the shifts scheduled for your site.</Text>
              <Text style={styles.cardCta}>View shifts →</Text>
            </Pressable>
          ) : null}

          {showTickets ? (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={onOpenTickets}
            >
              <Text style={styles.cardIcon}>🔧</Text>
              <Text style={styles.cardTitle}>Maintenance Tickets</Text>
              <Text style={styles.cardBody}>Track and update maintenance work at your site.</Text>
              <Text style={styles.cardCta}>View tickets →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.noAccess}>
          <Text style={styles.noAccessEmoji}>🔒</Text>
          <Text style={styles.noAccessTitle}>No staff modules for this role</Text>
          <Text style={styles.noAccessBody}>
            Your account ({formatRole(user.role)}) doesn't have access to shifts or maintenance on
            this platform. Ask a brand manager to update your role.
          </Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        onPress={onSignOut}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      <Text style={styles.footer}>Signed in as {user.email}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.white,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  role: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
  grid: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardPressed: {
    backgroundColor: '#F3F4F6',
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  cardCta: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primary,
  },
  noAccess: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  noAccessEmoji: {
    fontSize: 34,
    marginBottom: spacing.sm,
  },
  noAccessTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  noAccessBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
  },
  signOut: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingVertical: 13,
    alignItems: 'center',
  },
  signOutPressed: {
    backgroundColor: colors.primarySoft,
  },
  signOutText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.danger,
  },
  footer: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
