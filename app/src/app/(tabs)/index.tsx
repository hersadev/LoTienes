import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, type BadgeTone } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenBackdrop } from '@/components/screen-backdrop';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, DesktopMinWidth, MaxContentWidth, Spacing, WideContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { useSession } from '@/lib/session';
import type { Loan } from '@/lib/types';

export default function LoansScreen() {
  const userId = useSession().user?.id;
  const wide = useWindowDimensions().width >= DesktopMinWidth;
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoans(await api.loans());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando préstamos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: number, action: 'accept' | 'reject' | 'return') => {
    try {
      await api.loanAction(id, action);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const pending = loans.filter((l) => l.status === 'pendiente');
  const active = loans.filter((l) => l.status === 'aceptado');
  const past = loans.filter((l) => l.status === 'rechazado' || l.status === 'devuelto');

  return (
    <ThemedView style={styles.container}>
      {wide && <ScreenBackdrop />}
      <SafeAreaView style={[styles.safeArea, wide && styles.safeAreaWide]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          <ThemedText type="subtitle">Préstamos</ThemedText>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error} — ¿está arrancado el backend? (docker compose up)
            </ThemedText>
          )}

          <Section title="Invitaciones" show>
            {pending.map((loan) => {
              const forMe = loan.borrower_id === userId;
              return (
                <LoanCard key={loan.id} loan={loan} userId={userId} highlight={forMe}>
                  {forMe ? (
                    <>
                      <ThemedText type="small" themeColor="textSecondary">
                        {loan.owner_name} quiere prestarte este objeto
                      </ThemedText>
                      <View style={styles.actions}>
                        <Button label="Aceptar" variant="primary" onPress={() => act(loan.id, 'accept')} />
                        <Button label="Rechazar" variant="danger" onPress={() => act(loan.id, 'reject')} />
                      </View>
                    </>
                  ) : (
                    <Badge label={`Esperando a ${loan.borrower_name}`} tone="warning" />
                  )}
                </LoanCard>
              );
            })}
            {pending.length === 0 && <EmptyHint text="No hay invitaciones pendientes" />}
          </Section>

          <Section title="En curso" show>
            {active.map((loan) => (
              <LoanCard key={loan.id} loan={loan} userId={userId}>
                <View style={styles.actions}>
                  <Badge
                    label={loan.borrower_id === userId ? 'Lo tienes tú' : `Lo tiene ${loan.borrower_name}`}
                    tone="tint"
                  />
                  {!!loan.due_date && <Badge label={`Devolver el ${formatDate(loan.due_date)}`} tone="warning" />}
                </View>
                {loan.owner_id === userId && (
                  <View style={styles.actions}>
                    <Button label="Marcar devuelto" variant="primary" size="sm" onPress={() => act(loan.id, 'return')} />
                  </View>
                )}
              </LoanCard>
            ))}
            {active.length === 0 && <EmptyHint text="Nada prestado ahora mismo" />}
          </Section>

          <Section title="Préstamos pasados" show={past.length > 0}>
            {past.map((loan) => (
              <LoanCard key={loan.id} loan={loan} userId={userId} muted>
                <Badge
                  label={
                    loan.status === 'devuelto'
                      ? `Devuelto el ${formatDate(loan.returned_at)}`
                      : `${loan.borrower_name} no lo aceptó`
                  }
                  tone={loan.status === 'devuelto' ? 'neutral' : 'danger'}
                />
              </LoanCard>
            ))}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({
  title,
  show,
  children,
}: {
  title: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionTitleText}>
        {title}
      </ThemedText>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {text}
    </ThemedText>
  );
}

function LoanCard({
  loan,
  userId,
  highlight,
  muted,
  children,
}: {
  loan: Loan;
  userId?: number;
  highlight?: boolean;
  muted?: boolean;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const mine = loan.owner_id === userId;
  return (
    <Card highlight={highlight} style={[styles.gridItem, muted && styles.muted]}>
      <View style={styles.cardRow}>
        {loan.item_photo ? (
          <Image source={{ uri: loan.item_photo }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoEmpty, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.photoEmptyIcon}>📦</ThemedText>
          </View>
        )}
        <View style={styles.cardInfo}>
          <ThemedText type="smallBold" style={styles.cardName}>
            {loan.item_name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {mine ? `Se lo prestas a ${loan.borrower_name}` : `Te lo presta ${loan.owner_name}`}
            {loan.start_date ? ` · desde el ${formatDate(loan.start_date)}` : ''}
          </ThemedText>
        </View>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  safeAreaWide: {
    maxWidth: WideContentWidth,
  },
  scroll: {
    padding: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionTitleText: {
    fontSize: 18,
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: 340,
    minWidth: 280,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  cardName: {
    fontSize: 16,
    lineHeight: 22,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: Spacing.three,
  },
  photoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyIcon: {
    fontSize: 22,
  },
  muted: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  error: {
    color: '#e5484d',
  },
});
