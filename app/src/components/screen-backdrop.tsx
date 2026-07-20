import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// Mismas formas de color que la landing (ver login-screen.tsx), pero más
// discretas: dan continuidad visual a los paneles internos sin robarle
// protagonismo al contenido. Se pintan detrás de todo con pointerEvents
// desactivados para no interferir con los toques.
export function ScreenBackdrop() {
  const theme = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, styles.blobTop, { backgroundColor: theme.tintSoft }]} />
      <View style={[styles.blob, styles.blobBottom, { backgroundColor: theme.warningSoft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 480,
    height: 480,
    borderRadius: 999,
    opacity: 0.4,
  },
  blobTop: {
    top: -200,
    right: -160,
  },
  blobBottom: {
    bottom: -240,
    left: -180,
  },
});
