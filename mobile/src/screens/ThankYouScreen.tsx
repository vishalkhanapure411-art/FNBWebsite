import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';

interface Props {
  surveyTitle: string;
  siteName: string;
  onDone: () => void;
}

export default function ThankYouScreen({ surveyTitle, siteName, onDone }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkMark}>✓</Text>
      </View>
      <Text style={styles.title}>Thank you!</Text>
      <Text style={styles.subtitle}>
        Your response to <Text style={styles.strong}>{surveyTitle}</Text> at {siteName} has been
        received. We appreciate your feedback — it helps us serve you better.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onDone}
      >
        <Text style={styles.buttonText}>Done</Text>
      </Pressable>
      <Text style={styles.footer}>Powered by OmniOps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  checkMark: {
    fontFamily: fonts.bold,
    fontSize: 44,
    color: colors.success,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  strong: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 56,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.white,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
