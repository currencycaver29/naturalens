import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BorderRadii, Colors, Spacing, Typography } from '../theme/tokens';
import { OTP_BOX_HEIGHT } from '../theme/layout';
import { AuthScaffold } from '../components/AuthScaffold';
import { Button } from '../components/Button';
import { FieldError } from '../components/FieldError';
import { useAppState } from '../contexts/AppStateContext';
import { AuthError, OTP_LENGTH, requestCode, verifyCode } from '../lib/auth';

const RESEND_COOLDOWN_S = 30;

interface OtpVerificationScreenProps {
  email: string;
  onBack: () => void;
  onChangeEmail: () => void;
}

/**
 * Screen 21 — six digits.
 *
 * The boxes are drawn; the input is one hidden `TextInput` stretched across them. One-time
 * code autofill arrives as a single paste; six real inputs fight that. It submits itself
 * on the sixth digit. The pill stays for a rejected code that needs a way back in.
 */
export function OtpVerificationScreen({ email, onBack, onChangeEmail }: OtpVerificationScreenProps) {
  const { pushBanner, completeSignIn } = useAppState();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function verify(value: string) {
    if (verifying || value.length !== OTP_LENGTH) return;

    setVerifying(true);
    setError(null);

    try {
      const session = await verifyCode(email, value);
      completeSignIn(session);
    } catch (err) {
      if (err instanceof AuthError && err.field) {
        setError(err.message);
      } else if (err instanceof AuthError) {
        pushBanner(err.message, err.tone);
      } else {
        pushBanner("Couldn't check that code. Try again.", 'danger');
      }
      setCode('');
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (cooldown > 0) return;

    setError(null);
    setCode('');

    try {
      await requestCode(email);
      setCooldown(RESEND_COOLDOWN_S);
      pushBanner('A new code is on its way.', 'success', {
        id: 'auth-resend',
        transient: true,
      });
      inputRef.current?.focus();
    } catch (err) {
      const authErr = err instanceof AuthError ? err : null;
      const message = authErr?.message ?? "Couldn't send a new code. Try again.";
      if (authErr?.retryAfterSec) {
        setCooldown(authErr.retryAfterSec);
      }
      pushBanner(message, authErr?.tone ?? 'danger');
    }
  }

  const boxes = Array.from({ length: OTP_LENGTH }, (_, i) => i);

  return (
    <AuthScaffold
      onBack={onBack}
      eyebrow="Verify"
      title="Enter the six digits"
      subtitle={
        <>
          Sent to <Text style={styles.address}>{email}</Text>. Check your mail — including
          spam. The code lasts 10 minutes.
        </>
      }
      footer={
        <>
          <Button
            title={verifying ? 'Checking…' : 'Verify'}
            onPress={() => verify(code)}
            disabled={verifying || code.length !== OTP_LENGTH}
          />
          <Button
            title={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            onPress={resend}
            variant="quiet"
            disabled={cooldown > 0 || verifying}
          />
          <Button title="Use a different address" onPress={onChangeEmail} variant="quiet" />
        </>
      }
    >
      <View style={styles.row}>
        {boxes.map((index) => {
          const digit = code[index];
          const active = index === Math.min(code.length, OTP_LENGTH - 1);

          return (
            <View key={index} style={[styles.box, active && styles.boxActive]}>
              <Text style={styles.digit}>{digit ?? ''}</Text>
            </View>
          );
        })}

        <TextInput
          ref={inputRef}
          style={styles.hidden}
          value={code}
          onChangeText={(value) => {
            const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
            setCode(digits);
            if (error) setError(null);
            if (digits.length === OTP_LENGTH) verify(digits);
          }}
          selection={{ start: code.length, end: code.length }}
          editable={!verifying}
          autoFocus
          caretHidden
          maxLength={OTP_LENGTH}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          accessibilityLabel="Six-digit code"
        />
      </View>

      <FieldError message={error} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  address: {
    color: Colors.fg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.s,
  },
  box: {
    flex: 1,
    height: OTP_BOX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadii.input,
  },
  boxActive: {
    borderColor: Colors.fg,
  },
  digit: {
    ...Typography.h2,
    color: Colors.fg,
  },
  hidden: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});
