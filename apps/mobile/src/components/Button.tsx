import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  Colors,
  InvertedColors,
  SemanticColors,
  Spacing,
  BorderRadii,
  Typography,
} from '../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Set on a dark ground, where black-on-white is backwards. See below. */
  inverted?: boolean;
  style?: ViewStyle;
}

/** The chrome token pair a button draws itself from. Only polarity changes between them. */
type Palette = typeof Colors | typeof InvertedColors;

/**
 * The four actions Volume One draws.
 *
 * `primary` is the only pill on a screen — that's the radius rule from
 * `packages/design/README.md`, and it's what makes "Save Discovery" or "Grant permission"
 * unmistakable without needing a colour the system doesn't have. Everything secondary is
 * rectangular or plain text.
 *
 * `inverted` swaps `Colors` for `InvertedColors` rather than taking a colour, because a
 * button needs two values that have to agree — pill and label — and passing a background
 * through `style` leaves the label black on black. Same shape as `ConfidenceBar`'s `tone`
 * prop: the polarity is one decision, made once, from the token pair.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  inverted = false,
  style,
}: ButtonProps) {
  const theme = inverted ? invertedTheme : defaultTheme;

  return (
    <TouchableOpacity
      style={[styles.base, theme.container[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      activeOpacity={0.75}
    >
      <Text style={[styles.label, theme.label[variant]]}>{title}</Text>
    </TouchableOpacity>
  );
}

/**
 * Both polarities from one description, so a change to the pill's height or radius cannot
 * land on the light ground and miss the dark one.
 *
 * `destructive` keeps `SemanticColors.danger` in both: it is the one colour in the system
 * that does not flip with polarity, because it isn't chrome.
 */
function theme(c: Palette) {
  return {
    container: StyleSheet.create({
      primary: {
        height: 54,
        borderRadius: BorderRadii.pill,
        backgroundColor: c.fg,
      },
      secondary: {
        height: 54,
        borderRadius: BorderRadii.pill,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.fg,
      },
      // No chrome at all — "Try another" under the primary pill, "Delete find" under a panel.
      quiet: {
        paddingVertical: Spacing.m,
      },
      destructive: {
        paddingVertical: Spacing.m,
      },
    }),
    label: StyleSheet.create({
      primary: { color: c.bg },
      secondary: { color: c.fg },
      quiet: { ...Typography.small, color: c.muted },
      destructive: { ...Typography.small, color: SemanticColors.danger },
    }),
  };
}

const defaultTheme = theme(Colors);
const invertedTheme = theme(InvertedColors);

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    ...Typography.button,
    textAlign: 'center',
  },
});
