import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../../theme';
import { ApiRequestError } from '../../api';
import { fetchTickets, type StaffUser, type Ticket } from '../api';
import { timeAgo } from '../format';
import { StatusBadge } from '../components/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';

interface Props {
  user: StaffUser;
  token: string;
  onOpenTicket: (id: string) => void;
  onBack: () => void;
}

export default function TicketsScreen({ user, token, onOpenTicket, onBack }: Props) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      setError(null);
      try {
        const data = await fetchTickets(token, user.siteId);
        setTickets(data);
      } catch (e) {
        if (e instanceof ApiRequestError && e.status === 403) {
          setError('You don’t have permission to view maintenance tickets (your role is not allowed).');
        } else if (e instanceof ApiRequestError) {
          setError(e.message);
        } else {
          setError('Could not reach the server. Pull down to retry.');
        }
      } finally {
        if (asRefresh) setRefreshing(false);
      }
    },
    [token, user.siteId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Maintenance Tickets</Text>
        <View style={styles.topBarSpacer} />
      </View>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : tickets === null ? (
        <LoadingState label="Loading tickets…" />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon="🔧"
          title="No tickets"
          body="There are no maintenance tickets for your site. Nice and quiet!"
        />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.primary}
            />
          }
        >
          {tickets.map((ticket) => (
            <Pressable
              key={ticket.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => onOpenTicket(ticket.id)}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardMain}>
                  <Text style={styles.title}>{ticket.title}</Text>
                  <Text style={styles.meta}>
                    {ticket.category ?? 'General'} · {timeAgo(ticket.createdAt)}
                  </Text>
                </View>
                <View style={styles.badges}>
                  <StatusBadge status={ticket.status} />
                  <StatusBadge status={ticket.priority} kind="priority" />
                </View>
              </View>
              <Text style={styles.cta}>View & update →</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 6,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  topBarTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  topBarSpacer: {
    width: 52,
  },
  back: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.primary,
    width: 52,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardPressed: {
    backgroundColor: '#F3F4F6',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    marginBottom: 3,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cta: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
    marginTop: spacing.sm,
  },
});
