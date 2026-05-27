import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { decryptTaskFields, encryptField } from '../crypto';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import type { NativeStackScreenProps, RootStackParamList } from '../navigation/types';
import { useSession } from '../store';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SkipTask'>;

export function SkipScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const encryptionKey = useSession((s) => s.encryptionKey);
  const { taskId } = route.params;

  const { data } = useLiveQuery(
    db.select().from(tasks).where(eq(tasks.id, taskId))
  );
  const raw = data?.[0];
  const task = raw ? decryptTaskFields(raw, encryptionKey) : undefined;

  const [description, setDescription] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<number | undefined>(undefined);

  if (!task || !raw) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text }}>Task not found.</Text>
      </View>
    );
  }

  const effectiveDescription = description ?? task.description ?? '';
  const effectivePriority = priority ?? raw.base_priority;

  const skip = async () => {
    const now = Date.now();
    const hoursWaiting = (now - raw.scheduled_at) / 3_600_000;
    // Partial aging-clock reset: task re-enters queue as if it waited half as long.
    const newScheduledAt = now - hoursWaiting * 0.5 * 3_600_000;

    const rawDesc = effectiveDescription || null;
    const useEncryption = !!encryptionKey && !!raw.encrypted;

    await db.update(tasks).set({
      skip_count: raw.skip_count + 1,
      last_skipped_at: now,
      scheduled_at: newScheduledAt,
      description: rawDesc && useEncryption
        ? encryptField(encryptionKey!, rawDesc)
        : rawDesc,
      base_priority: effectivePriority,
      updated_at: now,
    }).where(eq(tasks.id, raw.id));

    navigation.popToTop();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>{task.title}</Text>

      <Text style={[styles.label, { color: theme.subtext }]}>Priority</Text>
      <View style={styles.priorityRow}>
        {[1, 2, 3, 4, 5].map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.priorityBtn,
              { borderColor: theme.border },
              effectivePriority === p && { borderColor: theme.accent, backgroundColor: theme.accent },
            ]}
            onPress={() => setPriority(p)}
          >
            <Text
              style={[
                styles.priorityLabel,
                { color: theme.text },
                effectivePriority === p && { color: theme.bg },
              ]}
            >
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.subtext }]}>Description</Text>
      <TextInput
        style={[styles.descInput, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
        value={effectiveDescription}
        onChangeText={setDescription}
        placeholder="Add or update description…"
        placeholderTextColor={theme.subtext}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.skipBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={skip}
      >
        <Text style={[styles.skipBtnLabel, { color: theme.text }]}>Skip · Requeue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  label: { fontSize: 13, marginBottom: 8 },
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityLabel: { fontSize: 16 },
  descInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 32,
    minHeight: 100,
  },
  skipBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipBtnLabel: { fontSize: 16 },
});
