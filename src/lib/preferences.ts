/**
 * Preferências do usuário (tela de Perfil), salvas na tabela User.
 * Este arquivo não acessa o banco, então pode ser usado no cliente e no servidor.
 */

export const CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CENT_ROUNDING = ['first', 'last'] as const;
export type CentRounding = (typeof CENT_ROUNDING)[number];

export interface UserPreferences {
  currency: Currency;
  centRounding: CentRounding;
  showTxByInvoice: boolean;
  notifyInvoiceClose: boolean;
  notifyLimitExceeded: boolean;
  notifyMonthlyReport: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'BRL',
  centRounding: 'first',
  showTxByInvoice: false,
  notifyInvoiceClose: true,
  notifyLimitExceeded: true,
  notifyMonthlyReport: false,
};

/** Campos do User que formam as preferências (para `select` do Prisma). */
export const PREFERENCES_SELECT = {
  currency: true,
  centRounding: true,
  showTxByInvoice: true,
  notifyInvoiceClose: true,
  notifyLimitExceeded: true,
  notifyMonthlyReport: true,
} as const;

const SYMBOLS: Record<Currency, string> = { BRL: 'R$', USD: 'US$', EUR: '€' };

/** Símbolo exibido antes dos valores. Só muda o símbolo: os valores não são convertidos. */
export function currencySymbol(currency: string | null | undefined): string {
  return SYMBOLS[currency as Currency] ?? SYMBOLS.BRL;
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

export function isCentRounding(value: unknown): value is CentRounding {
  return typeof value === 'string' && (CENT_ROUNDING as readonly string[]).includes(value);
}

/** Normaliza o que veio do banco (valores desconhecidos voltam para o padrão). */
export function toPreferences(row: Partial<Record<keyof UserPreferences, unknown>> | null | undefined): UserPreferences {
  if (!row) return { ...DEFAULT_PREFERENCES };
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    currency: isCurrency(row.currency) ? row.currency : DEFAULT_PREFERENCES.currency,
    centRounding: isCentRounding(row.centRounding) ? row.centRounding : DEFAULT_PREFERENCES.centRounding,
    showTxByInvoice: bool(row.showTxByInvoice, DEFAULT_PREFERENCES.showTxByInvoice),
    notifyInvoiceClose: bool(row.notifyInvoiceClose, DEFAULT_PREFERENCES.notifyInvoiceClose),
    notifyLimitExceeded: bool(row.notifyLimitExceeded, DEFAULT_PREFERENCES.notifyLimitExceeded),
    notifyMonthlyReport: bool(row.notifyMonthlyReport, DEFAULT_PREFERENCES.notifyMonthlyReport),
  };
}

/**
 * Valida um corpo de requisição parcial. Devolve só os campos enviados,
 * ou uma mensagem de erro se algum valor for inválido.
 */
export function parsePreferencesUpdate(
  body: Record<string, unknown>
): { data: Partial<UserPreferences> } | { error: string } {
  const data: Partial<UserPreferences> = {};
  if (body.currency !== undefined) {
    if (!isCurrency(body.currency)) return { error: 'Moeda inválida' };
    data.currency = body.currency;
  }
  if (body.centRounding !== undefined) {
    if (!isCentRounding(body.centRounding)) return { error: 'Opção de arredondamento inválida' };
    data.centRounding = body.centRounding;
  }
  for (const key of ['showTxByInvoice', 'notifyInvoiceClose', 'notifyLimitExceeded', 'notifyMonthlyReport'] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'boolean') return { error: 'Preferência inválida' };
      data[key] = body[key] as boolean;
    }
  }
  return { data };
}
