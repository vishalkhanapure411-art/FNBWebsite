import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { extractSurveySlug } from '../api';

interface Props {
  onStartSurvey: (slug: string) => void;
  /** Optional — when set, renders a "Staff login" link under the footer. */
  onStaffLogin?: () => void;
}

export default function HomeScreen({ onStartSurvey, onStaffLogin }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    const slug = extractSurveySlug(input);
    if (!slug) {
      setError(
        "We couldn't find a survey code in that. Try the code printed on your receipt, e.g. sv-msj7wp4k-3eaf43",
      );
      return;
    }
    setError(null);
    onStartSurvey(slug);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>O</Text>
          </View>
          <Text style={styles.brand}>OmniOps</Text>
          <Text style={styles.tagline}>Tell us about your visit</Text>
          <Text style={styles.subtitle}>
            Your feedback helps us make every visit better. It takes less than a minute.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Survey code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your survey code or link"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={input}
            onChangeText={(t) => {
              setInput(t);
              setError(null);
            }}
            onSubmitEditing={handleStart}
            returnKeyType="go"
          />
          <Text style={styles.hint}>
            Tip: on your receipt or table QR code you'll find a code that starts with "sv-". You can
            also paste the full link.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleStart}
          >
            <Text style={styles.buttonText}>Start survey</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Powered by OmniOps</Text>
        {onStaffLogin ? (
          <Pressable onPress={onStaffLogin} hitSlop={12} style={styles.staffLink}>
            <Text style={styles.staffLinkText}>Staff login</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontFamily: fonts.bold,
    fontSize: 34,
    color: colors.white,
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
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
    marginTop: spacing.xl,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  staffLink: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  staffLinkText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
  },
});
