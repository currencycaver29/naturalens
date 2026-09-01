import { useState } from 'react';
import { Linking, StyleSheet, Text, TextInput } from 'react-native';
import { BorderRadii, Colors, Spacing, Typography } from '../theme/tokens';
import { AuthScaffold } from '../components/AuthScaffold';
import { Button } from '../components/Button';
import { FieldError } from '../components/FieldError';
import { useAppState } from '../contexts/AppStateContext';
import { AuthError, requestCode, validateEmail } from '../lib/auth';

interface EmailEntryScreenProps {
  email: string;
  onEmailChange: (value: string) => void;
  onBack: () => void;
  onCodeSent: () => void;
}

/**
 * Screen 20 — the address.
 *
 * Field style is taken from the waitlist form on the landing site: uppercase 11px label,
 * a 2px bordered box, the border darkening to ink on focus, a pill submit, and caption-grey
 * fine print. Errors go under the field in ink (`FieldError`); network failures get a banner.
 */
export function EmailEntryScreen({
  email,
  onEmailChange,
  onBack,
  onCodeSent,
}: EmailEntryScreenProps) {
  const { pushBanner } = useAppState();
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (sending) return;

    const invalid = validateEmail(email);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setSending(true);

    try {
      await requestCode(email);
      onCodeSent();
    } catch (err) {
      const authErr = err instanceof AuthError ? err : null;
      const message = authErr?.message ?? "Couldn't send a code. Try again.";
      if (authErr?.field) {
        setError(message);
      } else {
        pushBanner(message, authErr?.tone ?? 'danger');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthScaffold
      onBack={onBack}
      eyebrow="Sign in"
      title="Where should we send your code?"
      subtitle="No password. We send six digits to this address and you type them on the next screen."
      footer={
        <>
          <Button
            title={sending ? 'Sending…' : 'Send code'}
            onPress={submit}
            disabled={sending || email.trim().length === 0}
          />
          <Text style={styles.fine}>
            No newsletter, no forwarding. Your finds stay on this phone either way.
          </Text>
          <Text style={styles.legal}>
            By continuing you agree to the{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://naturalens.ca/terms')}
              accessibilityRole="link"
            >
              Terms
            </Text>
            {' '}and{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://naturalens.ca/privacy')}
              accessibilityRole="link"
            >
              Privacy
            </Text>
            {' '}policy.
          </Text>
        </>
      }
    >
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={email}
        onChangeText={(value) => {
          onEmailChange(value);
          if (error) setError(null);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={submit}
        placeholder="you@field.org"
        placeholderTextColor={Colors.caption}
        editable={!sending}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="go"
        accessibilityLabel="Email address"
      />
      <FieldError message={error} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  label: {
    ...Typography.label,
    color: Colors.muted,
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
  fine: {
    ...Typography.small,
    fontSize: 13,
    color: Colors.caption,
    textAlign: 'center',
  },
  legal: {
    ...Typography.small,
    fontSize: 13,
    color: Colors.caption,
    textAlign: 'center',
  },
  link: {
    color: Colors.fg,
    textDecorationLine: 'underline',
  },
});
