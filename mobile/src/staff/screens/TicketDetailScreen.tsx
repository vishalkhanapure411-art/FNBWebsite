import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../../theme';
import { ApiRequestError } from '../../api';
import { fetchTicket, updateTicketStatus, type StaffUser, type Ticket } from '../api';
import { formatDateTime, getTransitionActions, timeAgo, TRANSITION_LABEL } from '../format';
import { StatusBadge } from '../components/Badge';
import { ErrorState, LoadingState } from '../components/ScreenState';

interface Props {
  user: StaffUser;
  token: string;
  ticketId: string;
  onBack: () => void;
}

export default function TicketDetailScreen({ user, token, ticketId, onBack }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchTicket(token, ticketId);
      setTicket(data);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 403) {
        setError('You don’t have permission to view this ticket (your role is not allowed).');
      } else if (e instanceof ApiRequestError) {
        setError(e.message);
      } else {
        setError('Could not reach the server.');
      }
    }
  }, [token, ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTransition = async (status: string) => {
    setActionError(null);
    setPendingStatus(status);
    try {
      await updateTicketStatus(token, ticketId, status);
      // Refresh to show the new status (server is the source of truth).
      await load();
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 403) {
        setActionError('No permission to update this ticket.');
      } else if (e instanceof ApiRequestError) {
        setActionError(e.message);
      } else {
        setActionError('Update failed. Try again.');
      }
    } finally {
      setPendingStatus(null);
    }
  };

  if (error) {
    return (
      <View style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Ticket</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <ErrorState message={error} onRetry={() => void load()} />
      </View>
    );
  }

  if (ticket === null) {
    return (
      <View style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Ticket</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <LoadingState label="Loading ticket…" />
      </View>
    );
  }

  const actions = getTransitionActions(ticket.status);
  const isClosed = ticket.status === 'CLOSED';

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Ticket</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.titleMain}>
              <Text style={styles.title}>{ticket.title}</Text>
              <Text style={styles.category}>{ticket.category ?? 'General'}</Text>
            </View>
            <View style={styles.badges}>
              <StatusBadge status={ticket.status} />
              <StatusBadge status={ticket.priority} kind="priority" />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{ticket.description || 'No description provided.'}</Text>

          <Text style={styles.sectionLabel}>Details</Text>
          <InfoRow label="Reported" value={ticket.reportedBy ? `${ticket.reportedBy.firstName} ${ticket.reportedBy.lastName}` : '—'} />
          <InfoRow label="Assigned to" value={ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'} />
          <InfoRow label="Asset" value={ticket.asset?.name ?? '—'} />
          <InfoRow label="Created" value={formatDateTime(ticket.createdAt)} />
          <InfoRow label="SLA due" value={formatDateTime(ticket.slaDueAt)} />
          {ticket.resolvedAt ? <InfoRow label="Resolved" value={formatDateTime(ticket.resolvedAt)} /> : null}
          {ticket.closedAt ? <InfoRow label="Closed" value={formatDateTime(ticket.closedAt)} /> : null}
        </View>

        {ticket.comments && ticket.comments.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Comments ({ticket.comments.length})</Text>
            {ticket.comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <Text style={styles.commentText}>{c.content}</Text>
                <Text style={styles.commentMeta}>
                  {c.user ? `${c.user.firstName} ${c.user.lastName}` : 'Unknown'} · {timeAgo(c.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            {isClosed ? 'Ticket closed' : actions.length > 0 ? 'Update status' : 'No further actions'}
          </Text>
          {isClosed ? (
            <Text style={styles.closedNote}>This ticket is closed and can no longer be changed.</Text>
          ) : (
            <>
              {actions.map((status) => (
                <Pressable
                  key={status}
                  style={({ pressed }) => [
                    styles.actionButton,
                    status === 'CLOSED' && styles.actionButtonSecondary,
                    pressed && styles.actionButtonPressed,
                    pendingStatus !== null && styles.actionButtonDisabled,
                  ]}
                  disabled={pendingStatus !== null}
                  onPress={() => void handleTransition(status)}
                >
                  {pendingStatus === status ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={[styles.actionButtonText, status === 'CLOSED' && styles.actionButtonTextSecondary]}>
                      {TRANSITION_LABEL[status] ?? status.replace(/_/g, ' ')}
                    </Text>
                  )}
                </Pressable>
              ))}
            </>
          )}
          {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    marginBottom: 2,
  },
  category: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  infoLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  infoValue: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  comment: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  commentText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  commentMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.white,
  },
  actionButtonTextSecondary: {
    color: colors.text,
  },
  actionError: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  closedNote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
});
