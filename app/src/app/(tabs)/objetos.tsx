import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { addDaysISO, formatDate, todayISO } from '@/lib/dates';
import { useSession } from '@/lib/session';
import { Categories, type Friend, type Item } from '@/lib/types';

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
      setNotice('Objeto registrado ✅');
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
      setNotice(`Invitación de "${item.name}" enviada a ${friend?.name} ✅`);
      setLendItemId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const byFilter = (item: Item) => !filter || item.category === filter;
  const mine = items.filter((i) => i.owner_id === userId && byFilter(i));
  const others = items.filter((i) => i.owner_id !== userId && byFilter(i));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">Objetos</ThemedText>
            {!showForm && (
              <Button label="＋ Añadir" variant="primary" size="sm" onPress={() => setShowForm(true)} />
            )}
          </View>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}
          {notice && (
            <ThemedText type="small" style={{ color: theme.tint }}>
              {notice}
            </ThemedText>
          )}

          {showForm && (
            <Card>
              <ThemedText type="smallBold">Ficha del objeto</ThemedText>

              <Pressable onPress={pickPhoto} style={({ pressed }) => pressed && styles.pressed}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photoPreview} contentFit="cover" />
                ) : (
                  <View style={[styles.photoPlaceholder, { borderColor: theme.border }]}>
                    <ThemedText style={styles.photoIcon}>📷</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Añadir foto
                    </ThemedText>
                  </View>
                )}
              </Pressable>
              {photo && <Button label="Cambiar foto" size="sm" onPress={pickPhoto} />}

              <TextField
                label="Nombre"
                value={name}
                onChangeText={setName}
                placeholder="P. ej. Taladro"
              />
              <TextField
                label="Estado del objeto"
                value={description}
                onChangeText={setDescription}
                placeholder="P. ej. como nuevo, le falta una pieza…"
                multiline
              />
              <ThemedText type="small" themeColor="textSecondary">
                Categoría
              </ThemedText>
              <View style={styles.chipWrap}>
                {Categories.map((c) => (
                  <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
                ))}
              </View>
              <Button label="Guardar objeto" variant="primary" fullWidth onPress={addItem} />
              <Button label="Cancelar" variant="plain" fullWidth onPress={() => setShowForm(false)} />
            </Card>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}>
            <Chip label="Todas" selected={!filter} onPress={() => setFilter(null)} />
            {Categories.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={filter === c}
                onPress={() => setFilter(filter === c ? null : c)}
              />
            ))}
          </ScrollView>

          <View style={styles.section}>
            <SectionTitle title="Mis objetos" count={mine.length} />
            {mine.length === 0 && (
              <EmptyHint text={`Aún no has registrado objetos${filter ? ` de ${filter}` : ''}`} />
            )}
            {mine.map((item) => (
              <ItemCard key={item.id} item={item} isMine>
                {!item.loan_status && lendItemId !== item.id && (
                  <View style={styles.cardActions}>
                    <Button label="Prestar" variant="primary" size="sm" onPress={() => openLend(item)} />
                  </View>
                )}

                {lendItemId === item.id && !item.loan_status && (
                  <View style={[styles.lendPanel, { borderTopColor: theme.border }]}>
                    <ThemedText type="smallBold">¿A quién se lo prestas?</ThemedText>
                    {friends.length === 0 && (
                      <EmptyHint text="Todavía no tienes amigos: invita a alguien desde la pestaña Amigos" />
                    )}
                    <View style={styles.chipWrap}>
                      {friends.map((f) => (
                        <FriendChip
                          key={f.id}
                          friend={f}
                          selected={borrowerId === f.id}
                          onPress={() => setBorrowerId(f.id)}
                        />
                      ))}
                    </View>

                    <ThemedText type="small" themeColor="textSecondary">
                      ¿Cuándo se lo prestas?
                    </ThemedText>
                    <View style={styles.chipWrap}>
                      <Chip label="Hoy" selected={startDate === todayISO()} onPress={() => setStartDate(todayISO())} />
                      <Chip
                        label="Mañana"
                        selected={startDate === addDaysISO(1)}
                        onPress={() => setStartDate(addDaysISO(1))}
                      />
                    </View>
                    <TextField value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-DD" />

                    <ThemedText type="small" themeColor="textSecondary">
                      ¿Para cuándo lo quieres de vuelta? (opcional)
                    </ThemedText>
                    <View style={styles.chipWrap}>
                      <Chip label="Sin fecha" selected={dueDate === ''} onPress={() => setDueDate('')} />
                      <Chip label="1 semana" selected={dueDate === addDaysISO(7)} onPress={() => setDueDate(addDaysISO(7))} />
                      <Chip label="2 semanas" selected={dueDate === addDaysISO(14)} onPress={() => setDueDate(addDaysISO(14))} />
                      <Chip label="1 mes" selected={dueDate === addDaysISO(30)} onPress={() => setDueDate(addDaysISO(30))} />
                    </View>
                    {dueDate !== '' && (
                      <TextField value={dueDate} onChangeText={setDueDate} placeholder="AAAA-MM-DD" />
                    )}

                    <Button label="Enviar invitación" variant="primary" fullWidth onPress={() => sendLoan(item)} />
                    <Button label="Cancelar" variant="plain" fullWidth onPress={() => setLendItemId(null)} />
                  </View>
                )}
              </ItemCard>
            ))}
          </View>

          <View style={styles.section}>
            <SectionTitle title="De mis amigos" count={others.length} />
            {others.length === 0 && (
              <EmptyHint text={`Tus amigos aún no han añadido objetos${filter ? ` de ${filter}` : ''}`} />
            )}
            {others.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionTitle}>
      <ThemedText type="smallBold" style={styles.sectionTitleText}>
        {title}
      </ThemedText>
      {count != null && count > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {count}
        </ThemedText>
      )}
    </View>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {text}
    </ThemedText>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: selected ? theme.tint : theme.backgroundElement,
            borderColor: selected ? theme.tint : theme.border,
          },
        ]}>
        <ThemedText type={selected ? 'smallBold' : 'small'} style={{ color: selected ? theme.onTint : theme.text }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function FriendChip({
  friend,
  selected,
  onPress,
}: {
  friend: Friend;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.friendChip,
          {
            backgroundColor: selected ? theme.tintSoft : theme.backgroundElement,
            borderColor: selected ? theme.tint : theme.border,
          },
        ]}>
        <Avatar name={friend.name} size={24} />
        <ThemedText
          type={selected ? 'smallBold' : 'small'}
          numberOfLines={1}
          style={styles.friendChipName}>
          {friend.name}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function ItemCard({
  item,
  isMine,
  children,
}: {
  item: Item;
  isMine?: boolean;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.cardRow}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoEmpty, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.photoEmptyIcon}>📦</ThemedText>
          </View>
        )}
        <View style={styles.cardInfo}>
          <ThemedText type="smallBold" style={styles.cardName}>
            {item.name}
          </ThemedText>
          {!!item.description && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {item.description}
            </ThemedText>
          )}
          <View style={styles.badgeRow}>
            {!!item.category && <Badge label={item.category} />}
            {isMine && !item.loan_status && <Badge label="Disponible" tone="tint" />}
            {item.loan_status === 'pendiente' && (
              <Badge label={`Esperando a ${item.loan_borrower_name}`} tone="warning" />
            )}
            {item.loan_status === 'aceptado' && (
              <Badge label={`Prestado a ${item.loan_borrower_name}`} tone="warning" />
            )}
            {!isMine && <Badge label={`De ${item.owner_name}`} />}
          </View>
        </View>
      </View>
      {children}
    </Card>
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
    padding: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    gap: Spacing.two,
    alignItems: 'stretch',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionTitleText: {
    fontSize: 18,
    lineHeight: 24,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
  },
  cardInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  cardName: {
    fontSize: 16,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  photo: {
    width: 76,
    height: 76,
    borderRadius: Spacing.three,
  },
  photoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyIcon: {
    fontSize: 28,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: Spacing.three,
  },
  photoPlaceholder: {
    height: 140,
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  photoIcon: {
    fontSize: 32,
  },
  chipScroll: {
    marginHorizontal: -Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  friendChipName: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  lendPanel: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    marginTop: Spacing.one,
  },
  error: {
    color: '#e5484d',
  },
});
