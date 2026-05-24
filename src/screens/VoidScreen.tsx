import { and, count, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Button, StyleSheet, Text, View } from 'react-native';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import type { VoidNavProp } from '../navigation/types';
import { pickTask } from '../scheduler';

type Props = { navigation: VoidNavProp };

export function VoidScreen({ navigation }: Props) {
  const { data } = useLiveQuery(
    db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.status, 'active'), isNull(tasks.deleted_at)))
  );
  const voidCount = data?.[0]?.count ?? 0;

  const requestTask = async () => {
    const activeTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.status, 'active'), isNull(tasks.deleted_at)));

    const picked = pickTask(activeTasks, Date.now());
    if (!picked) return;

    navigation.navigate('Task', { taskId: picked.id });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.count}>
        {voidCount} task{voidCount !== 1 ? 's' : ''} in the void
      </Text>
      <Button
        title="Request task"
        onPress={requestTask}
        disabled={voidCount === 0}
      />
      <Button title="Create task" onPress={() => navigation.navigate('CreateTask')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  count: {
    fontSize: 20,
  },
});
