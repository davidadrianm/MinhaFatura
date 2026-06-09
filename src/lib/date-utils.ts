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
