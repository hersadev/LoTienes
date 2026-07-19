import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Loan } from '@/lib/types';

export default function LoansScreen() {
  const userId = useSession().user?.id;
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
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
          <ThemedText type="subtitle">Préstamos</ThemedText>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error} — ¿está arrancado el backend? (npm run dev en backend/)
            </ThemedText>
          )}

          <Section
            title="Invitaciones de préstamo"
            empty="No hay invitaciones pendientes"
            loans={pending}
            userId={userId}>
            {(loan) =>
              loan.borrower_id === userId ? (
                <View style={styles.actions}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {loan.owner_name} quiere prestarte este objeto
                  </ThemedText>
                  <Button label="Aceptar" onPress={() => act(loan.id, 'accept')} />
                  <Button label="Rechazar" variant="danger" onPress={() => act(loan.id, 'reject')} />
                </View>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Esperando a que {loan.borrower_name} acepte
                </ThemedText>
              )
            }
          </Section>

          <Section title="En curso" empty="Nada prestado ahora mismo" loans={active} userId={userId}>
            {(loan) => (
              <View style={styles.actions}>
                <ThemedText type="small" themeColor="textSecondary">
                  Lo tiene {loan.borrower_id === userId ? 'tú' : loan.borrower_name}
                  {loan.due_date ? ` · devolver antes del ${loan.due_date}` : ''}
                </ThemedText>
                {loan.owner_id === userId && (
                  <Button label="Marcar devuelto" onPress={() => act(loan.id, 'return')} />
                )}
              </View>
            )}
          </Section>

          <Section title="Préstamos pasados" empty="Sin préstamos pasados todavía" loans={past} userId={userId}>
            {(loan) => (
              <ThemedText type="small" themeColor="textSecondary">
                {loan.status === 'devuelto'
                  ? `Devuelto el ${loan.returned_at}`
                  : `${loan.borrower_name} no aceptó el préstamo`}
              </ThemedText>
            )}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({
  title,
  empty,
  loans,
  userId,
  children,
}: {
  title: string;
  empty: string;
  loans: Loan[];
  userId?: number;
  children: (loan: Loan) => React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {loans.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {empty}
        </ThemedText>
      )}
      {loans.map((loan) => (
        <ThemedView key={loan.id} type="backgroundElement" style={styles.card}>
          <View style={styles.cardRow}>
            {!!loan.item_photo && (
              <Image source={{ uri: loan.item_photo }} style={styles.photo} contentFit="cover" />
            )}
            <View style={styles.cardInfo}>
              <ThemedText>{loan.item_name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {loan.owner_id === userId ? `Prestado a ${loan.borrower_name}` : `Te lo presta ${loan.owner_name}`}
                {loan.start_date ? ` · desde el ${loan.start_date}` : ''}
              </ThemedText>
            </View>
          </View>
          {children(loan)}
        </ThemedView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
    padding: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
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
  photo: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
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
