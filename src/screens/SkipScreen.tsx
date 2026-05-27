import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import type { NativeStackScreenProps, RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SkipTask'>;

export function SkipScreen({ route, navigation }: Props) {
  const { taskId } = route.params;

  const { data } = useLiveQuery(
    db.select().from(tasks).where(eq(tasks.id, taskId))
  );
  const task = data?.[0];

  const [description, setDescription] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<number | undefined>(undefined);

  if (!task) {
    return (
      <View style={styles.container}>
        <Text>Task not found.</Text>
      </View>
    );
  }

  const effectiveDescription = description ?? task.description ?? '';
  const effectivePriority = priority ?? task.base_priority;

  const skip = async () => {
    const now = Date.now();
    const hoursWaiting = (now - task.scheduled_at) / 3_600_000;
    // Partial aging-clock reset: task re-enters queue as if it waited half as long.
    const newScheduledAt = now - hoursWaiting * 0.5 * 3_600_000;

    await db.update(tasks).set({
      skip_count: task.skip_count + 1,
      last_skipped_at: now,
      scheduled_at: newScheduledAt,
      description: effectiveDescription || null,
      base_priority: effectivePriority,
      updated_at: now,
    }).where(eq(tasks.id, task.id));

    navigation.popToTop();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{task.title}</Text>

      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityRow}>
        {[1, 2, 3, 4, 5].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityBtn, effectivePriority === p && styles.priorityBtnSelected]}
            onPress={() => setPriority(p)}
          >
            <Text style={[styles.priorityLabel, effectivePriority === p && styles.priorityLabelSelected]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.descInput}
        value={effectiveDescription}
        onChangeText={setDescription}
        placeholder="Add or update description…"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.skipBtn} onPress={skip}>
        <Text style={styles.skipBtnLabel}>Skip · Requeue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityBtnSelected: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  priorityLabel: {
    fontSize: 16,
  },
  priorityLabelSelected: {
    color: '#fff',
  },
  descInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 32,
    minHeight: 100,
  },
  skipBtn: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipBtnLabel: {
    fontSize: 16,
  },
});
