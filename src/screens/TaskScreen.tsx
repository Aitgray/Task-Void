import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Archive, Check, Trash2, X } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import type { NativeStackScreenProps, RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Task'>;

export function TaskScreen({ route, navigation }: Props) {
  const { taskId } = route.params;

  const { data } = useLiveQuery(
    db.select().from(tasks).where(eq(tasks.id, taskId))
  );
  const task = data?.[0];

  if (!task) {
    return (
      <View style={styles.container}>
        <Text>Task not found.</Text>
      </View>
    );
  }

  // Soft-complete/discard: update status and mark retained, row stays in DB for archive.
  const retain = async (status: 'completed' | 'discarded') => {
    await db
      .update(tasks)
      .set({ status, retained: 1, updated_at: Date.now() })
      .where(eq(tasks.id, task.id));
    // Insert into FTS explicitly — don't rely on the trigger alone.
    await db.$client.runAsync(
      'INSERT INTO tasks_fts(id, title, keywords, archive_notes) VALUES (?, ?, ?, ?)',
      [task.id, task.title, task.keywords ?? '', task.archive_notes ?? '']
    );
    navigation.goBack();
  };

  // Zero-retention purge: overwrite storage then hard-delete. Row is gone permanently.
  const purge = async () => {
    await db.$client.execAsync('PRAGMA secure_delete = ON');
    await db.delete(tasks).where(eq(tasks.id, task.id));
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.priority}>Priority {task.base_priority}</Text>
      <Text style={styles.title}>{task.title}</Text>
      {task.description ? (
        <Text style={styles.description}>{task.description}</Text>
      ) : null}

      <View style={styles.grid}>
        {/* Complete row */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => retain('completed')}>
            <Check size={28} />
            <Archive size={20} color="#555" style={styles.subIcon} />
            <Text style={styles.btnLabel}>Done · Keep</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={purge}>
            <Check size={28} />
            <Trash2 size={20} color="#555" style={styles.subIcon} />
            <Text style={styles.btnLabel}>Done · Gone</Text>
          </TouchableOpacity>
        </View>

        {/* Discard row */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => retain('discarded')}>
            <X size={28} />
            <Archive size={20} color="#555" style={styles.subIcon} />
            <Text style={styles.btnLabel}>Drop · Keep</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={purge}>
            <X size={28} />
            <Trash2 size={20} color="#555" style={styles.subIcon} />
            <Text style={styles.btnLabel}>Drop · Gone</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  priority: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#444',
    marginBottom: 24,
  },
  grid: {
    marginTop: 'auto',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  subIcon: {
    marginTop: -4,
  },
  btnLabel: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
});
