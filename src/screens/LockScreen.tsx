import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { clearPrivateModeKeys, unlockWithPassword } from '../crypto';
import { useSession } from '../store';
import { useSettings } from '../store';
import { useTheme } from '../theme';

export function LockScreen() {
  const theme = useTheme();
  const setEncryptionKey = useSession((s) => s.setEncryptionKey);
  const setPrivateMode = useSettings((s) => s.setPrivateMode);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const unlock = async () => {
    if (!password) return;
    setChecking(true);
    setError('');
    // Yield so the ActivityIndicator (native, animates even during JS block) renders.
    await new Promise((r) => setTimeout(r, 50));
    try {
      const result = await unlockWithPassword(password);
      if (result === 'no-setup') {
        // SecureStore was cleared (e.g. app reinstall). Offer recovery.
        setChecking(false);
        Alert.alert(
          'Encryption keys missing',
          'The encryption keys were not found (the app may have been reinstalled). ' +
            'Encrypted tasks cannot be recovered. Disable private mode to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable & continue',
              style: 'destructive',
              onPress: async () => {
                await clearPrivateModeKeys();
                setPrivateMode(false);
              },
            },
          ]
        );
        return;
      }
      if (result) {
        setEncryptionKey(result);
      } else {
        setError('Incorrect password.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Into the Void</Text>
      <Text style={[styles.subtitle, { color: theme.subtext }]}>Enter password to unlock</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text },
        ]}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={theme.subtext}
        secureTextEntry
        autoFocus
        onSubmitEditing={unlock}
        returnKeyType="go"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.btn, { borderColor: theme.accent, backgroundColor: theme.surface }]}
        onPress={unlock}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <Text style={[styles.btnLabel, { color: theme.text }]}>Unlock</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginBottom: 8 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  errorText: { color: '#e74c3c', fontSize: 14 },
  btn: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  btnLabel: { fontSize: 16 },
});
