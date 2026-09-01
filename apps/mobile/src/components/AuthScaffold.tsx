import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme/tokens';
import { Display } from '../theme/type';
import { OwlMark } from './OwlMark';
import { ArrowLeftIcon } from './icons';
import { BannerStack } from './BannerStack';

interface AuthScaffoldProps {
  onBack: () => void;
  eyebrow: string;
  title: string;
  /** A node rather than a string — Screen 21 puts the address in ink inside its sentence. */
  subtitle?: ReactNode;
  /** The form. */
  children: ReactNode;
  /** Actions, pinned to the bottom on a tall screen and pushed down on a short one. */
  footer: ReactNode;
}

/**
 * The paper half of the sign-in flow — Screens 20 and 21.
 *
 * They are the same page with a different field in the middle, so the furniture lives here:
 * the back affordance, the mark, the type hierarchy, and the keyboard behaviour. These are
 * the first screens in the app with a text input, so this is also where that behaviour gets
 * decided once instead of twice.
 *
 * Hierarchy is carried by weight and value rather than size alone, which is what "high
 * contrast" means in a system with no colour: 11px uppercase caption grey, then 34px Outfit
 * ExtraLight in ink, then 16px Archivo in muted. Three steps, three families of emphasis.
 */
export function AuthScaffold({
  onBack,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthScaffoldProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      // `padding` lifts the content on iOS; on Android `height` is the one that cooperates
      // with `edgeToEdgeEnabled` in app.json, which has no `softwareKeyboardLayoutMode` set.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.m, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // The form is short; scrolling exists only so the keyboard can never trap the pill.
        bounces={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={Spacing.m}
          >
            <ArrowLeftIcon size={22} color={Colors.fg} />
          </TouchableOpacity>
          <OwlMark size={44} color={Colors.fg} />
        </View>

        <BannerStack style={styles.banners} />

        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <View style={styles.form}>{children}</View>

        <View style={styles.spacer} />

        <View style={styles.footer}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.l,
  },
  header: {
    gap: Spacing.l,
  },
  back: {
    alignSelf: 'flex-start',
  },
  banners: {
    marginTop: Spacing.l,
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.caption,
    marginTop: Spacing.xl,
  },
  title: {
    ...Display.prompt,
    color: Colors.fg,
    marginTop: Spacing.m,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.muted,
    marginTop: Spacing.m,
  },
  form: {
    marginTop: Spacing.xl,
  },
  // Holds the actions at the bottom of a tall screen without pinning them absolutely,
  // so a raised keyboard pushes them up instead of drawing over them.
  spacer: {
    flexGrow: 1,
    minHeight: Spacing.xl,
  },
  footer: {
    gap: Spacing.s,
  },
});
