/**
 * Fuso horário usado para decidir "que dia/mês é hoje" no servidor.
 * Na Vercel o servidor roda em UTC; sem isso, entre 20h e 0h em Cuiabá
 * o app já considerava o dia seguinte.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Cuiaba';

/** Data de hoje no fuso do app, como { year, month (1-12), day, iso: 'YYYY-MM-DD' }. */
export function todayInAppTz(now: Date = new Date()) {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day, iso };
}

/** Parte de data (YYYY-MM-DD) de um Date armazenado como data de calendário em UTC. */
export function utcDateOnly(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

/** Desloca um par mês/ano (mês 1-12) em `delta` meses. */
export function addMonthsToRef(month: number, year: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

export function formatCalendarDate(date: Date | string): string {
  if (!date) return '';

  if (typeof date === 'string') {
    // Se for formato ISO simples YYYY-MM-DD
    const isoPart = date.split('T')[0];
    const parts = isoPart.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    // Fallback caso venha em outro formato de string
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } else {
    // Se for objeto Date
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
}
