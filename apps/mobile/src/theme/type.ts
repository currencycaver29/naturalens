/**
 * Display type, composed from the generated ramp.
 *
 * `Typography` names roles at fixed sizes (display 46, h1 34, h2 28). Volume One's screens
 * ask for the same three Outfit weights at sizes in between — 40 on the splash, 36 for a
 * screen title, 38 for a species name. Rather than hardcode a font family and a guessed
 * letter-spacing at each call site, derive them here from the ratios in tokens.json:
 *
 *   display  Outfit 200  line-height 1.02  tracking -0.03em
 *   h1       Outfit 300  line-height 1.08  tracking -0.025em
 *   h2       Outfit 400  line-height 1.15  tracking -0.015em
 *
 * Body and UI text still come straight from `Typography` — only the display face is fluid.
 */
import { Typography } from './tokens';

type OutfitWeight = 200 | 300 | 400;

const OUTFIT_FAMILY: Record<OutfitWeight, string> = {
  200: Typography.display.fontFamily,
  300: Typography.h1.fontFamily,
  400: Typography.h2.fontFamily,
};

interface DisplayStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

/**
 * `tracking` is in em, the unit the ramp is authored in — React Native wants px, so it is
 * resolved against the size here. Passing px would silently rescale with every size change.
 */
function outfit(
  weight: OutfitWeight,
  fontSize: number,
  lineHeightRatio: number,
  trackingEm: number,
): DisplayStyle {
  return {
    fontFamily: OUTFIT_FAMILY[weight],
    fontSize,
    lineHeight: Math.round(fontSize * lineHeightRatio),
    letterSpacing: Number((fontSize * trackingEm).toFixed(2)),
  };
}

/** One entry per place Volume One uses the display face. Tune a screen's title here. */
export const Display = {
  /** 19 — onboarding headline. The largest display type in the app. */
  intro: outfit(200, 44, 1.05, -0.01),
  /** 01 — splash wordmark */
  splash: outfit(200, 40, 1.0, -0.01),
  /** 10 / 11 — "Detections" */
  screen: outfit(200, 36, 1.0, -0.01),
  /** 09 — "Naturalens needs the camera" */
  prompt: outfit(200, 34, 1.1, -0.01),
  /** 05 — "Preparing lens…" */
  status: outfit(200, 28, 1.15, -0.01),
  /** 06 / 08 — species name in the result sheet */
  species: outfit(300, 38, 1.05, -0.01),
  /** 15 / 16 — species name on the find detail */
  find: outfit(300, 36, 1.05, -0.01),
  /** 12 / 13 / 14 — "Map" in the header bar */
  panel: outfit(300, 18, 1.2, 0),
} as const;
