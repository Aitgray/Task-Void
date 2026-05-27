import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { db } from './src/db/client';
import migrations from './src/drizzle/migrations';
import type { RootStackParamList } from './src/navigation/types';
import { ArchiveScreen } from './src/screens/ArchiveScreen';
import { CreateTaskScreen } from './src/screens/CreateTaskScreen';
import { SkipScreen } from './src/screens/SkipScreen';
import { TaskScreen } from './src/screens/TaskScreen';
import { VoidScreen } from './src/screens/VoidScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { success, error } = useMigrations(db, migrations);
  const [ftsReady, setFtsReady] = useState(false);

  // Rebuild the FTS index from the tasks table on every startup.
  // This is the source of truth — triggers in the migration may not fire
  // reliably in all expo-sqlite builds, so we never depend on them alone.
  useEffect(() => {
    if (!success) return;
    db.$client
      .execAsync(
        "DELETE FROM tasks_fts;" +
        "INSERT INTO tasks_fts(id, title, keywords, archive_notes) " +
        "SELECT id, title, COALESCE(keywords,''), COALESCE(archive_notes,'') " +
        "FROM tasks WHERE retained = 1"
      )
      .catch(console.error)
      .finally(() => setFtsReady(true));
  }, [success]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Migration error: {error.message}</Text>
      </View>
    );
  }

  if (!success || !ftsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Starting up…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Void">
        <Stack.Screen
          name="Void"
          component={VoidScreen}
          options={{ title: 'Into the Void' }}
        />
        <Stack.Screen
          name="CreateTask"
          component={CreateTaskScreen}
          options={{ title: 'New Task' }}
        />
        <Stack.Screen
          name="Task"
          component={TaskScreen}
          options={{ title: 'Your Task' }}
        />
        <Stack.Screen
          name="SkipTask"
          component={SkipScreen}
          options={{ title: 'Skip & Requeue' }}
        />
        <Stack.Screen
          name="Archive"
          component={ArchiveScreen}
          options={{ title: 'Archive' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
