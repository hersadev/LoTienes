import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
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
          <View style={styles.hero}>
            <View style={[styles.logo, { backgroundColor: theme.tintSoft }]}>
              <ThemedText style={styles.logoIcon}>🤝</ThemedText>
            </View>
            <ThemedText type="subtitle">
              Lo<ThemedText type="subtitle" style={{ color: theme.tint }}>Tienes</ThemedText>
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
              Préstate cosas con tus amigos: quién tiene qué y hasta cuándo.
            </ThemedText>
          </View>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error} — ¿está arrancado el backend? (docker compose up)
            </ThemedText>
          )}

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitleText}>
              ¿Quién eres?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Entrada provisional sin contraseña, solo para desarrollo.
            </ThemedText>
            {users.map((user) => (
              <Pressable
                key={user.id}
                onPress={() => login(user)}
                style={({ pressed }) => pressed && styles.pressed}>
                <Card>
                  <View style={styles.userRow}>
                    <Avatar name={user.name} size={44} />
                    <View style={styles.userInfo}>
                      <ThemedText type="smallBold" style={styles.userName}>
                        {user.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {user.email}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={{ color: theme.tint }}>
                      Entrar →
                    </ThemedText>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitleText}>
              ¿Eres nuevo?
            </ThemedText>
            <Card>
              <TextField label="Tu nombre" value={name} onChangeText={setName} placeholder="P. ej. María" />
              <TextField
                label="Tu email"
                value={email}
                onChangeText={setEmail}
                placeholder="maria@ejemplo.com"
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={register}
              />
              <Button label="Crear cuenta y entrar" variant="primary" fullWidth onPress={register} />
            </Card>
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
    padding: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
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
  tagline: {
    textAlign: 'center',
    maxWidth: 280,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionTitleText: {
    fontSize: 18,
    lineHeight: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  userInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  userName: {
    fontSize: 16,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
  },
});
