/**
 * ============================================================
 * features/cbt/components/StepFlow.tsx — Guided multi-step flow
 * ============================================================
 *
 * The shared harness for the four guided CBT methods. Renders one step per
 * screen (text / slider / distortion-select) with a progress indicator, a Back
 * button (which pops the route on the first step), and a Next/Save button.
 *
 * Entered values live in local state, so moving Back and forward preserves
 * them; nothing is persisted until the final Save (no partial writes, v1).
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { CbtFlowStep } from "../types";
import { Slider } from "./Slider";
import { DistortionChip } from "./DistortionChip";

const DISTORTION_DELIMITER = " • ";
const SLIDER_DEFAULT = 5;

interface StepFlowProps {
  headerTitle: string;
  accent: string;
  steps: CbtFlowStep[];
  saving: boolean;
  onSave: (values: Record<string, string>) => void;
}

export function StepFlow({ headerTitle, accent, steps, saving, onSave }: StepFlowProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Seed slider steps with a default so they're saved even if untouched.
    const init: Record<string, string> = {};
    steps.forEach((s) => {
      if (s.input === "slider") init[s.key] = String(SLIDER_DEFAULT);
    });
    return init;
  });

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleBack = () => {
    if (index > 0) setIndex((i) => i - 1);
    else router.back();
  };

  const handlePrimary = () => {
    if (saving) return;
    if (isLast) onSave(values);
    else setIndex((i) => i + 1);
  };

  const selectedDistortions = step.input === "distortions"
    ? new Set(values[step.key] ? values[step.key].split(DISTORTION_DELIMITER) : [])
    : new Set<string>();

  const toggleDistortion = (label: string) => {
    const next = new Set(selectedDistortions);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setValue(step.key, Array.from(next).join(DISTORTION_DELIMITER));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.progressRow}>
        {steps.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.progressDot,
              { backgroundColor: i <= index ? accent : theme.colors.border },
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepCount}>
            Step {index + 1} of {steps.length}
          </Text>
          <Text style={styles.stepTitle}>{step.title}</Text>
          {step.subtitle && <Text style={styles.stepSubtitle}>{step.subtitle}</Text>}

          {step.input === "text" && (
            <TextInput
              key={`text-${step.key}`}
              style={styles.input}
              placeholder={step.placeholder}
              placeholderTextColor={theme.colors.textMuted}
              value={values[step.key] ?? ""}
              onChangeText={(t) => setValue(step.key, t)}
              multiline
              autoFocus
              textAlignVertical="top"
            />
          )}

          {step.input === "slider" && (
            <Slider
              value={Number(values[step.key] ?? SLIDER_DEFAULT)}
              onChange={(n) => setValue(step.key, String(n))}
              accent={accent}
            />
          )}

          {step.input === "distortions" &&
            (step.options ?? []).map((option) => (
              <DistortionChip
                key={option.id}
                label={option.label}
                description={option.description}
                selected={selectedDistortions.has(option.label)}
                accent={accent}
                onPress={() => toggleDistortion(option.label)}
              />
            ))}
        </ScrollView>

        <View style={styles.footer}>
          <AnimatedPressable
            style={[styles.primaryBtn, { backgroundColor: accent }, saving && styles.btnDisabled]}
            onPress={handlePrimary}
            disabled={saving}
          >
            <Text style={styles.primaryBtnText}>
              {isLast ? (saving ? "Saving…" : "Save") : "Next"}
            </Text>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    progressRow: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    progressDot: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    body: {
      flex: 1,
    },
    scroll: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    stepCount: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 12,
      color: theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    stepTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 22,
      lineHeight: 30,
      color: theme.colors.text,
      marginTop: theme.spacing.xs,
    },
    stepSubtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
    input: {
      minHeight: 140,
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontFamily: theme.fonts.body.regular,
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
    },
    primaryBtn: {
      paddingVertical: 14,
      borderRadius: theme.borderRadius.xl,
      alignItems: "center",
    },
    btnDisabled: {
      opacity: 0.6,
    },
    primaryBtnText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.surface,
    },
  });
