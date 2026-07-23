// Fechas en formato ISO (AAAA-MM-DD) y presentación legible en español

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// 'AAAA-MM-DD' con una fecha real: rechaza formatos distintos, texto libre
// ("ayer") y días que no existen (p. ej. 31/02)
export function isValidISODate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// '2026-07-20' o '2026-07-20 11:08:44' -> '20 jul' (con año si no es el actual)
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return iso;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
