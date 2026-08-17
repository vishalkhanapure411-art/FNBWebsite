import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../../theme';
import { SHIFT_STATUS_LABEL, TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL } from '../format';

/** Small colored pill for a ticket status / priority / shift status. */
export function StatusBadge({ status, kind = 'status' }: { status: string; kind?: 'status' | 'priority' | 'shift' }) {
  const palette =
    kind === 'priority'
      ? priorityPalette(status)
      : kind === 'shift'
        ? shiftPalette(status)
        : statusPalette(status);

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.text, { color: palette.fg }]}>
        {kind === 'priority'
          ? TICKET_PRIORITY_LABEL[status] ?? status
          : kind === 'shift'
            ? SHIFT_STATUS_LABEL[status] ?? status
            : TICKET_STATUS_LABEL[status] ?? status}
      </Text>
    </View>
  );
}

function statusPalette(status: string) {
  switch (status) {
    case 'OPEN':
      return { bg: '#FFF4E5', fg: '#B45F06', border: '#F5C518' };
    case 'ASSIGNED':
      return { bg: '#E8F0FE', fg: '#1A56DB', border: '#A7C7F7' };
    case 'IN_PROGRESS':
      return { bg: colors.primarySoft, fg: colors.primaryDark, border: '#F5B7B1' };
    case 'ON_HOLD':
      return { bg: '#F3F4F6', fg: '#4B5563', border: '#D1D5DB' };
    case 'RESOLVED':
    case 'CLOSED':
      return { bg: colors.successSoft, fg: colors.success, border: '#A5D6B8' };
    default:
      return { bg: '#F3F4F6', fg: '#4B5563', border: '#D1D5DB' };
  }
}

function priorityPalette(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return { bg: '#FDECEA', fg: '#B71C1C', border: '#F5B7B1' };
    case 'HIGH':
      return { bg: '#FFF4E5', fg: '#B45F06', border: '#F5C518' };
    case 'MEDIUM':
      return { bg: '#E8F0FE', fg: '#1A56DB', border: '#A7C7F7' };
    case 'LOW':
      return { bg: colors.successSoft, fg: colors.success, border: '#A5D6B8' };
    default:
      return { bg: '#F3F4F6', fg: '#4B5563', border: '#D1D5DB' };
  }
}

function shiftPalette(status: string) {
  switch (status) {
    case 'OPEN':
      return { bg: colors.successSoft, fg: colors.success, border: '#A5D6B8' };
    case 'CLOSING':
      return { bg: '#FFF4E5', fg: '#B45F06', border: '#F5C518' };
    case 'CLOSED':
      return { bg: '#F3F4F6', fg: '#4B5563', border: '#D1D5DB' };
    default:
      return { bg: '#F3F4F6', fg: '#4B5563', border: '#D1D5DB' };
  }
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
