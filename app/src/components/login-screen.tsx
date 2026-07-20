import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesktopMinWidth, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

// En pantallas anchas (web de escritorio) la entrada se presenta como una
// landing a pantalla completa; por debajo se usa el diseño compacto del móvil.
// El mismo punto de corte se reutiliza en los paneles internos.

const features = [
  {
    icon: '📦',
    title: 'Ficha de cada objeto',
    text: 'Foto, estado y categoría: queda claro qué prestas y cómo estaba.',
  },
  {
    icon: '🤝',
    title: 'Solo entre amigos',
    text: 'Invita con un enlace; tus cosas solo las ven tus amigos.',
  },
  {
    icon: '📅',
    title: 'Con fecha de vuelta',
    text: 'Cada préstamo apunta cuándo se presta y para cuándo vuelve.',
  },
];

// Entrada provisional sin contraseñas: eliges tu usuario (o creas uno) y la
// sesión queda guardada. Cuando haya auth de verdad, esta pantalla se sustituye.
export function LoginScreen() {
  const { login } = useSession();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // El error de registro se pinta junto al botón que lo provoca (el bloque de
  // arriba queda fuera de pantalla en la landing de escritorio)
  const [registerError, setRegisterError] = useState<string | null>(null);
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
      setRegisterError(null);
      login(await api.register(name.trim(), email.trim()));
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : 'Error creando la cuenta');
    }
  };

  const entry = (
    <>
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
          {registerError && (
            <ThemedText type="small" style={styles.error}>
              {registerError}
            </ThemedText>
          )}
          <Button label="Crear cuenta y entrar" variant="primary" fullWidth onPress={register} />
        </Card>
      </View>
    </>
  );

  if (width >= DesktopMinWidth) {
    return (
      <ThemedView style={styles.landingRoot}>
        <ScrollView contentContainerStyle={styles.landingScroll}>
          <View style={[styles.heroWrap, { minHeight: height }]}>
            <View style={[styles.blob, styles.blobTopLeft, { backgroundColor: theme.tintSoft }]} />
            <View style={[styles.blob, styles.blobBottomRight, { backgroundColor: theme.tintSoft }]} />
            <View style={[styles.blobSmall, { backgroundColor: theme.warningSoft }]} />

            <View style={styles.hero}>
              <View style={styles.heroLeft}>
                <View style={styles.brandRow}>
                  <View style={[styles.logo, { backgroundColor: theme.tintSoft }]}>
                    <ThemedText style={styles.logoIcon}>🤝</ThemedText>
                  </View>
                  <ThemedText type="subtitle">
                    Lo<ThemedText type="subtitle" style={{ color: theme.tint }}>Tienes</ThemedText>
                  </ThemedText>
                </View>

                <ThemedText style={[styles.headline, width < 1200 && styles.headlineMedium]}>
                  Presta tus cosas{'\n'}
                  <ThemedText
                    style={[styles.headline, width < 1200 && styles.headlineMedium, { color: theme.tint }]}>
                    sin perderles la pista.
                  </ThemedText>
                </ThemedText>

                <ThemedText themeColor="textSecondary" style={styles.heroTagline}>
                  Registras el objeto, eliges a qué amigo se lo dejas y los dos sabéis quién lo
                  tiene y cuándo vuelve.
                </ThemedText>

                <View style={styles.featureList}>
                  {features.map((f) => (
                    <View key={f.title} style={styles.featureRow}>
                      <View style={[styles.featureTile, { backgroundColor: theme.tintSoft }]}>
                        <ThemedText style={styles.featureIcon}>{f.icon}</ThemedText>
                      </View>
                      <View style={styles.featureText}>
                        <ThemedText type="smallBold" style={styles.featureTitle}>
                          {f.title}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {f.text}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.heroRight}>
                <View
                  style={[
                    styles.entryCard,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  {entry}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          <View style={styles.mobileHero}>
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

          {entry}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // ---- Landing de escritorio ----
  landingRoot: {
    flex: 1,
  },
  landingScroll: {
    flexGrow: 1,
  },
  heroWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  hero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.six,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.five,
  },
  heroLeft: {
    flex: 1,
    gap: Spacing.four,
    maxWidth: 640,
  },
  heroRight: {
    width: 420,
    flexShrink: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headline: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: 700,
  },
  headlineMedium: {
    fontSize: 44,
    lineHeight: 52,
  },
  heroTagline: {
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 480,
  },
  featureList: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  featureRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  featureTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 24,
    lineHeight: 30,
  },
  featureText: {
    flex: 1,
    gap: Spacing.half,
    maxWidth: 420,
  },
  featureTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  entryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    boxShadow: '0 16px 32px rgba(13, 148, 136, 0.12)',
  },
  // Formas decorativas del fondo (solo color de tema, sin imágenes)
  blob: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 999,
    opacity: 0.55,
  },
  blobTopLeft: {
    top: -220,
    left: -160,
  },
  blobBottomRight: {
    bottom: -260,
    right: -140,
  },
  blobSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    opacity: 0.5,
    top: '18%',
    right: '38%',
  },

  // ---- Versión compacta (móvil / ventana estrecha) ----
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
  mobileHero: {
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

  // ---- Compartido ----
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
