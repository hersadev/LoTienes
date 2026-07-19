import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { AcceptInviteResult, InviteInfo } from '@/lib/types';

// Aterrizaje del enlace de invitación. Se abre sin cuenta (queda fuera del
// grupo (tabs)): sirve la misma ruta en web y por deep link lotienes://
export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user, loading: sessionLoading, login, logout } = useSession();
  const theme = useTheme();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<AcceptInviteResult | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    api
      .inviteInfo(String(token))
      .then(setInfo)
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Error cargando la invitación'));
  }, [token]);

  const accept = useCallback(async () => {
    try {
      setError(null);
      const result = await api.acceptInvite(
        String(token),
        user ? undefined : { name: name.trim(), email: email.trim() }
      );
      login(result.user);
      setDone(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error aceptando la invitación');
    }
  }, [token, user, name, email, login]);

  const goToApp = () => router.replace('/');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <View style={[styles.logo, { backgroundColor: theme.tintSoft }]}>
              <ThemedText style={styles.logoIcon}>🤝</ThemedText>
            </View>
            <ThemedText type="subtitle">
              Lo<ThemedText type="subtitle" themeColor="tint">Tienes</ThemedText>
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              La app para prestarte cosas con tus amigos.
            </ThemedText>
          </View>

          {loadError ? (
            <Card style={styles.card}>
              <ThemedText>Esta invitación no existe o el enlace está mal copiado.</ThemedText>
              <ThemedText type="small" style={styles.errorText}>
                {loadError}
              </ThemedText>
              <Button label="Ir a la app" onPress={goToApp} />
            </Card>
          ) : !info || sessionLoading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Cargando invitación…
            </ThemedText>
          ) : done ? (
            <Card style={styles.card}>
              <ThemedText>
                ¡Hecho, {done.user.name}! {done.inviter.name} y tú ya sois amigos.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ya puedes ver sus objetos y pedírselos prestados.
              </ThemedText>
              <Button label="Entrar en LoTienes" variant="primary" onPress={goToApp} />
            </Card>
          ) : info.status === 'aceptada' ? (
            <Card style={styles.card}>
              <ThemedText>Esta invitación ya se usó.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Pídele a {info.inviter_name} que te mande otra, o entra si ya tienes cuenta.
              </ThemedText>
              <Button label="Ir a la app" onPress={goToApp} />
            </Card>
          ) : user && user.id === info.inviter_id ? (
            <Card style={styles.card}>
              <ThemedText>Esta invitación es tuya 😉</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Compártela desde la pestaña Amigos para que otra persona la acepte.
              </ThemedText>
              <Button label="Ir a la app" onPress={goToApp} />
            </Card>
          ) : user ? (
            <Card style={styles.card}>
              <ThemedText>
                {info.inviter_name} te invita a ser su amigo en LoTienes.
              </ThemedText>
              {error && (
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              )}
              <Button label={`Aceptar como ${user.name}`} variant="primary" fullWidth onPress={accept} />
              <ThemedText type="small" themeColor="textSecondary" onPress={logout}>
                ¿No eres {user.name}? Cambiar de cuenta
              </ThemedText>
            </Card>
          ) : (
            <Card style={styles.card}>
              <ThemedText>
                {info.inviter_name} te invita a ser su amigo en LoTienes.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Crea tu cuenta para aceptar. Si ya tienes una, pon tu email y entras con ella.
              </ThemedText>
              {error && (
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              )}
              <TextField value={name} onChangeText={setName} placeholder="Tu nombre" />
              <TextField
                value={email}
                onChangeText={setEmail}
                placeholder="Tu email"
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={accept}
              />
              <Button label="Aceptar la invitación" variant="primary" fullWidth onPress={accept} />
            </Card>
          )}

          {Platform.OS === 'web' && !done && !loadError && (
            <View style={styles.section}>
              <ThemedText type="smallBold">¿Prefieres usarlo en el móvil?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Si ya tienes la app instalada, abre esta invitación directamente ahí:
              </ThemedText>
              <View style={styles.actions}>
                <Button
                  label="Abrir en la app"
                  onPress={() => {
                    window.location.href = `lotienes://invitacion/${String(token)}`;
                  }}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Descargarla de App Store / Google Play: pendiente de publicar. De momento también
                puedes usarla en el navegador registrándote aquí arriba.
              </ThemedText>
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
  },
  safeArea: {
    flex: 1,
    maxWidth: 480,
  },
  scroll: {
    padding: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 36,
    lineHeight: 44,
  },
  actions: {
    flexDirection: 'row',
  },
  errorText: {
    color: '#e5484d',
  },
});
