import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InvertedColors, Motion, Spacing, Typography } from '../theme/tokens';
import { Display } from '../theme/type';
import { OwlMark } from '../components/OwlMark';
import { Button } from '../components/Button';

interface OnboardingIntroScreenProps {
  onStart: () => void;
}

/**
 * Screen 19 — the first thing anyone sees.
 *
 * Inverted polarity, and no photograph. The brief asked for documentary wildlife
 * photography; there is none in the app, and the five animal SVGs on the landing site are
 * fill-based silhouettes with no stroke at all, so next to the owl mark and the icon set
 * they read as a different product. Rather than ship a placeholder photo or an illustration
 * that fights the line system, the impact comes from the two things the system already
 * does well at scale: a black ground and 44px Outfit ExtraLight.
 *
 * That also earns the cut to Screen 20, which is paper white — the flow goes dark, then
 * bright, instead of three white screens in a row.
 *
 * `BrandSplash` fades its white layer to zero over the top of this, so the handoff reads as
 * a reveal rather than a flash.
 */
export function OnboardingIntroScreen({ onStart }: OnboardingIntroScreenProps) {
  const insets = useSafeAreaInsets();

  // Three groups, one stagger step apart: the mark arrives, then the words, then the way in.
  const mark = useRise(0);
  const words = useRise(Motion.stagger * 2);
  const action = useRise(Motion.stagger * 4);

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + Spacing.xl }]}>
        <Animated.View style={mark}>
          <OwlMark size={64} color={InvertedColors.fg} />
        </Animated.View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View style={words}>
          <Text style={styles.eyebrow}>Field guide, Volume One</Text>
          <Text style={styles.headline}>Point your phone at an animal.</Text>
          <Text style={styles.body}>
            Naturalens names the species, says how sure it is, and keeps what you found.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.actions, action]}>
          <Button title="Get started" onPress={onStart} inverted />
          <Text style={styles.fine}>Your photos stay on this phone.</Text>
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * Fade up by `Motion.rise`, after `delay`.
 *
 * The RN `Animated` API rather than reanimated, which isn't installed and would mean a
 * native module for one screen's entrance. `Easing.bezier` restates `Motion.easing` by
 * hand because that token is a CSS string RN can't consume — the same duplication
 * `Sheet.tsx` already carries.
 */
function useRise(delay: number) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: Motion.enter,
      delay,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  return useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [Motion.rise, 0],
          }),
        },
      ],
    }),
    [progress],
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: InvertedColors.bg,
    paddingHorizontal: Spacing.l,
  },
  top: {
    flex: 1,
  },
  bottom: {
    gap: Spacing.xl,
  },
  eyebrow: {
    ...Typography.label,
    color: InvertedColors.caption,
  },
  headline: {
    ...Display.intro,
    color: InvertedColors.fg,
    marginTop: Spacing.l,
  },
  body: {
    ...Typography.body,
    color: InvertedColors.muted,
    marginTop: Spacing.l,
  },
  actions: {
    gap: Spacing.m,
  },
  fine: {
    ...Typography.small,
    fontSize: 13,
    color: InvertedColors.caption,
    textAlign: 'center',
  },
});
