import { describe, it, expect } from 'vitest';
import {
  agruparEventosPorDia,
  diasNoMes,
  lerIso,
  lerMes,
  montarGradeMes,
  nomesDiasSemana,
  somarDias,
  somarMeses
} from './calendario-datas';
import { proximaDataFoco } from './calendario-teclado';

describe('calendario-datas (puro)', () => {
  it('diasNoMes considera anos bissextos', () => {
    expect(diasNoMes(2024, 2)).toBe(29);
    expect(diasNoMes(2026, 2)).toBe(28);
    expect(diasNoMes(2026, 11)).toBe(30);
  });

  it('lerIso aceita ISO completo e rejeita datas impossíveis', () => {
    expect(lerIso('2026-11-21')).toEqual({ ano: 2026, mes: 11, dia: 21 });
    expect(lerIso('2026-11-21T10:00:00.000Z')).toEqual({ ano: 2026, mes: 11, dia: 21 });
    expect(lerIso('2026-02-30')).toBeNull();
    expect(lerIso('2026-13-01')).toBeNull();
    expect(lerIso('')).toBeNull();
    expect(lerIso(null)).toBeNull();
    expect(lerIso(20261121)).toBeNull();
  });

  it('lerMes aceita AAAA-MM e data completa', () => {
    expect(lerMes('2026-11')).toEqual({ ano: 2026, mes: 11 });
    expect(lerMes('2026-11-05')).toEqual({ ano: 2026, mes: 11 });
    expect(lerMes('2026-00')).toBeNull();
    expect(lerMes('abc')).toBeNull();
  });

  it('somarDias e somarMeses viram mês/ano e limitam o dia', () => {
    expect(somarDias({ ano: 2026, mes: 12, dia: 31 }, 1)).toEqual({ ano: 2027, mes: 1, dia: 1 });
    expect(somarDias({ ano: 2026, mes: 3, dia: 1 }, -1)).toEqual({ ano: 2026, mes: 2, dia: 28 });
    expect(somarMeses({ ano: 2026, mes: 1, dia: 31 }, 1)).toEqual({ ano: 2026, mes: 2, dia: 28 });
    expect(somarMeses({ ano: 2026, mes: 1, dia: 15 }, -1)).toEqual({ ano: 2025, mes: 12, dia: 15 });
    expect(somarMeses({ ano: 2026, mes: 11, dia: 15 }, 14)).toEqual({ ano: 2028, mes: 1, dia: 15 });
  });

  it('montarGradeMes devolve 42 dias e começa no dia da semana pedido', () => {
    // Novembro/2026 começa num domingo.
    const domingo = montarGradeMes(2026, 11, 0);
    expect(domingo).toHaveLength(42);
    expect(domingo[0].iso).toBe('2026-11-01');
    expect(domingo.filter((d) => d.doMes)).toHaveLength(30);

    const segunda = montarGradeMes(2026, 11, 1);
    expect(segunda[0].iso).toBe('2026-10-26');
    expect(segunda[0].doMes).toBe(false);
    expect(segunda[6].iso).toBe('2026-11-01');
    expect(segunda[41].iso).toBe('2026-12-06');
  });

  it('montarGradeMes ignora inicioSemana inválido', () => {
    expect(montarGradeMes(2026, 11, 99)[0].iso).toBe(montarGradeMes(2026, 11, 1)[0].iso);
  });

  it('agruparEventosPorDia ignora lixo', () => {
    const mapa = agruparEventosPorDia([
      { data: '2026-11-05', titulo: 'A' },
      { data: '2026-11-05T12:00:00Z', titulo: 'B' },
      { data: 'invalida', titulo: 'C' },
      null,
      42
    ]);
    expect(mapa.get('2026-11-05')?.map((e) => e.titulo)).toEqual(['A', 'B']);
    expect(mapa.size).toBe(1);
    expect(agruparEventosPorDia(undefined).size).toBe(0);
  });

  it('nomesDiasSemana gira conforme o início da semana', () => {
    const dom = nomesDiasSemana('pt-BR', 0);
    const seg = nomesDiasSemana('pt-BR', 1);
    expect(dom).toHaveLength(7);
    expect(seg[0]).toBe(dom[1]);
    expect(seg[6]).toBe(dom[0]);
  });
});

describe('calendario-teclado (puro)', () => {
  const dia = { ano: 2026, mes: 11, dia: 18 }; // quarta-feira

  it('setas movem 1 dia / 1 semana', () => {
    expect(proximaDataFoco('ArrowRight', dia, 0)).toEqual({ ano: 2026, mes: 11, dia: 19 });
    expect(proximaDataFoco('ArrowUp', dia, 0)).toEqual({ ano: 2026, mes: 11, dia: 11 });
  });

  it('Home/End respeitam o início da semana', () => {
    expect(proximaDataFoco('Home', dia, 0)).toEqual({ ano: 2026, mes: 11, dia: 15 });
    expect(proximaDataFoco('Home', dia, 1)).toEqual({ ano: 2026, mes: 11, dia: 16 });
    expect(proximaDataFoco('End', dia, 1)).toEqual({ ano: 2026, mes: 11, dia: 22 });
  });

  it('PageUp/PageDown mudam mês e Shift muda ano', () => {
    expect(proximaDataFoco('PageDown', dia, 0)).toEqual({ ano: 2026, mes: 12, dia: 18 });
    expect(proximaDataFoco('PageUp', dia, 0, true)).toEqual({ ano: 2025, mes: 11, dia: 18 });
  });

  it('outras teclas não navegam', () => {
    expect(proximaDataFoco('a', dia, 0)).toBeNull();
  });
});
