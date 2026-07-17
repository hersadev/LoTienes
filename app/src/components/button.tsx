import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = PressableProps & {
  label: string;
  variant?: 'default' | 'danger';
};

export function Button({ label, variant = 'default', disabled, ...props }: Props) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      <ThemedView type="backgroundSelected" style={styles.button}>
        <ThemedText type="smallBold" style={variant === 'danger' && styles.dangerText}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  dangerText: {
    color: '#e5484d',
  },
});
