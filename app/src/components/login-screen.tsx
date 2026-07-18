import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

// Entrada provisional sin contraseñas: eliges tu usuario (o creas uno) y la
// sesión queda guardada. Cuando haya auth de verdad, esta pantalla se sustituye.
export function LoginScreen() {
  const { login } = useSession();
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setUsers(await api.users());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const register = async () => {
    if (!name.trim() || !email.trim()) return;
    try {
      setError(null);
      login(await api.register(name.trim(), email.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creando la cuenta');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          <ThemedText type="subtitle">LoTienes</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Préstate cosas con tus amigos: quién tiene qué y hasta cuándo.
          </ThemedText>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error} — ¿está arrancado el backend? (docker compose up)
            </ThemedText>
          )}

          <View style={styles.section}>
            <ThemedText type="smallBold">¿Quién eres?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Entrada provisional sin contraseña, solo para desarrollo.
            </ThemedText>
            {users.map((user) => (
              <Pressable
                key={user.id}
                onPress={() => login(user)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText>{user.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {user.email}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">¿Eres nuevo? Crea tu cuenta</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Tu email"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              onSubmitEditing={register}
            />
            <View style={styles.actions}>
              <Button label="Crear cuenta y entrar" onPress={register} />
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
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  input: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
  },
});
