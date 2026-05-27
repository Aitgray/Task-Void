import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { db } from './src/db/client';
import migrations from './src/drizzle/migrations';
import type { RootStackParamList } from './src/navigation/types';
import { ArchiveScreen } from './src/screens/ArchiveScreen';
import { CreateTaskScreen } from './src/screens/CreateTaskScreen';
import { LockScreen } from './src/screens/LockScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SkipScreen } from './src/screens/SkipScreen';
import { TaskScreen } from './src/screens/TaskScreen';
import { VoidScreen } from './src/screens/VoidScreen';
import { useSettings, useSession } from './src/store';
import { ThemeProvider, palettes } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { success, error } = useMigrations(db, migrations);
  const [ftsReady, setFtsReady] = useState(false);
  const [settingsReady, setSettingsReady] = useState(() => useSettings.persist.hasHydrated());

  const { colorPalette, privateMode } = useSettings();
  const { encryptionKey } = useSession();

  // Wait for Zustand to finish reading settings from AsyncStorage.
  useEffect(() => {
    if (settingsReady) return;
    const unsub = useSettings.persist.onFinishHydration(() => setSettingsReady(true));
    return unsub;
  }, [settingsReady]);

  // Rebuild the FTS index from the tasks table on every startup.
  useEffect(() => {
    if (!success) return;
    db.$client
      .execAsync(
        'DELETE FROM tasks_fts;' +
        'INSERT INTO tasks_fts(id, title, keywords, archive_notes) ' +
        "SELECT id, title, COALESCE(keywords,''), COALESCE(archive_notes,'') " +
        'FROM tasks WHERE retained = 1 AND encrypted = 0'
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

  if (!success || !ftsReady || !settingsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Starting up…</Text>
      </View>
    );
  }

  const palette = palettes[colorPalette];

  // Private mode: block the app behind a lock screen until the session key is set.
  if (privateMode && !encryptionKey) {
    return (
      <ThemeProvider paletteKey={colorPalette}>
        <StatusBar style={palette.statusBar} />
        <LockScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider paletteKey={colorPalette}>
      <StatusBar style={palette.statusBar} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Void"
          screenOptions={{
            headerStyle: { backgroundColor: palette.surface },
            headerTintColor: palette.text,
            contentStyle: { backgroundColor: palette.bg },
          }}
        >
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
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
