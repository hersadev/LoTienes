import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';

import { Avatar } from './avatar';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { DesktopMinWidth, MaxContentWidth, Spacing, WideContentWidth } from '@/constants/theme';
import { useSession } from '@/lib/session';

export default function AppTabs() {
  return (
    // backBehavior 'firstRoute' (el valor por defecto) solo guarda [primera, actual]
    // en el historial de las tabs, así que el 2º cambio de pestaña no hace push en el
    // historial del navegador. 'fullHistory' añade cada cambio, como una página web normal,
    // para que "atrás" recorra las pestañas en el orden real en que se visitaron.
    <Tabs options={{ backBehavior: 'fullHistory' }}>
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
  const wide = width >= DesktopMinWidth;
  return (
    <View {...props} style={[styles.tabListContainer, compact && styles.tabListCompact]}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.innerContainer,
          compact && styles.innerCompact,
          !showBrand && styles.innerCentered,
          wide && styles.innerWide,
        ]}>
        {showBrand && (
          <ThemedText type="smallBold" style={styles.brandText}>
            Lo<ThemedText type="smallBold" themeColor="tint">Tienes</ThemedText>
          </ThemedText>
        )}

        {props.children}

        <ThemedView type="border" style={styles.divider} />
        <UserMenu compact={compact} />
      </ThemedView>
    </View>
  );
}

// Identidad de quien ha entrado + salir, siempre a mano en cualquier
// pestaña (antes solo se podía cerrar sesión desde Amigos).
function UserMenu({ compact }: { compact: boolean }) {
  const { user, logout } = useSession();
  if (!user) return null;
  return (
    <View style={styles.userMenu}>
      <Avatar name={user.name} size={28} />
      {!compact && (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.userName}>
          {user.name}
        </ThemedText>
      )}
      <Pressable onPress={logout} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="dangerSoft" style={styles.logoutPill}>
          <ThemedText type="small" themeColor="danger">
            Salir
          </ThemedText>
        </ThemedView>
      </Pressable>
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
  innerWide: {
    maxWidth: WideContentWidth,
  },
  innerCentered: {
    justifyContent: 'center',
  },
  brandText: {
    marginRight: 'auto',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: Spacing.one,
  },
  userMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  userName: {
    maxWidth: 120,
  },
  logoutPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
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
