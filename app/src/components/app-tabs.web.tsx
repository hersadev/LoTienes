import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Préstamos</TabButton>
          </TabTrigger>
          <TabTrigger name="objetos" href="/objetos" asChild>
            <TabButton>Objetos</TabButton>
          </TabTrigger>
          <TabTrigger name="amigos" href="/amigos" asChild>
            <TabButton>Amigos</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

// Por debajo de este ancho la barra pasa a modo compacto (menos padding);
// por debajo de BrandMinWidth el logo no cabe junto a las tres pestañas.
const CompactWidth = 480;
const BrandMinWidth = 400;

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const compact = useWindowDimensions().width < CompactWidth;
  return (
    <Pressable {...props} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'tintSoft' : 'backgroundElement'}
        style={[styles.tabButtonView, compact && styles.tabButtonCompact]}>
        <ThemedText
          type={isFocused ? 'smallBold' : 'small'}
          themeColor={isFocused ? 'tint' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();
  const compact = width < CompactWidth;
  const showBrand = width >= BrandMinWidth;
  return (
    <View {...props} style={[styles.tabListContainer, compact && styles.tabListCompact]}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.innerContainer,
          compact && styles.innerCompact,
          !showBrand && styles.innerCentered,
        ]}>
        {showBrand && (
          <ThemedText type="smallBold" style={styles.brandText}>
            Lo<ThemedText type="smallBold" themeColor="tint">Tienes</ThemedText>
          </ThemedText>
        )}

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  tabListCompact: {
    padding: Spacing.two,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  innerCompact: {
    paddingHorizontal: Spacing.three,
  },
  innerCentered: {
    justifyContent: 'center',
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  tabButtonCompact: {
    paddingHorizontal: Spacing.two,
  },
});
