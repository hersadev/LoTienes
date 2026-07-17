import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { api, CURRENT_USER_ID } from '@/lib/api';
import type { Loan } from '@/lib/types';

export default function LoansScreen() {
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
  const history = loans.filter((l) => l.status === 'rechazado' || l.status === 'devuelto');

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

          <Section title="Solicitudes pendientes" empty="No hay solicitudes" loans={pending}>
            {(loan) =>
              loan.owner_id === CURRENT_USER_ID ? (
                <View style={styles.actions}>
                  <Button label="Aceptar" onPress={() => act(loan.id, 'accept')} />
                  <Button label="Rechazar" variant="danger" onPress={() => act(loan.id, 'reject')} />
                </View>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Esperando respuesta de {loan.owner_name}
                </ThemedText>
              )
            }
          </Section>

          <Section title="En curso" empty="Nada prestado ahora mismo" loans={active}>
            {(loan) => (
              <View style={styles.actions}>
                <ThemedText type="small" themeColor="textSecondary">
                  Lo tiene {loan.borrower_id === CURRENT_USER_ID ? 'tú' : loan.borrower_name}
                  {loan.due_date ? ` · devolver antes del ${loan.due_date}` : ''}
                </ThemedText>
                <Button label="Marcar devuelto" onPress={() => act(loan.id, 'return')} />
              </View>
            )}
          </Section>

          <Section title="Historial" empty="Sin historial todavía" loans={history}>
            {(loan) => (
              <ThemedText type="small" themeColor="textSecondary">
                {loan.status === 'devuelto' ? `Devuelto el ${loan.returned_at}` : 'Rechazado'}
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
  children,
}: {
  title: string;
  empty: string;
  loans: Loan[];
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
          <ThemedText>{loan.item_name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {loan.owner_name} → {loan.borrower_name} · pedido el {loan.requested_at}
          </ThemedText>
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
