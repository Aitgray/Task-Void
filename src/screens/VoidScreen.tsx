import { and, count, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Settings2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import type { VoidNavProp } from '../navigation/types';
import { pickTask } from '../scheduler';
import { useTheme } from '../theme';

type Props = { navigation: VoidNavProp };

export function VoidScreen({ navigation }: Props) {
  const theme = useTheme();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.headerBtn}
        >
          <Settings2 size={22} color={theme.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme.text]);

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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.count, { color: theme.text }]}>
        {voidCount} task{voidCount !== 1 ? 's' : ''} in the void
      </Text>
      <TouchableOpacity
        style={[
          styles.btn,
          { borderColor: theme.border, backgroundColor: theme.surface },
          voidCount === 0 && styles.btnDisabled,
        ]}
        onPress={requestTask}
        disabled={voidCount === 0}
      >
        <Text style={[styles.btnLabel, { color: voidCount === 0 ? theme.subtext : theme.text }]}>
          Request task
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={() => navigation.navigate('CreateTask')}
      >
        <Text style={[styles.btnLabel, { color: theme.text }]}>Create task</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={() => navigation.navigate('Archive')}
      >
        <Text style={[styles.btnLabel, { color: theme.text }]}>Archive</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  count: { fontSize: 20 },
  btn: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnLabel: { fontSize: 16 },
  headerBtn: { marginRight: 8, padding: 4 },
});
