import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Colores fijos por persona (se elige por hash del nombre): así cada amigo
// tiene siempre el mismo color en toda la app
const Palette = ['#0D9488', '#7C3AED', '#DB2777', '#D97706', '#2563EB', '#DC2626', '#059669'];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const background = Palette[hash % Palette.length];

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
      ]}>
      <ThemedText type="smallBold" style={[styles.initials, { fontSize: size * 0.4 }]}>
        {initials || '?'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#ffffff',
    lineHeight: undefined,
  },
});
