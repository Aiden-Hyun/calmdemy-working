/**
 * ============================================================
 * features/routines/components/RoutineTimer.tsx — Focus timer (feat 13)
 * ============================================================
 *
 * Pick a duration, run a countdown; at zero the display turns red and counts
 * overtime (+MM:SS) until stopped. Self-contained around useCountdownTimer.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { useCountdownTimer } from "../hooks/useCountdownTimer";

const ACCENT = "#8FA98C";
const OVERTIME = "#D08A8A";
const PRESETS = [5, 10, 15, 25];

function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "+" : "";
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

interface RoutineTimerProps {
  label?: string;
  defaultMinutes?: number;
}

export function RoutineTimer({ label, defaultMinutes = 15 }: RoutineTimerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const timer = useCountdownTimer(defaultMinutes * 60);

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.presets}>
        {PRESETS.map((min) => {
          const active = timer.duration === min * 60;
          return (
            <AnimatedPressable
              key={min}
              style={[styles.preset, active && styles.presetActive]}
              onPress={() => timer.reset(min * 60)}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>{min}m</Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <Text style={[styles.clock, timer.isOvertime && styles.clockOvertime]}>
        {formatClock(timer.remaining)}
      </Text>
      {timer.isOvertime && <Text style={styles.overtimeNote}>Overtime</Text>}

      <View style={styles.controls}>
        <AnimatedPressable style={styles.secondaryBtn} onPress={() => timer.reset()}>
          <Ionicons name="refresh" size={22} color={theme.colors.textSecondary} />
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.playBtn}
          onPress={() => (timer.running ? timer.pause() : timer.start())}
        >
          <Ionicons
            name={timer.running ? "pause" : "play"}
            size={30}
            color={theme.colors.surface}
          />
        </AnimatedPressable>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      gap: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
    },
    label: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
      textAlign: "center",
    },
    presets: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    preset: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    presetActive: {
      backgroundColor: `${ACCENT}22`,
      borderColor: ACCENT,
    },
    presetText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    presetTextActive: {
      fontFamily: theme.fonts.ui.semiBold,
      color: ACCENT,
    },
    clock: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 64,
      color: theme.colors.text,
    },
    clockOvertime: {
      color: OVERTIME,
    },
    overtimeNote: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: OVERTIME,
      marginTop: -theme.spacing.md,
    },
    controls: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xl,
    },
    secondaryBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    playBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: ACCENT,
    },
  });
