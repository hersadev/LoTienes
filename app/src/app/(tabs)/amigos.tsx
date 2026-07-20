import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenBackdrop } from '@/components/screen-backdrop';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, DesktopMinWidth, MaxContentWidth, Spacing, WideContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/dates';
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
  const theme = useTheme();
  const wide = useWindowDimensions().width >= DesktopMinWidth;
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
      {wide && <ScreenBackdrop />}
      <SafeAreaView style={[styles.safeArea, wide && styles.safeAreaWide]}>
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
            <ThemedText type="small" style={{ color: theme.tint }}>
              {notice}
            </ThemedText>
          )}

          <Card highlight style={wide && styles.inviteCardWide}>
            <ThemedText type="smallBold">Invita a un amigo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Le mandas un enlace; si no tiene la app, desde ahí se registra y quedáis como amigos.
            </ThemedText>
            <Button label="Compartir invitación" variant="primary" fullWidth onPress={invite} />
          </Card>

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitleText}>
              Mis amigos
            </ThemedText>
            {friends.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Todavía no tienes amigos aquí: invita a alguien 👆
              </ThemedText>
            )}
            <View style={styles.grid}>
              {friends.map((friend) => (
                <Card key={friend.id} style={styles.gridItem}>
                  <View style={styles.friendRow}>
                    <Avatar name={friend.name} size={44} />
                    <View style={styles.friendInfo}>
                      <ThemedText type="smallBold" style={styles.friendName}>
                        {friend.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {friend.email} · desde el {formatDate(friend.friends_since)}
                      </ThemedText>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </View>

          {pending.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitleText}>
                Invitaciones sin usar
              </ThemedText>
              <View style={styles.grid}>
                {pending.map((inv) => (
                  <Card key={inv.id} style={styles.gridItem}>
                    <View style={styles.inviteRow}>
                      <View style={styles.friendInfo}>
                        <Badge label={`Creada el ${formatDate(inv.created_at)}`} tone="warning" />
                        <ThemedText type="code" numberOfLines={1} themeColor="textSecondary">
                          {inviteShareUrl(inv)}
                        </ThemedText>
                      </View>
                      <Button label="Compartir" size="sm" onPress={() => share(inv)} />
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}

          {accepted.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitleText}>
                Invitaciones aceptadas
              </ThemedText>
              <View style={styles.grid}>
                {accepted.map((inv) => (
                  <Card key={inv.id} style={styles.gridItem}>
                    <View style={styles.friendRow}>
                      <Avatar name={inv.accepted_by_name ?? '?'} size={32} />
                      <ThemedText type="small" themeColor="textSecondary" style={styles.friendInfo}>
                        La aceptó {inv.accepted_by_name} el {formatDate(inv.accepted_at)}
                      </ThemedText>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}

          {/* En escritorio la sesión y el botón de salir ya viven en el header
              de arriba; aquí queda como respaldo en móvil / ventana estrecha. */}
          {!wide && (
            <View style={[styles.sessionRow, { borderTopColor: theme.border }]}>
              {user && <Avatar name={user.name} size={32} />}
              <ThemedText type="small" themeColor="textSecondary" style={styles.friendInfo}>
                Conectado como {user?.name}
              </ThemedText>
              <Button label="Salir" variant="danger" size="sm" onPress={logout} />
            </View>
          )}
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
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  safeAreaWide: {
    maxWidth: WideContentWidth,
  },
  scroll: {
    padding: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  inviteCardWide: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionTitleText: {
    fontSize: 18,
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: 320,
    minWidth: 260,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  friendInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  friendName: {
    fontSize: 16,
    lineHeight: 22,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
  },
  error: {
    color: '#e5484d',
  },
});
