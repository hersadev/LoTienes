import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
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
          <ThemedText type="subtitle">LoTienes</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            La app para prestarte cosas con tus amigos.
          </ThemedText>

          {loadError ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText>Esta invitación no existe o el enlace está mal copiado.</ThemedText>
              <ThemedText type="small" style={styles.errorText}>
                {loadError}
              </ThemedText>
              <Button label="Ir a la app" onPress={goToApp} />
            </ThemedView>
          ) : !info || sessionLoading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Cargando invitación…
            </ThemedText>
          ) : done ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText>
                ¡Hecho, {done.user.name}! {done.inviter.name} y tú ya sois amigos.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ya puedes ver sus objetos y pedírselos prestados.
              </ThemedText>
              <Button label="Entrar en LoTienes" onPress={goToApp} />
            </ThemedView>
          ) : info.status === 'aceptada' ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText>Esta invitación ya se usó.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Pídele a {info.inviter_name} que te mande otra, o entra si ya tienes cuenta.
              </ThemedText>
              <Button label="Ir a la app" onPress={goToApp} />
            </ThemedView>
          ) : user && user.id === info.inviter_id ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText>Esta invitación es tuya 😉</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Compártela desde la pestaña Amigos para que otra persona la acepte.
              </ThemedText>
              <Button label="Ir a la app" onPress={goToApp} />
            </ThemedView>
          ) : user ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText>
                {info.inviter_name} te invita a ser su amigo en LoTienes.
              </ThemedText>
              {error && (
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              )}
              <Button label={`Aceptar como ${user.name}`} onPress={accept} />
              <ThemedText type="small" themeColor="textSecondary" onPress={logout}>
                ¿No eres {user.name}? Cambiar de cuenta
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
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
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Tu email"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
                onSubmitEditing={accept}
              />
              <Button label="Aceptar la invitación" onPress={accept} />
            </ThemedView>
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
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  input: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
  },
  errorText: {
    color: '#e5484d',
  },
});
