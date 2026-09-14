import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
let MapView: any = View;
let Marker: any = View;
let PROVIDER_GOOGLE: any = undefined;


type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

import { Colors, Spacing, BorderRadii, Typography } from '../theme/tokens';
import { Display } from '../theme/type';
import { bottomClearance, PIN_PREVIEW_THUMB } from '../theme/layout';
import { MAP_STYLE } from '../theme/mapStyle';
import { Card } from '../components/Card';
import { BannerStack } from '../components/BannerStack';
import { OwlMark } from '../components/OwlMark';
import { ChevronIcon } from '../components/icons';
import { useAppState } from '../contexts/AppStateContext';
import { getCurrentFindLocation } from '../lib/location';
import { formatRelativeTime } from '../lib/time';
import type { HistoryEntry } from '../types';

/** Roughly a few streets across — close enough to see individual finds apart. */
const DEFAULT_SPAN = 0.02;

/** Padding around the fitted bounds so pins never sit flush against the header or nav. */
const FIT_PADDING = 1.6;

/**
 * Expo Go ships a fixed set of native modules and `react-native-maps` is not among them,
 * so rendering a `MapView` there dies on a missing native component.
 *
 * Rather than make the whole app require a development build — the Expo Go workflow is
 * why identification runs in the cloud at all (`docs/DESIGN.md` §2) — the map alone says
 * so and the other two tabs carry on working. Captures still record their location in
 * Expo Go; the pins are simply waiting for a build that can draw them.
 */
const MAPS_AVAILABLE = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const IS_ANDROID = Platform.OS === 'android';

/** Screens 12, 13, 14 — where the finds were made. */
export function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { history, selectedPin, setSelectedPinId, setSelectedEntryId } = useAppState();

  const mapped = useMemo(() => history.filter((entry) => entry.location), [history]);
  const [here, setHere] = useState<Region | null>(null);
  const [ready, setReady] = useState(false);

  // Frame the finds if there are any; otherwise fall back to where the user is. With
  // neither, `initialRegion` stays undefined and the map opens on the whole world, which
  // is at least honest about knowing nothing.
  const region = useMemo(() => regionFor(mapped) ?? here, [mapped, here]);

  const clearance = bottomClearance(insets.bottom);

  // Screen 13 wants a "you are here" on an empty map. Read the position but never *ask*
  // for it — the permission prompt belongs on the first capture, where there's something
  // to attach a place to. If it was granted there, this just works.
  useEffect(() => {
    if (mapped.length > 0) return;
    let cancelled = false;

    getCurrentFindLocation().then((found) => {
      if (cancelled || !found) return;
      setHere({
        latitude: found.lat,
        longitude: found.lon,
        latitudeDelta: DEFAULT_SPAN,
        longitudeDelta: DEFAULT_SPAN,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [mapped.length]);

  // Re-fit whenever the framing changes — saving a find somewhere new should bring it into
  // view rather than leave the camera where it was.
  useEffect(() => {
    if (!ready || !region) return;
    mapRef.current?.animateToRegion(region, 400);
  }, [ready, region]);

  return (
    <View style={styles.page}>
      {MAPS_AVAILABLE ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          // Google on Android, where the style JSON applies. On iOS the default provider is
          // Apple Maps, which ignores `customMapStyle` — `mutedStandard` is the nearest
          // stock equivalent. See `theme/mapStyle.ts` for why we live with the difference.
          provider={IS_ANDROID ? PROVIDER_GOOGLE : undefined}
          // Only Google reads the style JSON. Handing it to Apple Maps doesn't just get
          // ignored — it suppresses `mapType`, which is the one lever iOS does give us.
          customMapStyle={IS_ANDROID ? MAP_STYLE : undefined}
          mapType={IS_ANDROID ? 'standard' : 'mutedStandard'}
          initialRegion={region ?? undefined}
          showsUserLocation
          showsMyLocationButton={false}
          showsPointsOfInterest={false}
          showsTraffic={false}
          showsCompass={false}
          toolbarEnabled={false}
          onMapReady={() => setReady(true)}
          onPress={() => setSelectedPinId(null)}
        >
          {mapped.map((entry) => (
            <Marker
              key={entry.id}
              coordinate={{ latitude: entry.location!.lat, longitude: entry.location!.lon }}
              onPress={() => setSelectedPinId(entry.id)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Pin entry={entry} selected={selectedPin?.id === entry.id} />
            </Marker>
          ))}
        </MapView>
      ) : (
        /* The terrain the map would have drawn, minus the map. Keeps the tab from being a
           blank white panic while making the reason plain. */
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.fauxLand} />
          <View style={styles.fauxRoad} />
        </View>
      )}

      <View style={[styles.top, { top: insets.top + Spacing.m }]} pointerEvents="box-none">
        <Card variant="outline" style={styles.headerBar}>
          <Text style={styles.headerTitle}>Map</Text>
          <Text style={styles.headerMeta}>
            {!MAPS_AVAILABLE
              ? 'Unavailable'
              : mapped.length === 0
                ? 'No finds yet'
                : `${mapped.length} ${mapped.length === 1 ? 'find' : 'finds'} mapped`}
          </Text>
        </Card>
        <BannerStack />
      </View>

      {/* Screen 13 — an empty map is indistinguishable from a broken one without this. */}
      {(!MAPS_AVAILABLE || mapped.length === 0) && (
        <View style={[styles.emptyWrap, { bottom: clearance }]} pointerEvents="box-none">
          <Card variant="outline">
            <Text style={styles.emptyCopy}>{emptyCopy(MAPS_AVAILABLE, mapped.length, history.length)}</Text>
          </Card>
        </View>
      )}

      {/* Screen 14. Inline rather than a modal — the map has to stay visible behind it,
          because the point of the card is telling you which pin you tapped. */}
      {selectedPin && (
        <View style={[styles.previewWrap, { bottom: clearance }]} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedEntryId(selectedPin.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${selectedPin.label}`}
          >
            <Card variant="outline" style={styles.preview}>
              <Image
                source={{ uri: selectedPin.thumbUri ?? selectedPin.photoUri }}
                style={styles.previewThumb}
              />
              <View style={styles.previewBody}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {selectedPin.label}
                </Text>
                <Text style={styles.previewMeta}>
                  {Math.round(selectedPin.score * 100)}% · {formatRelativeTime(selectedPin.timestamp)}
                </Text>
              </View>
              <ChevronIcon size={18} color={Colors.fg} />
            </Card>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Why the map is showing nothing.
 *
 * Three different reasons look identical on screen, and guessing wrong sends someone
 * hunting for a bug that isn't there: no finds at all, finds that predate location, or a
 * runtime that can't draw a map.
 */
function emptyCopy(available: boolean, mappedCount: number, totalCount: number): string {
  if (!available) {
    const waiting =
      mappedCount === 0
        ? ''
        : ` ${mappedCount} ${mappedCount === 1 ? 'find is' : 'finds are'} waiting.`;
    return `Maps need a development build — Expo Go can't draw them. Run npm run dev:ios or dev:android.${waiting}`;
  }
  if (totalCount === 0) return 'Finds you save will appear here.';
  return 'None of your finds have a location yet. New ones will show up here.';
}

/**
 * A pin is the find's own photo, bordered in ink — you recognise your own picture faster
 * than you read a label. Finds with no thumbnail yet fall back to the mark on black.
 */
function Pin({ entry, selected }: { entry: HistoryEntry; selected: boolean }) {
  const size = selected ? 56 : 46;
  const thumb = entry.thumbUri ?? entry.photoUri;

  return (
    <View style={[styles.pin, { width: size, height: size }, selected && styles.pinSelected]}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.pinImage} />
      ) : (
        <OwlMark size={size * 0.6} color={Colors.bg} />
      )}
    </View>
  );
}

/**
 * A region containing every mapped find.
 *
 * Returns null when there are none, which hands the map back to `showsUserLocation` and
 * whatever the OS considers home — better than opening on a hardcoded coordinate in
 * someone else's country.
 */
function regionFor(entries: HistoryEntry[]): Region | null {
  if (entries.length === 0) return null;

  const lats = entries.map((e) => e.location!.lat);
  const lons = entries.map((e) => e.location!.lon);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    // A single find has zero span, which would zoom to the atom — floor it at the default.
    latitudeDelta: Math.max((maxLat - minLat) * FIT_PADDING, DEFAULT_SPAN),
    longitudeDelta: Math.max((maxLon - minLon) * FIT_PADDING, DEFAULT_SPAN),
  };
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F2F2F0',
  },
  top: {
    position: 'absolute',
    left: Spacing.l,
    right: Spacing.l,
    gap: Spacing.s + 2,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.m - 4,
    paddingHorizontal: Spacing.m - 2,
  },
  headerTitle: {
    ...Display.panel,
    color: Colors.fg,
  },
  headerMeta: {
    ...Typography.label,
    color: Colors.caption,
  },
  // Stand-in terrain for the Expo Go case — the same shapes the styled map would draw.
  fauxLand: {
    position: 'absolute',
    left: -40,
    top: 520,
    width: 520,
    height: 420,
    backgroundColor: '#E7E7E5',
    transform: [{ rotate: '-9deg' }],
  },
  fauxRoad: {
    position: 'absolute',
    left: -60,
    top: 300,
    width: 560,
    height: 1,
    backgroundColor: '#E2E2E0',
    transform: [{ rotate: '-6deg' }],
  },

  emptyWrap: {
    position: 'absolute',
    left: Spacing.l,
    right: Spacing.l,
  },
  emptyCopy: {
    ...Typography.small,
    color: Colors.muted,
  },

  previewWrap: {
    position: 'absolute',
    left: Spacing.m,
    right: Spacing.m,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    padding: Spacing.m - 2,
    shadowColor: Colors.fg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  previewThumb: {
    width: PIN_PREVIEW_THUMB,
    height: PIN_PREVIEW_THUMB,
    borderRadius: BorderRadii.media,
    backgroundColor: Colors.surface,
  },
  previewBody: {
    flex: 1,
    minWidth: 0,
  },
  previewName: {
    ...Typography.h3,
    color: Colors.fg,
  },
  previewMeta: {
    ...Typography.small,
    fontSize: 12,
    color: Colors.caption,
    marginTop: 3,
  },

  pin: {
    borderWidth: 2,
    borderColor: Colors.fg,
    backgroundColor: Colors.fg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pinSelected: {
    shadowColor: Colors.fg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 8,
  },
  pinImage: {
    width: '100%',
    height: '100%',
  },
});
