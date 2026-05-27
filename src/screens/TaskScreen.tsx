import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Archive, Check, SkipForward, Trash2, X } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { decryptTaskFields, encryptField } from '../crypto';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import type { NativeStackScreenProps, RootStackParamList } from '../navigation/types';
import { useSession } from '../store';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Task'>;

export function TaskScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const encryptionKey = useSession((s) => s.encryptionKey);
  const { taskId } = route.params;

  const { data } = useLiveQuery(
    db.select().from(tasks).where(eq(tasks.id, taskId))
  );
  const raw = data?.[0];
  const task = raw ? decryptTaskFields(raw, encryptionKey) : undefined;

  if (!task || !raw) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text }}>Task not found.</Text>
      </View>
    );
  }

  // Soft-complete/discard: update status and mark retained.
  const retain = async (status: 'completed' | 'discarded') => {
    await db
      .update(tasks)
      .set({ status, retained: 1, updated_at: Date.now() })
      .where(eq(tasks.id, raw.id));
    // Insert into FTS with decrypted content (or empty strings if encrypted).
    await db.$client.runAsync(
      'INSERT INTO tasks_fts(id, title, keywords, archive_notes) VALUES (?, ?, ?, ?)',
      [raw.id, task.title, task.keywords ?? '', task.archive_notes ?? '']
    );
    navigation.goBack();
  };

  // Zero-retention purge: secure_delete + hard DELETE.
  const purge = async () => {
    await db.$client.execAsync('PRAGMA secure_delete = ON');
    await db.delete(tasks).where(eq(tasks.id, raw.id));
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.priority, { color: theme.subtext }]}>Priority {raw.base_priority}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{task.title}</Text>
      {task.description ? (
        <Text style={[styles.description, { color: theme.subtext }]}>{task.description}</Text>
      ) : null}

      <View style={styles.grid}>
        {/* Complete row */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => retain('completed')}
          >
            <Check size={28} color={theme.text} />
            <Archive size={20} color={theme.subtext} style={styles.subIcon} />
            <Text style={[styles.btnLabel, { color: theme.subtext }]}>Done · Keep</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={purge}
          >
            <Check size={28} color={theme.text} />
            <Trash2 size={20} color={theme.subtext} style={styles.subIcon} />
            <Text style={[styles.btnLabel, { color: theme.subtext }]}>Done · Gone</Text>
          </TouchableOpacity>
        </View>

        {/* Discard row */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => retain('discarded')}
          >
            <X size={28} color={theme.text} />
            <Archive size={20} color={theme.subtext} style={styles.subIcon} />
            <Text style={[styles.btnLabel, { color: theme.subtext }]}>Drop · Keep</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={purge}
          >
            <X size={28} color={theme.text} />
            <Trash2 size={20} color={theme.subtext} style={styles.subIcon} />
            <Text style={[styles.btnLabel, { color: theme.subtext }]}>Drop · Gone</Text>
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity
          style={[styles.btn, styles.skipBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('SkipTask', { taskId: raw.id })}
        >
          <SkipForward size={28} color={theme.text} />
          <Text style={[styles.btnLabel, { color: theme.subtext }]}>Skip · Requeue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  priority: { fontSize: 13, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 16, marginBottom: 24 },
  grid: { marginTop: 'auto', gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  skipBtn: { aspectRatio: undefined, paddingVertical: 16 },
  subIcon: { marginTop: -4 },
  btnLabel: { fontSize: 12, marginTop: 4 },
});
