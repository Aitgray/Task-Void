import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Text, View } from 'react-native';
import { db } from './src/db/client';
import migrations from './src/drizzle/migrations';
import type { RootStackParamList } from './src/navigation/types';
import { CreateTaskScreen } from './src/screens/CreateTaskScreen';
import { TaskScreen } from './src/screens/TaskScreen';
import { VoidScreen } from './src/screens/VoidScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Migration error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Running migrations…</Text>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
