import AppTabs from '@/components/app-tabs';
import { LoginScreen } from '@/components/login-screen';
import { useSession } from '@/lib/session';

// Las pestañas solo se ven con sesión; sin ella, la pantalla de entrada.
// La ruta /invitacion/[token] queda fuera a propósito: debe abrirse sin cuenta.
export default function TabsLayout() {
  const { user, loading } = useSession();
  if (loading) return null;
  if (!user) return <LoginScreen />;
  return <AppTabs />;
}
