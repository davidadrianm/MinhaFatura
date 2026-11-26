import { describe, expect, it } from 'vitest';
import { installmentShare, roundMoney, sumMoney } from '../money';
import { parseDateOnly, parseMoney, parseSplits, ValidationError } from '../validation';

describe('dinheiro', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(roundMoney(10.005)).toBe(10.01);
  });

  it('distribui os centavos nas primeiras parcelas', () => {
    const parcelas = [1, 2, 3].map((i) => installmentShare(100, 3, i));
    expect(parcelas).toEqual([33.34, 33.33, 33.33]);
    expect(sumMoney(parcelas)).toBe(100);
  });

  it('distribui os centavos nas últimas parcelas quando escolhido', () => {
    const parcelas = [1, 2, 3].map((i) => installmentShare(100, 3, i, 'last'));
    expect(parcelas).toEqual([33.33, 33.33, 33.34]);
    expect(sumMoney(parcelas)).toBe(100);
    const quatro = [1, 2, 3, 4].map((i) => installmentShare(100.02, 4, i, 'last'));
    expect(quatro).toEqual([25, 25, 25.01, 25.01]);
  });

  it('mantém o sinal em estornos', () => {
    expect(installmentShare(-50, 2, 1)).toBe(-25);
  });
});

describe('validação', () => {
  it('aceita vírgula decimal e recusa zero', () => {
    expect(parseMoney('10,5', 'Valor')).toBe(10.5);
    expect(() => parseMoney('0', 'Valor')).toThrow(ValidationError);
    expect(() => parseMoney('abc', 'Valor')).toThrow(ValidationError);
  });

  it('valida datas reais', () => {
    expect(parseDateOnly('2026-02-28', 'Data').toISOString()).toBe('2026-02-28T12:00:00.000Z');
    expect(() => parseDateOnly('2026-02-30', 'Data')).toThrow(ValidationError);
    expect(() => parseDateOnly('28/02/2026', 'Data')).toThrow(ValidationError);
  });

  it('recusa divisões acima do total, repetidas ou com sinal trocado', () => {
    expect(() => parseSplits([{ debtorId: 'a', amount: 60 }, { debtorId: 'b', amount: 50 }], 100)).toThrow(/exceder/);
    expect(() => parseSplits([{ debtorId: 'a', amount: 10 }, { debtorId: 'a', amount: 10 }], 100)).toThrow(/mesmo devedor/);
    expect(() => parseSplits([{ debtorId: 'a', amount: -10 }], 100)).toThrow(/mesmo sinal/);
    expect(parseSplits([{ debtorId: 'a', amount: '50' }], 100)).toEqual([{ debtorId: 'a', amount: 50 }]);
  });
});
