import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { inviteShareUrl, shareInviteLink, type ShareResult } from '@/lib/share';
import type { Friend, Invite } from '@/lib/types';

const noticeByResult: Record<ShareResult, string | null> = {
  compartido: 'Invitación compartida ✅',
  copiado: 'Enlace copiado al portapapeles ✅',
  cancelado: null,
  manual: 'No se pudo copiar: usa el enlace de la lista de abajo',
};

export default function FriendsScreen() {
  const { user, logout } = useSession();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [f, i] = await Promise.all([api.friends(), api.myInvites()]);
      setFriends(f);
      setInvites(i);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando amigos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const share = async (invite: Invite) => {
    const result = await shareInviteLink(
      `¡Hola! Soy ${user?.name}. Únete a LoTienes y nos prestamos cosas:`,
      inviteShareUrl(invite)
    );
    setNotice(noticeByResult[result]);
  };

  // Crea la invitación y abre directamente la hoja de compartir
  const invite = async () => {
    try {
      setError(null);
      const created = await api.createInvite();
      await share(created);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creando la invitación');
    }
  };

  const pending = invites.filter((i) => i.status === 'pendiente');
  const accepted = invites.filter((i) => i.status === 'aceptada');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          <ThemedText type="subtitle">Amigos</ThemedText>

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

          <View style={styles.actions}>
            <Button label="Invitar a un amigo" onPress={invite} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Le mandas un enlace; si no tiene la app, desde ahí se registra en la web o se la
            descarga, y quedáis como amigos.
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold">Mis amigos</ThemedText>
            {friends.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Todavía no tienes amigos aquí: invita a alguien 👆
              </ThemedText>
            )}
            {friends.map((friend) => (
              <ThemedView key={friend.id} type="backgroundElement" style={styles.card}>
                <ThemedText>{friend.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {friend.email} · amigos desde el {friend.friends_since}
                </ThemedText>
              </ThemedView>
            ))}
          </View>

          {pending.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Invitaciones pendientes</ThemedText>
              {pending.map((inv) => (
                <ThemedView key={inv.id} type="backgroundElement" style={styles.card}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Creada el {inv.created_at} · sin usar
                  </ThemedText>
                  <ThemedText type="code" numberOfLines={1}>
                    {inviteShareUrl(inv)}
                  </ThemedText>
                  <View style={styles.actions}>
                    <Button label="Compartir de nuevo" onPress={() => share(inv)} />
                  </View>
                </ThemedView>
              ))}
            </View>
          )}

          {accepted.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Invitaciones aceptadas</ThemedText>
              {accepted.map((inv) => (
                <ThemedView key={inv.id} type="backgroundElement" style={styles.card}>
                  <ThemedText type="small" themeColor="textSecondary">
                    La aceptó {inv.accepted_by_name} el {inv.accepted_at}
                  </ThemedText>
                </ThemedView>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <ThemedText type="smallBold">Sesión</ThemedText>
            <View style={styles.actions}>
              <ThemedText type="small" themeColor="textSecondary">
                Conectado como {user?.name}
              </ThemedText>
              <Button label="Salir" variant="danger" onPress={logout} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  error: {
    color: '#e5484d',
  },
});
