import { eq, isNull } from 'drizzle-orm';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  clearPrivateModeKeys,
  decryptField,
  encryptField,
  setupPrivateMode,
  unlockWithPassword,
} from '../crypto';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import { useSession, useSettings } from '../store';
import { paletteOrder, palettes, useTheme } from '../theme';

type Step = 'idle' | 'enabling' | 'disabling';

export function SettingsScreen() {
  const theme = useTheme();
  const { colorPalette, privateMode, setColorPalette, setPrivateMode } = useSettings();
  const { setEncryptionKey } = useSession();

  const [step, setStep] = useState<Step>('idle');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [stepError, setStepError] = useState('');

  // ── Enable private mode ──────────────────────────────────────────────────
  const enablePrivateMode = async () => {
    if (newPassword.length < 8) {
      setStepError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setStepError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setStepError('');
    await new Promise((r) => setTimeout(r, 50));
    try {
      const key = await setupPrivateMode(newPassword);

      // Encrypt every non-deleted task.
      const allTasks = await db.select().from(tasks).where(isNull(tasks.deleted_at));
      for (const t of allTasks) {
        if (!t.encrypted) {
          await db
            .update(tasks)
            .set({
              title: encryptField(key, t.title),
              description: t.description ? encryptField(key, t.description) : null,
              keywords: t.keywords ? encryptField(key, t.keywords) : null,
              archive_notes: t.archive_notes ? encryptField(key, t.archive_notes) : null,
              encrypted: 1,
              updated_at: Date.now(),
            })
            .where(eq(tasks.id, t.id));
        }
      }
      // Encrypted text is ciphertext — FTS is useless and misleading.
      await db.$client.execAsync('DELETE FROM tasks_fts');

      setPrivateMode(true);
      setEncryptionKey(key);
      setStep('idle');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      console.error(e);
      setStepError('Setup failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Disable private mode ─────────────────────────────────────────────────
  const disablePrivateMode = async () => {
    setBusy(true);
    setStepError('');
    await new Promise((r) => setTimeout(r, 50));
    try {
      const result = await unlockWithPassword(currentPassword);
      if (!result || result === 'no-setup') {
        setStepError('Incorrect password.');
        return;
      }
      const key = result;

      // Decrypt every encrypted task.
      const encryptedTasks = await db.select().from(tasks).where(eq(tasks.encrypted, 1));
      for (const t of encryptedTasks) {
        await db
          .update(tasks)
          .set({
            title: decryptField(key, t.title),
            description: t.description ? decryptField(key, t.description) : null,
            keywords: t.keywords ? decryptField(key, t.keywords) : null,
            archive_notes: t.archive_notes ? decryptField(key, t.archive_notes) : null,
            encrypted: 0,
            updated_at: Date.now(),
          })
          .where(eq(tasks.id, t.id));
      }
      // Rebuild FTS now that content is plaintext again.
      await db.$client.execAsync(
        'DELETE FROM tasks_fts;' +
          "INSERT INTO tasks_fts(id, title, keywords, archive_notes) " +
          "SELECT id, title, COALESCE(keywords,''), COALESCE(archive_notes,'') " +
          'FROM tasks WHERE retained = 1'
      );

      await clearPrivateModeKeys();
      setPrivateMode(false);
      setEncryptionKey(null);
      setStep('idle');
      setCurrentPassword('');
    } catch (e) {
      console.error(e);
      setStepError('Failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Delete all tasks ─────────────────────────────────────────────────────
  const deleteAll = () => {
    Alert.alert(
      'Delete all tasks',
      'This permanently removes every task and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            await db.delete(tasks);
            await db.$client.execAsync('DELETE FROM tasks_fts');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* ── Color palette ── */}
      <Text style={[styles.sectionHeader, { color: theme.subtext }]}>APPEARANCE</Text>
      <View style={styles.paletteGrid}>
        {paletteOrder.map((key) => {
          const p = palettes[key];
          const selected = colorPalette === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setColorPalette(key)}
              style={[
                styles.paletteCard,
                {
                  backgroundColor: p.bg,
                  borderColor: selected ? p.accent : p.border,
                  borderWidth: selected ? 2 : 1,
                },
              ]}
            >
              <Text style={[styles.paletteName, { color: p.text }]}>{p.name}</Text>
              <Text style={[styles.paletteSample, { color: p.subtext }]}>Sample text</Text>
              {selected && (
                <Text style={[styles.paletteCheck, { color: p.accent }]}>✓</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Privacy ── */}
      <Text style={[styles.sectionHeader, { color: theme.subtext }]}>PRIVACY</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Private Mode</Text>
            <Text style={[styles.rowSub, { color: theme.subtext }]}>
              {privateMode
                ? 'Tasks are encrypted with AES-256-GCM. Archive search is disabled.'
                : 'Tasks stored in plaintext.'}
            </Text>
          </View>
          {step === 'idle' && (
            <TouchableOpacity
              style={[styles.pill, { borderColor: theme.border }]}
              onPress={() => {
                setStep(privateMode ? 'disabling' : 'enabling');
                setStepError('');
              }}
            >
              <Text style={[styles.pillLabel, { color: theme.accent }]}>
                {privateMode ? 'Disable' : 'Enable'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {step === 'enabling' && (
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password (min 8 chars)"
              placeholderTextColor={theme.subtext}
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={theme.subtext}
              secureTextEntry
            />
            {stepError ? <Text style={styles.errorText}>{stepError}</Text> : null}
            <View style={styles.formBtns}>
              <TouchableOpacity
                style={[styles.pill, { borderColor: theme.border }]}
                onPress={() => { setStep('idle'); setNewPassword(''); setConfirmPassword(''); setStepError(''); }}
              >
                <Text style={[styles.pillLabel, { color: theme.subtext }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, { borderColor: theme.accent }]}
                onPress={enablePrivateMode}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <Text style={[styles.pillLabel, { color: theme.accent }]}>Enable</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'disabling' && (
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={theme.subtext}
              secureTextEntry
              autoFocus
            />
            {stepError ? <Text style={styles.errorText}>{stepError}</Text> : null}
            <View style={styles.formBtns}>
              <TouchableOpacity
                style={[styles.pill, { borderColor: theme.border }]}
                onPress={() => { setStep('idle'); setCurrentPassword(''); setStepError(''); }}
              >
                <Text style={[styles.pillLabel, { color: theme.subtext }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, { borderColor: theme.accent }]}
                onPress={disablePrivateMode}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <Text style={[styles.pillLabel, { color: theme.accent }]}>Confirm disable</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Data ── */}
      <Text style={[styles.sectionHeader, { color: theme.subtext }]}>DATA</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.row} onPress={deleteAll}>
          <Text style={[styles.rowLabel, { color: '#e74c3c' }]}>Delete all tasks</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paletteCard: {
    width: '47%',
    minHeight: 80,
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  paletteName: { fontSize: 14, fontWeight: '600' },
  paletteSample: { fontSize: 12, marginTop: 2 },
  paletteCheck: { fontSize: 16, marginTop: 6 },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowLabel: { fontSize: 16 },
  rowSub: { fontSize: 13, marginTop: 2 },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  pillLabel: { fontSize: 14 },
  form: {
    padding: 14,
    paddingTop: 0,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  formBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  errorText: { color: '#e74c3c', fontSize: 13 },
});
