import { Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme/tokens';

interface FieldErrorProps {
  /** The copy to show, or null/undefined when the field is fine. */
  message?: string | null;
}

/**
 * One line under a field, in ink.
 *
 * Not `SemanticColors.danger`. The system reserves hue for status pills, annotation boxes
 * and prediction overlays (`docs/DESIGN.md` §6), and a wrong email address is none of
 * those — it is the page telling you what it needs. The landing page already renders its
 * waitlist errors in `#000000` for the same reason, so this matches a surface that
 * shipped rather than inventing a second convention.
 *
 * A banner would be the wrong instrument here too: banners are for conditions of the world
 * (offline, rate-limited) and live at the top of a screen, away from the field that caused
 * them. Network failures still go through `pushBanner`.
 */
export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <Text style={styles.text} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...Typography.small,
    color: Colors.fg,
    marginTop: Spacing.m - Spacing.hairline,
  },
});
