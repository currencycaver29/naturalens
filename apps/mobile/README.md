# NaturaLens — Mobile App

Wildlife recognition app built with React Native (Expo). Take a photo, get a species
name and a confidence score, save it to your list of finds — and see where you found them.

## Quick Start (Expo Go)

```bash
npm install
cp .env.example .env
npm start
```

Press `i` for the iOS simulator, `a` for the Android emulator, or scan the QR code with
Expo Go on a real device. Use a real device if you want to actually capture anything —
simulators have no camera.

### The API key is required

Identification calls the Gemini API, so the app needs a key in `.env`:

```
EXPO_PUBLIC_GEMINI_API_KEY=...
```

Get a free one at [AI Studio](https://aistudio.google.com/apikey) — no credit card. Without
it, every capture fails with a "Missing EXPO_PUBLIC_GEMINI_API_KEY" banner.

`EXPO_PUBLIC_*` variables are inlined into the app bundle, so this key ships to anyone who
has the app. Restrict it in AI Studio rather than relying on it staying secret. Moving
identification behind our own API — so the key stays on a server — is what `services/api`
is a placeholder for.

Restart the dev server after editing `.env`; Expo only reads it at startup.

## Sign-in

The app is gated on an email + six-digit code. Codes are emailed by the
`naturalens-web` Worker (`POST /api/auth/request-code`). The live default is
`https://naturalens.ca`. To hit a local Worker, set `EXPO_PUBLIC_API_BASE_URL` in `.env`
(see `.env.example`).

Until `RESEND_API_KEY` and `AUTH_PEPPER` are set on that Worker, Send code fails closed.

## How it works

`src/lib/detector.ts` shrinks the capture to 1024px, sends it to `gemini-3.1-flash-lite`
with a JSON response schema, and gets back `{ isAnimal, label, confidence }`. Thinking is
set to `minimal` — naming an animal doesn't need a reasoning budget, and it was costing
latency for nothing.

`src/lib/history.ts` persists saved finds. The metadata goes into AsyncStorage; the photo
is copied out of the camera's cache directory (which the OS may purge under storage
pressure) into the document directory, so thumbnails survive a restart.

`src/lib/location.ts` geotags a capture, if it can. Every function in it degrades to
`undefined` rather than throwing — a find without a location is a normal find, and losing
the photo because the GPS was slow would be the worse outcome. Location can't be
backfilled, so finds saved without one read "not geotagged" forever.

Identification runs in the cloud rather than on-device because Expo Go can only load the
native modules it ships with — an on-device TFLite runtime would mean giving up the Expo
Go workflow. See [docs/Architecture_Notes.md](../../docs/Architecture_Notes.md).

## The design system

The app renders [Volume One](../../packages/design/) — black-and-white chrome, Outfit for
display, Archivo for body. **Don't hardcode a colour, size or radius.** Everything comes
from `src/theme/tokens.ts`, which is generated:

```bash
node packages/design/build/generate.mjs          # after editing packages/design/tokens.json
node packages/design/build/generate.mjs --check  # verify committed outputs aren't stale
```

Two things live beside it because they aren't design tokens: `src/theme/layout.ts` (this
app's furniture — nav height, thumbnail sizes, the `bottomClearance` every screen needs to
clear the floating tab pill) and `src/theme/type.ts` (the display face at the sizes the
screens actually ask for, derived from the ramp's ratios).

Note the mobile spacing scale is shifted one step down from `tokens.json` by the generator:
**`Spacing.l` is 24** — the screen gutter — not `Spacing.m`.

## Native builds

Expo Go covers the camera, identification and the find log. **The Map tab needs a
development build** — `react-native-maps` isn't among the native modules Expo Go ships, so
in Expo Go the map draws its ground and says so. Location is still recorded there; the pins
are waiting for a build that can draw them.

```bash
npm run dev:ios       # expo prebuild && expo run:ios
npm run dev:android   # expo prebuild && expo run:android
```

Android reads the custom map style (`src/theme/mapStyle.ts`). iOS gets Apple Maps'
`mutedStandard`, which lands close — pale ground, grey roads, no POI pins.

`customMapStyle` is passed **only** on Android on purpose: giving it to Apple Maps
suppresses `mapType`, which silently costs you the muted style and leaves a full-colour map.
