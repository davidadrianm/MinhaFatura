import { parseHexColor, parseIntInRange, parseMoney, requireString, ValidationError } from './validation';

/** Valida os campos comuns de criação/edição de cartão. */
export function parseCardInput(body: Record<string, unknown>) {
  const name = requireString(body.name, 'Nome do cartão', 60);
  const bankName = requireString(body.bankName, 'Banco', 60);
  const brand = requireString(body.brand, 'Bandeira', 30);
  const closingDay = parseIntInRange(body.closingDay, 'Dia de fechamento', 1, 31);
  const dueDay = parseIntInRange(body.dueDay, 'Dia de vencimento', 1, 31);
  const color = parseHexColor(body.color);
  const parentCardId: string | null =
    typeof body.parentCardId === 'string' && body.parentCardId ? body.parentCardId : null;

  let limit: number | null = null;
  if (!parentCardId) {
    if (body.limit === undefined || body.limit === null || body.limit === '') {
      throw new ValidationError('Informe o limite do cartão');
    }
    limit = parseMoney(body.limit, 'Limite', { allowNegative: false, allowZero: true });
  }

  let lastDigits = '0000';
  if (body.lastDigits !== undefined) {
    const digits = String(body.lastDigits).replace(/\D/g, '').slice(-4);
    if (!/^\d{4}$/.test(digits)) throw new ValidationError('Informe os 4 últimos dígitos do cartão');
    lastDigits = digits;
  }

  return { name, bankName, brand, closingDay, dueDay, color, parentCardId, limit, lastDigits };
}
