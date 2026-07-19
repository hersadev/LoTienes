import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Tarjeta base de toda la app. highlight=true la resalta con el color de marca
// (se usa para lo que pide acción, como una invitación pendiente).
export function Card({ style, highlight, ...props }: ViewProps & { highlight?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: highlight ? theme.tintSoft : theme.backgroundElement,
          borderColor: highlight ? theme.tint : theme.border,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.two,
  },
});
