import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SurveyQuestionType } from '@omniops/shared';
import { colors, fonts, radius, spacing } from '../theme';
import type { SubmitAnswer, SurveyOption, SurveyQuestion } from '../api';

const NPS_LABELS: Record<number, string> = {
  0: 'Detractor',
  1: 'Detractor',
  2: 'Detractor',
  3: 'Detractor',
  4: 'Detractor',
  5: 'Detractor',
  6: 'Detractor',
  7: 'Passive',
  8: 'Passive',
  9: 'Promoter',
  10: 'Promoter',
};

const CSAT_LABELS = ['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'];

interface Props {
  question: SurveyQuestion;
  value?: SubmitAnswer;
  onChange: (answer: SubmitAnswer) => void;
}

export default function QuestionCard({ question, value, onChange }: Props) {
  const rating = value?.ratingValue;
  const text = value?.answerText ?? '';
  const choices = value?.choiceValues ?? [];

  const setRating = (n: number) => onChange({ questionId: question.id, ratingValue: n });
  const setText = (t: string) => onChange({ questionId: question.id, answerText: t });
  const setSingle = (optionValue: string) =>
    onChange({ questionId: question.id, choiceValues: [optionValue] });
  const toggleMultiple = (optionValue: string) => {
    const next = choices.includes(optionValue)
      ? choices.filter((c) => c !== optionValue)
      : [...choices, optionValue];
    onChange({ questionId: question.id, choiceValues: next });
  };

  return (
    <View style={styles.card}>
      <View style={styles.promptRow}>
        <Text style={styles.prompt}>{question.prompt}</Text>
        {question.required ? (
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>Required</Text>
          </View>
        ) : null}
      </View>

      {question.type === SurveyQuestionType.NPS && (
        <NpsScale selected={rating} onSelect={setRating} />
      )}
      {question.type === SurveyQuestionType.STAR_RATING && (
        <StarRating selected={rating} onSelect={setRating} />
      )}
      {question.type === SurveyQuestionType.CSAT && (
        <CsatScale selected={rating} onSelect={setRating} />
      )}
      {question.type === SurveyQuestionType.TEXT && (
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          placeholder="Type your answer…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
        />
      )}
      {question.type === SurveyQuestionType.SINGLE_CHOICE && (
        <ChoiceList
          options={question.options}
          selected={choices}
          multi={false}
          onToggle={setSingle}
        />
      )}
      {question.type === SurveyQuestionType.MULTIPLE_CHOICE && (
        <ChoiceList
          options={question.options}
          selected={choices}
          multi
          onToggle={toggleMultiple}
        />
      )}
    </View>
  );
}

// ─── NPS: 0–10 scale ───
function NpsScale({ selected, onSelect }: { selected?: number; onSelect: (n: number) => void }) {
  return (
    <View>
      <View style={styles.scaleRow}>
        {Array.from({ length: 11 }, (_, i) => i).map((n) => {
          const active = selected === n;
          return (
            <Pressable
              key={n}
              onPress={() => onSelect(n)}
              style={[styles.scaleButton, active && styles.scaleButtonActive]}
            >
              <Text style={[styles.scaleButtonText, active && styles.scaleButtonTextActive]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.scaleLegendRow}>
        <Text style={styles.scaleLegend}>0 — Not likely</Text>
        <Text style={styles.scaleLegend}>10 — Extremely likely</Text>
      </View>
      {selected !== undefined && (
        <Text style={styles.scaleHint}>You picked {selected} · {NPS_LABELS[selected]}</Text>
      )}
    </View>
  );
}

// ─── STAR_RATING: 1–5 stars ───
function StarRating({ selected, onSelect }: { selected?: number; onSelect: (n: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (selected ?? 0) >= n;
        return (
          <Pressable key={n} onPress={() => onSelect(n)} hitSlop={8} style={styles.starButton}>
            <Text style={[styles.star, active ? styles.starActive : styles.starInactive]}>★</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── CSAT: 1–5 labelled buttons ───
function CsatScale({ selected, onSelect }: { selected?: number; onSelect: (n: number) => void }) {
  return (
    <View>
      <View style={styles.csatRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = selected === n;
          return (
            <Pressable
              key={n}
              onPress={() => onSelect(n)}
              style={[styles.csatButton, active && styles.csatButtonActive]}
            >
              <Text style={[styles.csatButtonText, active && styles.csatButtonTextActive]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.csatLabelRow}>
        {CSAT_LABELS.map((label) => (
          <Text key={label} style={styles.csatLabel} numberOfLines={2}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Choice list (radio / checkbox) ───
function ChoiceList({
  options,
  selected,
  multi,
  onToggle,
}: {
  options: SurveyOption[];
  selected: string[];
  multi: boolean;
  onToggle: (optionValue: string) => void;
}) {
  return (
    <View style={styles.choiceList}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.id}
            onPress={() => onToggle(option.value)}
            style={[styles.choiceRow, active && styles.choiceRowActive]}
          >
            <View style={[styles.choiceIndicator, active && styles.choiceIndicatorActive]}>
              {active && <View style={styles.choiceIndicatorDot} />}
            </View>
            <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>
              {option.label}
            </Text>
            {multi && active && <Text style={styles.choiceCheck}>✓</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  prompt: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  requiredBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  requiredText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.primary,
  },
  // NPS
  scaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scaleButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scaleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scaleButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  scaleButtonTextActive: {
    color: colors.white,
  },
  scaleLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  scaleLegend: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  scaleHint: {
    marginTop: spacing.sm,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
  // Stars
  starRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  starButton: {
    padding: spacing.xs,
  },
  star: {
    fontSize: 38,
    lineHeight: 44,
  },
  starActive: {
    color: colors.star,
  },
  starInactive: {
    color: colors.border,
  },
  // CSAT
  csatRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  csatButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  csatButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  csatButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
  },
  csatButtonTextActive: {
    color: colors.white,
  },
  csatLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  csatLabel: {
    width: 52,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Text
  textInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
  // Choice list
  choiceList: {
    gap: spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  choiceRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  choiceIndicatorActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  choiceIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  choiceLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  choiceLabelActive: {
    fontFamily: fonts.semibold,
    color: colors.primaryDark,
  },
  choiceCheck: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.primary,
  },
});
