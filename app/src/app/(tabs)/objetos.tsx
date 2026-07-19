import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Categories, type Friend, type Item } from '@/lib/types';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ItemsScreen() {
  const theme = useTheme();
  const userId = useSession().user?.id;
  const [items, setItems] = useState<Item[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  // Ficha del objeto nuevo
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  // Panel "Prestar": objeto elegido, amigo y fechas
  const [lendItemId, setLendItemId] = useState<number | null>(null);
  const [borrowerId, setBorrowerId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [itemList, friendList] = await Promise.all([api.items(), api.friends()]);
      setItems(itemList);
      setFriends(friendList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando objetos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.4,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    // En web el uri ya suele ser un data URI; en nativo lo montamos del base64
    setPhoto(
      asset.uri.startsWith('data:')
        ? asset.uri
        : `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
    );
  };

  const addItem = async () => {
    if (!name.trim() || !description.trim() || !category || !photo) {
      setError('La ficha necesita nombre, foto, estado y categoría');
      return;
    }
    try {
      setError(null);
      await api.createItem({
        name: name.trim(),
        description: description.trim(),
        category,
        photo,
      });
      setName('');
      setDescription('');
      setCategory(null);
      setPhoto(null);
      setShowForm(false);
      setNotice('Objeto registrado');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const openLend = (item: Item) => {
    setLendItemId(lendItemId === item.id ? null : item.id);
    setBorrowerId(null);
    setStartDate(todayISO());
    setDueDate('');
    setNotice(null);
    setError(null);
  };

  const sendLoan = async (item: Item) => {
    if (!borrowerId) {
      setError('Elige al amigo al que se lo prestas');
      return;
    }
    if (!startDate.trim()) {
      setError('Falta la fecha del préstamo');
      return;
    }
    try {
      setError(null);
      await api.createLoan({
        item_id: item.id,
        borrower_id: borrowerId,
        start_date: startDate.trim(),
        due_date: dueDate.trim() || null,
      });
      const friend = friends.find((f) => f.id === borrowerId);
      setNotice(`Invitación de préstamo de "${item.name}" enviada a ${friend?.name}`);
      setLendItemId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const byFilter = (item: Item) => !filter || item.category === filter;
  const mine = items.filter((i) => i.owner_id === userId && byFilter(i));
  const others = items.filter((i) => i.owner_id !== userId && byFilter(i));

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

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

          <View style={styles.chipRow}>
            <Chip label="Todas" selected={!filter} onPress={() => setFilter(null)} />
            {Categories.map((c) => (
              <Chip key={c} label={c} selected={filter === c} onPress={() => setFilter(filter === c ? null : c)} />
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">Mis objetos</ThemedText>
            {mine.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Aún no has registrado objetos{filter ? ` de ${filter}` : ''}
              </ThemedText>
            )}
            {mine.map((item) => (
              <ItemCard key={item.id} item={item}>
                {item.loan_status === 'pendiente' && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Invitación pendiente: esperando a {item.loan_borrower_name}
                  </ThemedText>
                )}
                {item.loan_status === 'aceptado' && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Prestado a {item.loan_borrower_name}
                  </ThemedText>
                )}
                {!item.loan_status && (
                  <Button label={lendItemId === item.id ? 'Cancelar' : 'Prestar'} onPress={() => openLend(item)} />
                )}

                {lendItemId === item.id && !item.loan_status && (
                  <View style={styles.lendPanel}>
                    <ThemedText type="small" themeColor="textSecondary">
                      ¿A quién se lo prestas?
                    </ThemedText>
                    {friends.length === 0 && (
                      <ThemedText type="small" themeColor="textSecondary">
                        Todavía no tienes amigos: invita a alguien desde la pestaña Amigos
                      </ThemedText>
                    )}
                    <View style={styles.chipRow}>
                      {friends.map((f) => (
                        <Chip
                          key={f.id}
                          label={f.name}
                          selected={borrowerId === f.id}
                          onPress={() => setBorrowerId(f.id)}
                        />
                      ))}
                    </View>
                    <View style={styles.dateRow}>
                      <View style={styles.dateField}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Fecha del préstamo
                        </ThemedText>
                        <TextInput
                          value={startDate}
                          onChangeText={setStartDate}
                          placeholder="AAAA-MM-DD"
                          placeholderTextColor={theme.textSecondary}
                          style={inputStyle}
                        />
                      </View>
                      <View style={styles.dateField}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Devolución (opcional)
                        </ThemedText>
                        <TextInput
                          value={dueDate}
                          onChangeText={setDueDate}
                          placeholder="AAAA-MM-DD"
                          placeholderTextColor={theme.textSecondary}
                          style={inputStyle}
                        />
                      </View>
                    </View>
                    <Button label="Enviar invitación" onPress={() => sendLoan(item)} />
                  </View>
                )}
              </ItemCard>
            ))}

            {!showForm && <Button label="Registrar objeto" onPress={() => setShowForm(true)} />}
            {showForm && (
              <ThemedView type="backgroundElement" style={styles.form}>
                <ThemedText type="smallBold">Ficha del objeto</ThemedText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre (p. ej. Taladro)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Estado del objeto (p. ej. como nuevo, le falta una pieza…)"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <View style={styles.chipRow}>
                  {Categories.map((c) => (
                    <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
                  ))}
                </View>
                <View style={styles.photoRow}>
                  <Button label={photo ? 'Cambiar foto' : 'Elegir foto'} onPress={pickPhoto} />
                  {photo && <Image source={{ uri: photo }} style={styles.photoPreview} contentFit="cover" />}
                </View>
                <View style={styles.actions}>
                  <Button label="Guardar" onPress={addItem} />
                  <Button label="Cancelar" variant="danger" onPress={() => setShowForm(false)} />
                </View>
              </ThemedView>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">De mis amigos</ThemedText>
            {others.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Tus amigos aún no han añadido objetos{filter ? ` de ${filter}` : ''}
              </ThemedText>
            )}
            {others.map((item) => (
              <ItemCard key={item.id} item={item}>
                {item.loan_status === 'aceptado' && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Prestado a {item.loan_borrower_name}
                  </ThemedText>
                )}
              </ItemCard>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
        <ThemedText type={selected ? 'smallBold' : 'small'}>{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function ItemCard({ item, children }: { item: Item; children?: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardRow}>
        {!!item.photo && <Image source={{ uri: item.photo }} style={styles.photo} contentFit="cover" />}
        <View style={styles.cardInfo}>
          <ThemedText>{item.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.category ? `${item.category} · ` : ''}de {item.owner_name}
          </ThemedText>
          {!!item.description && (
            <ThemedText type="small" themeColor="textSecondary">
              {item.description}
            </ThemedText>
          )}
        </View>
      </View>
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
    alignItems: 'stretch',
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  cardInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: Spacing.two,
  },
  form: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  lendPanel: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  dateField: {
    flex: 1,
    minWidth: 140,
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 14,
  },
  error: {
    color: '#e5484d',
  },
});
