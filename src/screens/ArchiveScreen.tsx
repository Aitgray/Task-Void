import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { decryptTaskFields } from '../crypto';
import { db } from '../db/client';
import type { Task } from '../scheduler';
import { useSession } from '../store';
import { useTheme } from '../theme';

async function runSearch(q: string): Promise<Task[]> {
  if (!q.trim()) {
    return db.$client.getAllAsync<Task>(
      'SELECT * FROM tasks WHERE retained = 1 ORDER BY updated_at DESC'
    );
  }

  const ftsQuery = q
    .trim()
    .split(/\s+/)
    .map((w) => `${w}*`)
    .join(' ');

  try {
    return db.$client.getAllAsync<Task>(
      `SELECT * FROM tasks
       WHERE id IN (SELECT id FROM tasks_fts WHERE tasks_fts MATCH ?)
       AND retained = 1
       ORDER BY updated_at DESC`,
      [ftsQuery]
    );
  } catch (e) {
    console.error('FTS search error:', e);
    return [];
  }
}

export function ArchiveScreen() {
  const theme = useTheme();
  const encryptionKey = useSession((s) => s.encryptionKey);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Task[]>([]);

  const refresh = useCallback(() => {
    runSearch(query).then(setResults);
  }, [query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <TextInput
        style={[styles.searchInput, { borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text }]}
        value={query}
        onChangeText={setQuery}
        placeholder="Search archive…"
        placeholderTextColor={theme.subtext}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.subtext }]}>
            {query.trim() ? 'No matches.' : 'Nothing archived yet.'}
          </Text>
        }
        renderItem={({ item }) => {
          const display = decryptTaskFields(item, encryptionKey);
          return (
            <View style={[styles.item, { backgroundColor: theme.bg }]}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{display.title}</Text>
              <Text style={[styles.itemMeta, { color: theme.subtext }]}>
                {item.status} · {new Date(item.updated_at).toLocaleDateString()}
                {item.encrypted ? ' · 🔒' : ''}
              </Text>
            </View>
          );
        }}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInput: {
    margin: 12,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  empty: { textAlign: 'center', marginTop: 40 },
  item: { paddingHorizontal: 16, paddingVertical: 12 },
  itemTitle: { fontSize: 16 },
  itemMeta: { fontSize: 12, marginTop: 2 },
  separator: { height: 1, marginLeft: 16 },
});
