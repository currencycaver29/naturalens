import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { OnboardingIntroScreen } from '../screens/OnboardingIntroScreen';
import { EmailEntryScreen } from '../screens/EmailEntryScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';

type Step = 'intro' | 'email' | 'otp';

/**
 * Sign-in — Screens 19, 20, 21.
 *
 * Sibling to `MainLayout`. `step` and the typed address stay local. Only the verified
 * session is promoted to shared state via `completeSignIn`.
 */
export function AuthFlow() {
  const [step, setStep] = useState<Step>('intro');
  const [email, setEmail] = useState('');

  const goBack = useCallback((): boolean => {
    if (step === 'otp') {
      setStep('email');
      return true;
    }
    if (step === 'email') {
      setStep('intro');
      return true;
    }
    return false;
  }, [step]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => subscription.remove();
  }, [goBack]);

  return (
    <View style={styles.container}>
      {step === 'intro' && <OnboardingIntroScreen onStart={() => setStep('email')} />}

      {step === 'email' && (
        <EmailEntryScreen
          email={email}
          onEmailChange={setEmail}
          onBack={() => setStep('intro')}
          onCodeSent={() => setStep('otp')}
        />
      )}

      {step === 'otp' && (
        <OtpVerificationScreen
          email={email}
          onBack={() => setStep('email')}
          onChangeEmail={() => setStep('email')}
        />
      )}

      <StatusBar style={step === 'intro' ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
