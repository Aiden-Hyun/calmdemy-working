/**
 * ============================================================
 * features/mood/components/MoodPicker.tsx — 5-point mood selector
 * ============================================================
 *
 * A row of the five mood faces (low → high). The selected face is tinted with
 * its mood color. Presentational — selection state and handler are the parent's.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { MoodValue } from "../types";
import { moodVisuals, MOOD_ORDER } from "../data/moodVisuals";

interface MoodPickerProps {
  selected?: MoodValue;
  onSelect: (value: MoodValue) => void;
}

export function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      {MOOD_ORDER.map((value) => {
        const visual = moodVisuals[value];
        const isSelected = selected === value;
        return (
          <AnimatedPressable
            key={value}
            style={styles.item}
            onPress={() => onSelect(value)}
          >
            <View
              style={[
                styles.faceWrap,
                {
                  backgroundColor: isSelected ? `${visual.color}33` : theme.colors.surface,
                  borderColor: isSelected ? visual.color : theme.colors.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={visual.icon}
                size={30}
                color={visual.color}
              />
            </View>
            <Text
              style={[
                styles.label,
                isSelected && { color: visual.color, fontFamily: theme.fonts.ui.semiBold },
              ]}
            >
              {visual.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    item: {
      flex: 1,
      alignItems: "center",
      gap: 6,
    },
    faceWrap: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.full,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
    },
    label: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
  });
