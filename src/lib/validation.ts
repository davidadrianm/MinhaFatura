import { NextResponse } from 'next/server';
import { roundMoney, sumMoney, toCents } from './money';

/** Erro de entrada do usuário: vira resposta 400 com a mensagem. */
export class ValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Converte erros em resposta HTTP sem vazar detalhes internos para o cliente. */
export function errorResponse(error: unknown, logLabel: string) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error(`${logLabel}:`, error);
  return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
}

export function parseString(
  value: unknown,
  field: string,
  { max = 200, required = true }: { max?: number; required?: boolean } = {}
): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError(`${field} é obrigatório`);
    return undefined;
  }
  if (typeof value !== 'string') throw new ValidationError(`${field} inválido`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw new ValidationError(`${field} é obrigatório`);
  if (trimmed.length > max) throw new ValidationError(`${field} deve ter no máximo ${max} caracteres`);
  return trimmed;
}

export function requireString(value: unknown, field: string, max = 200): string {
  return parseString(value, field, { max, required: true }) as string;
}

export function parseId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    throw new ValidationError(`${field} inválido`);
  }
  return value;
}

export function parseIntInRange(value: unknown, field: string, min: number, max: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(`${field} deve ser um número inteiro entre ${min} e ${max}`);
  }
  return n;
}

const MAX_AMOUNT = 10_000_000;

export function parseMoney(
  value: unknown,
  field: string,
  { allowNegative = true, allowZero = false }: { allowNegative?: boolean; allowZero?: boolean } = {}
): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
  if (!Number.isFinite(n)) throw new ValidationError(`${field} inválido`);
  const rounded = roundMoney(n);
  if (!allowZero && rounded === 0) throw new ValidationError(`${field} deve ser diferente de zero`);
  if (!allowNegative && rounded < 0) throw new ValidationError(`${field} não pode ser negativo`);
  if (Math.abs(rounded) > MAX_AMOUNT) throw new ValidationError(`${field} excede o valor máximo permitido`);
  return rounded;
}

/** Valida uma data no formato YYYY-MM-DD e devolve ao meio-dia UTC (data de calendário estável). */
export function parseDateOnly(value: unknown, field: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} inválida`);
  }
  const d = new Date(`${value}T12:00:00.000Z`);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${field} inválida`);
  }
  const year = d.getUTCFullYear();
  if (year < 2000 || year > 2100) throw new ValidationError(`${field} fora do intervalo permitido`);
  return d;
}

export function parseEnum<T extends string>(value: unknown, field: string, allowed: readonly T[], fallback?: T): T {
  if ((value === undefined || value === null || value === '') && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new ValidationError(`${field} inválido`);
  }
  return value as T;
}

export function parseHexColor(value: unknown, field = 'Cor', required = false): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError(`${field} é obrigatória`);
    return undefined;
  }
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new ValidationError(`${field} inválida`);
  }
  return value;
}

export interface SplitInput {
  debtorId: string;
  amount: number;
}

/**
 * Valida as divisões de uma compra: no máximo 20, devedores sem repetição,
 * mesmo sinal do total e soma (em módulo) que não ultrapasse o total.
 */
export function parseSplits(value: unknown, total: number): SplitInput[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError('Divisões inválidas');
  if (value.length > 20) throw new ValidationError('Máximo de 20 divisões por compra');

  const seen = new Set<string>();
  const splits = value.map((item: unknown) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    const debtorId = parseId(raw.debtorId, 'Devedor');
    if (seen.has(debtorId)) throw new ValidationError('O mesmo devedor aparece mais de uma vez na divisão');
    seen.add(debtorId);
    const amount = parseMoney(raw.amount, 'Valor da divisão');
    if (Math.sign(amount) !== Math.sign(total)) {
      throw new ValidationError('Todas as divisões devem ter o mesmo sinal (positivo/negativo) que o valor total');
    }
    return { debtorId, amount };
  });

  const sum = sumMoney(splits.map((s) => s.amount));
  if (Math.abs(toCents(sum)) > Math.abs(toCents(total))) {
    throw new ValidationError('A soma das divisões não pode exceder o valor total da compra');
  }
  return splits;
}
