import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import {
  ApiRequestError,
  fetchPublicSurvey,
  submitSurveyResponse,
  type PublicSurvey,
  type SubmitAnswer,
} from '../api';
import QuestionCard from '../components/QuestionCard';

interface Props {
  slug: string;
  onBack: () => void;
  onSubmitted: (survey: PublicSurvey) => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; survey: PublicSurvey };

export default function SurveyScreen({ slug, onBack, onSubmitted }: Props) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [answers, setAnswers] = useState<Record<string, SubmitAnswer>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    setAnswers({});
    setSubmitError(null);
    fetchPublicSurvey(slug)
      .then((survey) => {
        if (!cancelled) setLoad({ status: 'ready', survey });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoad({ status: 'error', message: friendlyLoadError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const missingRequired = useMemo(() => {
    if (load.status !== 'ready') return 0;
    return load.survey.questions.filter(
      (q) => q.required && !isAnswered(answers[q.id]),
    ).length;
  }, [load, answers]);

  const handleChange = useCallback((answer: SubmitAnswer) => {
    setAnswers((prev) => ({ ...prev, [answer.questionId]: answer }));
    setSubmitError(null);
  }, []);

  const handleSubmit = async () => {
    if (load.status !== 'ready' || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitSurveyResponse(
        slug,
        load.survey.questions
          .filter((q) => answers[q.id])
          .map((q) => answers[q.id] as SubmitAnswer),
      );
      onSubmitted(load.survey);
    } catch (err) {
      setSubmitError(friendlySubmitError(err));
      setSubmitting(false);
    }
  };

  if (load.status === 'loading') {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.centerText}>Loading survey…</Text>
      </View>
    );
  }

  if (load.status === 'error') {
    return (
      <View style={[styles.flex, styles.center, styles.errorContainer]}>
        <Text style={styles.errorTitle}>Survey unavailable</Text>
        <Text style={styles.errorBody}>{load.message}</Text>
        <Pressable style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  const { survey } = load;

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
        <View style={styles.header}>
          <Text style={styles.siteName}>{survey.siteName}</Text>
          <Text style={styles.title}>{survey.title}</Text>
          <Text style={styles.subtitle}>
            {survey.questions.length} question{survey.questions.length === 1 ? '' : 's'} · Thank
            you for your feedback
          </Text>
        </View>

        {survey.questions.map((q) => (
          <QuestionCard key={q.id} question={q} value={answers[q.id]} onChange={handleChange} />
        ))}

        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (missingRequired > 0 || submitting) && styles.buttonDisabled,
            pressed && !submitting && missingRequired === 0 && styles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={missingRequired > 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>
              {missingRequired > 0
                ? `Answer ${missingRequired} required question${missingRequired === 1 ? '' : 's'} to submit`
                : 'Submit survey'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function isAnswered(answer: SubmitAnswer | undefined): boolean {
  if (!answer) return false;
  if (answer.ratingValue !== undefined) return true;
  if (answer.answerText !== undefined) return answer.answerText.trim().length > 0;
  if (answer.choiceValues !== undefined) return answer.choiceValues.length > 0;
  return false;
}

function friendlyLoadError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 404) {
      return "We couldn't find that survey. Double-check the code on your receipt or QR code and try again.";
    }
    if (err.status === 400) {
      return err.message || 'This survey is not currently accepting responses.';
    }
    return err.message || 'Something went wrong loading this survey.';
  }
  return 'We couldn\u2019t reach the survey service. Check your connection and try again.';
}

function friendlySubmitError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    return err.message || 'We couldn\u2019t submit your answers. Please try again.';
  }
  return 'We couldn\u2019t submit your answers. Check your connection and try again.';
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  centerText: {
    marginTop: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorContainer: {
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  errorBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    marginBottom: spacing.lg,
  },
  siteName: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  buttonDisabled: {
    backgroundColor: '#E8A1A7',
  },
  buttonText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.white,
  },
});
