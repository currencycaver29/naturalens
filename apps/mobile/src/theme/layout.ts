/**
 * Product layout constants — sizes the design system doesn't speak to.
 *
 * Design tokens describe the vocabulary (space, radius, type). These are decisions about
 * this app's furniture: how tall the tab pill is, how big a list thumbnail is. They live
 * here rather than in `tokens.ts` because that file is generated, and rather than inline
 * in screens because more than one screen has to agree on them.
 */
import { Spacing } from './tokens';

/** Height of the floating tab pill, excluding the safe-area inset below it. */
export const NAV_HEIGHT = 60;

/** Gap between the tab pill and the bottom of the safe area. */
export const NAV_INSET = Spacing.l;

/** Media block on the find detail screen. Square corners — `BorderRadii.media` is 0. */
export const DETAIL_MEDIA_HEIGHT = 330;

/** Square thumbnail in a Finds row. */
export const LIST_THUMB = 60;

/** Square thumbnail in the map's pin preview card. */
export const PIN_PREVIEW_THUMB = 64;

/** Shutter button: outer ring and inner core. */
export const SHUTTER_SIZE = 74;
export const SHUTTER_CORE = 58;

/**
 * Bottom padding a scrolling screen needs so its last row clears the floating tab pill.
 *
 * The pill is absolutely positioned by `MainLayout`, so it does not take part in layout and
 * every screen underneath has to account for it. This was duplicated by hand in the camera
 * and history screens and drifted; it is one function now.
 */
export function bottomClearance(insetBottom: number): number {
  return insetBottom + NAV_INSET + NAV_HEIGHT + Spacing.m;
}

/**
 * One box in the six-digit code row (Screen 21). Width is `flex: 1` against the gutter, so
 * only the height is a decision — 56 keeps the box taller than it is wide on a small phone,
 * which is what makes six of them read as a row of slots rather than a table.
 */
export const OTP_BOX_HEIGHT = 56;
