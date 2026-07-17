import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, CURRENT_USER_ID } from '@/lib/api';
import type { Item } from '@/lib/types';

export default function ItemsScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await api.items());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando objetos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = async () => {
    if (!newName.trim()) return;
    try {
      await api.createItem(newName.trim());
      setNewName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const requestLoan = async (item: Item) => {
    try {
      setError(null);
      await api.requestLoan(item.id);
      setNotice(`Solicitud enviada a ${item.owner_name} por "${item.name}"`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const mine = items.filter((i) => i.owner_id === CURRENT_USER_ID);
  const others = items.filter((i) => i.owner_id !== CURRENT_USER_ID);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          <ThemedText type="subtitle">Objetos</ThemedText>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}
          {notice && (
            <ThemedText type="small" themeColor="textSecondary">
              {notice}
            </ThemedText>
          )}

          <View style={styles.section}>
            <ThemedText type="smallBold">Mis objetos</ThemedText>
            {mine.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
            <View style={styles.addRow}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Añadir objeto (p. ej. Taladro)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                onSubmitEditing={addItem}
              />
              <Button label="Añadir" onPress={addItem} />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">De mis amigos</ThemedText>
            {others.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Tus amigos aún no han añadido objetos
              </ThemedText>
            )}
            {others.map((item) => (
              <ItemCard key={item.id} item={item}>
                <Button label="Pedir prestado" onPress={() => requestLoan(item)} />
              </ItemCard>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ItemCard({ item, children }: { item: Item; children?: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText>{item.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {item.description ? `${item.description} · ` : ''}de {item.owner_name}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scroll: {
    padding: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 14,
  },
  error: {
    color: '#e5484d',
  },
});
