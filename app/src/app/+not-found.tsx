import { router, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Sustituye a la pantalla "Unmatched Route" de expo-router (inglés, fondo
// negro forzado, enlace a Sitemap) por una acorde al resto de la app.
export default function NotFoundScreen() {
  const pathname = usePathname();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText style={styles.icon}>🔍</ThemedText>
          <ThemedText type="subtitle" style={styles.title}>
            Página no encontrada
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            No existe la ruta {pathname}.
          </ThemedText>
          <Button label="Ir a Préstamos" variant="primary" onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
});
