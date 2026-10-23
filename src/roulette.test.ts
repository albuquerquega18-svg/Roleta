import { describe, expect, it } from 'vitest';
import { loadState, randomIndex, targetRotation } from './roulette';

describe('sorteio', () => {
  it('rejeita a região que causaria viés e devolve um índice válido', () => {
    const values = [4294967295, 4294967295, 7];
    expect(randomIndex(3, () => values.shift()!)).toBe(1);
    expect(values).toHaveLength(0);
  });
  it('rejeita quantidades inválidas', () => {
    for (const count of [0, -1, 61, 1.5]) expect(() => randomIndex(count)).toThrow(RangeError);
  });
  it('alinha cada vencedor com o ponteiro após vários giros', () => {
    for (let count = 2; count <= 60; count++) {
      let current = 132.5;
      for (let index = 0; index < count; index++) {
        const rotation = targetRotation(current, index, count);
        const angleUnderPointer = (360 - rotation % 360) % 360;
        expect(Math.floor(angleUnderPointer / (360 / count))).toBe(index);
        expect(rotation - current).toBeGreaterThanOrEqual(1800);
        current = rotation;
      }
    }
  });
});

describe('dados locais', () => {
  it('restaura opções, resultado e preferência', () => {
    const state = { entries: [{ id: 'a', label: 'Prêmio' }], history: [{ id: 'b', label: 'Prêmio', date: '2026-10-23T12:00:00Z' }], removeWinner: true };
    expect(loadState(JSON.stringify(state))).toEqual(state);
  });
  it('preserva uma lista intencionalmente vazia', () => {
    expect(loadState('{"entries":[],"history":[],"removeWinner":false}').entries).toEqual([]);
  });
  it('recupera dados corrompidos sem interromper o aplicativo', () => {
    for (const raw of ['{', 'null', '{}', '{"entries":[null]}', '{"entries":[],"history":[{"id":"a","label":"a","date":"inválido"}],"removeWinner":false}']) {
      expect(loadState(raw).entries).toHaveLength(6);
    }
  });
});
