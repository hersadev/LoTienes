import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = PressableProps & {
  label: string;
  // primary: acción principal (relleno de marca) · default: acción secundaria
  // danger: destructiva (fondo rojo suave) · plain: solo texto, sin fondo
  variant?: 'primary' | 'default' | 'danger' | 'plain';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
};

export function Button({
  label,
  variant = 'default',
  size = 'md',
  fullWidth,
  disabled,
  ...props
}: Props) {
  const theme = useTheme();

  const background = {
    primary: theme.tint,
    default: theme.backgroundSelected,
    danger: theme.dangerSoft,
    plain: 'transparent',
  }[variant];
  const color = {
    primary: theme.onTint,
    default: theme.text,
    danger: theme.danger,
    plain: theme.textSecondary,
  }[variant];

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View
        style={[
          styles.button,
          size === 'sm' ? styles.sm : styles.md,
          { backgroundColor: background },
        ]}>
        <ThemedText type="smallBold" style={{ color }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // Altura mínima pensada para el pulgar en el teléfono
  md: {
    minHeight: 44,
    paddingHorizontal: Spacing.four,
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
