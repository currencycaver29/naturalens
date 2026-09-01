import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadii, Colors, Spacing, Typography } from '../theme/tokens';
import { Sheet } from '../components/Sheet';
import { Button } from '../components/Button';
import { FieldError } from '../components/FieldError';
import { useAppState } from '../contexts/AppStateContext';
import { OwlMark } from '../components/OwlMark';
import { hasLocationPermission } from '../lib/location';
import { AuthError } from '../lib/auth';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  findCount: number;
}

/**
 * What the app knows about itself: who is signed in, how many finds are on this phone,
 * and that those finds still do not leave it.
 */
export function SettingsSheet({ visible, onClose, findCount }: SettingsSheetProps) {
  const insets = useSafeAreaInsets();
  const { session, signOut, saveDisplayName, pushBanner } = useAppState();
  const [locationOn, setLocationOn] = useState<boolean | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const displayName = session?.user.displayName?.trim() || null;
  const email = session?.email ?? session?.user.email ?? 'Not signed in';

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your finds stay on this phone. You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          onClose();
          signOut();
        },
      },
    ]);
  }

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    hasLocationPermission().then((granted) => {
      if (!cancelled) setLocationOn(granted);
    });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setEditingName(false);
      setNameError(null);
      setSavingName(false);
    }
  }, [visible]);

  function startEditName() {
    setNameDraft(displayName ?? '');
    setNameError(null);
    setEditingName(true);
  }

  async function saveName() {
    if (savingName) return;
    setSavingName(true);
    setNameError(null);
    try {
      await saveDisplayName(nameDraft);
      setEditingName(false);
    } catch (err) {
      const message = err instanceof AuthError ? err.message : "Couldn't save that name. Try again.";
      if (err instanceof AuthError && err.field) {
        setNameError(message);
      } else {
        pushBanner(message, err instanceof AuthError ? err.tone : 'danger');
      }
    } finally {
      setSavingName(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.anchor} pointerEvents="box-none">
        <Sheet style={{ paddingBottom: insets.bottom + Spacing.l }}>
          <View style={styles.identity}>
            <OwlMark size={44} color={Colors.fg} />
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName ?? email}
              </Text>
              {displayName ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.rule} />

          {editingName ? (
            <View style={styles.edit}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                style={[styles.input, nameFocused && styles.inputFocused]}
                value={nameDraft}
                onChangeText={(value) => {
                  setNameDraft(value);
                  if (nameError) setNameError(null);
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                onSubmitEditing={saveName}
                placeholder="Your name"
                placeholderTextColor={Colors.caption}
                editable={!savingName}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                maxLength={80}
                accessibilityLabel="Display name"
              />
              <FieldError message={nameError} />
              <Button
                title={savingName ? 'Saving…' : 'Save name'}
                onPress={saveName}
                disabled={savingName}
              />
            </View>
          ) : (
            <Row
              label="Display name"
              value={displayName ?? 'Add one'}
              onPress={session ? startEditName : undefined}
              hint={session && !displayName ? 'Add one' : undefined}
            />
          )}

          <Row label="Member since" value={formatMemberSince(session?.user.createdAt)} />
          <Row label="Finds on this device" value={String(findCount)} />
          <Row
            label="Location tagging"
            value={locationOn === null ? '—' : locationOn ? 'On' : 'Off'}
            onPress={locationOn === false ? () => Linking.openSettings() : undefined}
            hint={locationOn === false ? 'Open settings' : undefined}
          />
          <Row label="Finds" value="Stay on this phone" />

          {session && <Button title="Sign out" onPress={confirmSignOut} variant="quiet" />}

          <Text style={styles.volume}>Naturalens · Volume One</Text>
        </Sheet>
      </View>
    </Modal>
  );
}

function formatMemberSince(value?: string): string {
  if (!value) return '—';
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Row({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value: string;
  hint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{hint ?? value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  anchor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
  },
  identityText: {
    flex: 1,
  },
  name: {
    ...Typography.h3,
    color: Colors.fg,
  },
  sub: {
    ...Typography.small,
    fontSize: 12,
    color: Colors.caption,
    marginTop: 3,
  },
  rule: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.l - 2,
  },
  label: {
    ...Typography.label,
    color: Colors.muted,
    marginBottom: Spacing.m,
  },
  edit: {
    gap: Spacing.s,
    marginBottom: Spacing.m,
  },
  input: {
    ...Typography.body,
    color: Colors.fg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadii.input,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
  },
  inputFocused: {
    borderColor: Colors.fg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.s - 2,
  },
  rowLabel: {
    ...Typography.small,
    fontSize: 13,
    color: Colors.muted,
  },
  rowValue: {
    ...Typography.small,
    fontSize: 13,
    color: Colors.fg,
  },
  volume: {
    ...Typography.label,
    color: Colors.caption,
    textAlign: 'center',
    marginTop: Spacing.m,
  },
});
