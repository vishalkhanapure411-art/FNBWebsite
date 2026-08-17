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
import { fetchShifts, type Shift, type StaffUser } from '../api';
import { formatDate, formatTime, SHIFT_STATUS_LABEL } from '../format';
import { StatusBadge } from '../components/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/ScreenState';

interface Props {
  user: StaffUser;
  token: string;
  onBack: () => void;
}

export default function ShiftsScreen({ user, token, onBack }: Props) {
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      setError(null);
      try {
        const data = await fetchShifts(token, user.siteId);
        setShifts(data);
      } catch (e) {
        if (e instanceof ApiRequestError && e.status === 403) {
          setError('You don’t have permission to view shifts (your role is not allowed).');
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
        <Text style={styles.topBarTitle}>My Shifts</Text>
        <View style={styles.topBarSpacer} />
      </View>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : shifts === null ? (
        <LoadingState label="Loading shifts…" />
      ) : shifts.length === 0 ? (
        <EmptyState
          icon="🕒"
          title="No shifts yet"
          body="There are no shifts scheduled for your site. Check back later."
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
          {shifts.map((shift) => (
            <View key={shift.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardMain}>
                  <Text style={styles.shiftName}>{shift.name || 'Shift'}</Text>
                  <Text style={styles.shiftSite}>{shift.site?.name ?? 'Your site'}</Text>
                </View>
                <StatusBadge status={shift.status} kind="shift" />
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {formatDate(shift.startTime)} · {formatTime(shift.startTime)}
                  {shift.endTime ? ` – ${formatTime(shift.endTime)}` : ' – now'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Status</Text>
                <Text style={styles.metaValue}>{SHIFT_STATUS_LABEL[shift.status] ?? shift.status}</Text>
                {shift.openedBy ? (
                  <>
                    <Text style={styles.metaLabel}>Opened by</Text>
                    <Text style={styles.metaValue}>
                      {shift.openedBy.firstName} {shift.openedBy.lastName}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  shiftName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  shiftSite: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },
  metaLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginRight: spacing.xs,
  },
  metaValue: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    marginRight: spacing.md,
  },
});
