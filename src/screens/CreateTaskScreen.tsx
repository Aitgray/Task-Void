import { useState } from 'react';
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { uuidv7 } from 'uuidv7';
import { db } from '../db/client';
import { tasks } from '../db/schema';
import type { CreateTaskNavProp } from '../navigation/types';

type Props = { navigation: CreateTaskNavProp };

const PRIORITIES = [1, 2, 3, 4, 5] as const;

export function CreateTaskScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(3);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for this task.');
      return;
    }

    const now = Date.now();
    await db.insert(tasks).values({
      id: uuidv7(),
      title: title.trim(),
      description: description.trim() || null,
      base_priority: priority,
      scheduled_at: now,
      status: 'active',
      retained: 0,
      skip_count: 0,
      created_at: now,
      updated_at: now,
    });

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="What needs doing?"
        autoFocus
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Any extra detail"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => setPriority(n)}
            style={[styles.priorityBtn, priority === n && styles.priorityBtnActive]}
          >
            <Text style={[styles.priorityText, priority === n && styles.priorityTextActive]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.saveBtn}>
        <Button title="Send to void" onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  multiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
  },
  priorityBtnActive: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  priorityText: {
    fontSize: 16,
    color: '#000',
  },
  priorityTextActive: {
    color: '#fff',
  },
  saveBtn: {
    marginTop: 24,
  },
});
