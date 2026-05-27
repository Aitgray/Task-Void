import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { uuidv7 } from 'uuidv7';
import { encryptField } from '../crypto';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import type { CreateTaskNavProp } from '../navigation/types';
import { useSession } from '../store';
import { useTheme } from '../theme';

type Props = { navigation: CreateTaskNavProp };

const PRIORITIES = [1, 2, 3, 4, 5] as const;

export function CreateTaskScreen({ navigation }: Props) {
  const theme = useTheme();
  const encryptionKey = useSession((s) => s.encryptionKey);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(3);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for this task.');
      return;
    }

    const now = Date.now();
    const rawTitle = title.trim();
    const rawDesc = description.trim() || null;
    const useEncryption = !!encryptionKey;

    await db.insert(tasks).values({
      id: uuidv7(),
      title: useEncryption ? encryptField(encryptionKey!, rawTitle) : rawTitle,
      description: rawDesc && useEncryption ? encryptField(encryptionKey!, rawDesc) : rawDesc,
      base_priority: priority,
      scheduled_at: now,
      status: 'active',
      retained: 0,
      skip_count: 0,
      encrypted: useEncryption ? 1 : 0,
      created_at: now,
      updated_at: now,
    });

    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.label, { color: theme.text }]}>Title</Text>
      <TextInput
        style={[styles.input, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
        value={title}
        onChangeText={setTitle}
        placeholder="What needs doing?"
        placeholderTextColor={theme.subtext}
        autoFocus
      />

      <Text style={[styles.label, { color: theme.text }]}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Any extra detail"
        placeholderTextColor={theme.subtext}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <Text style={[styles.label, { color: theme.text }]}>Priority</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => setPriority(n)}
            style={[
              styles.priorityBtn,
              { borderColor: theme.border },
              priority === n && { borderColor: theme.accent, backgroundColor: theme.accent },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: theme.text },
                priority === n && { color: theme.bg },
              ]}
            >
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { borderColor: theme.accent, backgroundColor: theme.surface }]}
        onPress={save}
      >
        <Text style={[styles.saveBtnLabel, { color: theme.text }]}>Send to void</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontWeight: 'bold', marginTop: 16, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  priorityText: { fontSize: 16 },
  saveBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnLabel: { fontSize: 16 },
});
