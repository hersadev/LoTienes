import { Platform, Share } from 'react-native';

import type { Invite } from './types';

export type ShareResult = 'compartido' | 'copiado' | 'cancelado' | 'manual';

// URL a compartir de una invitación. El backend la construye con PUBLIC_WEB_URL;
// en web preferimos el origen actual, que funciona también entrando por IP local.
export function inviteShareUrl(invite: Invite): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return new URL(`/invitacion/${invite.token}`, window.location.origin).toString();
  }
  return invite.url;
}

// Comparte el enlace: hoja nativa en móvil; en web, share del navegador si
// existe y si no, portapapeles. 'manual' = no se pudo, enséñale la URL al usuario.
export async function shareInviteLink(message: string, url: string): Promise<ShareResult> {
  const text = `${message} ${url}`;
  if (Platform.OS !== 'web') {
    const result = await Share.share({ message: text });
    return result.action === Share.dismissedAction ? 'cancelado' : 'compartido';
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text: message, url });
      return 'compartido';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelado';
      // p. ej. NotAllowedError sin gesto de usuario: probamos el portapapeles
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copiado';
  } catch {
    // portapapeles no disponible (p. ej. http sin https desde otra máquina)
    return 'manual';
  }
}
