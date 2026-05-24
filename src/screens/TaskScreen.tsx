import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { StyleSheet, Text, View } from 'react-native';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import type { NativeStackScreenProps, RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Task'>;

export function TaskScreen({ route }: Props) {
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

  return (
    <View style={styles.container}>
      <Text style={styles.priority}>Priority {task.base_priority}</Text>
      <Text style={styles.title}>{task.title}</Text>
      {task.description ? (
        <Text style={styles.description}>{task.description}</Text>
      ) : null}
      {/* 2×2 completion buttons — step 3 */}
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
  },
});
