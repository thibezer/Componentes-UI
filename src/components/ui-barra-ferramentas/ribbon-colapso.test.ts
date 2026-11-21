import { describe, it, expect } from 'vitest';
import {
  NIVEL_COLAPSADO,
  decidirNiveisGrupos,
  decidirRecolhimentoAuto,
  rolagemParaVisivel,
  type GrupoMedido
} from './ribbon-colapso';

/** Grupo com 3 níveis: cheio, só ícones, colapsado. */
const g = (id: string, cheio: number, reduzido: number, colapsado: number, prioridade = 0): GrupoMedido => ({
  id,
  prioridade,
  larguras: [cheio, reduzido, colapsado]
});

const nivel = (m: Map<string, number>, id: string) => m.get(id) ?? -1;

describe('decidirNiveisGrupos — algoritmo puro de degradê por falta de espaço', () => {
  it('cabendo tudo, ninguém degrada', () => {
    const r = decidirNiveisGrupos([g('a', 100, 60, 40), g('b', 100, 60, 40)], 400);
    expect(r.cabe).toBe(true);
    expect(nivel(r.niveis, 'a')).toBe(0);
    expect(nivel(r.niveis, 'b')).toBe(0);
  });

  it('reduz (só ícones) o grupo de menor prioridade primeiro e para assim que cabe', () => {
    const r = decidirNiveisGrupos([g('a', 100, 60, 40, 5), g('b', 100, 60, 40, 1)], 170);
    expect(nivel(r.niveis, 'b')).toBe(1);
    expect(nivel(r.niveis, 'a')).toBe(0);
    expect(r.cabe).toBe(true);
  });

  it('antes de colapsar qualquer grupo, reduz todos (rodadas por nível)', () => {
    // total cheio = 300; reduzidos = 180; só cabe com todos reduzidos (não precisa colapsar nenhum)
    const r = decidirNiveisGrupos([g('a', 100, 60, 40, 1), g('b', 100, 60, 40, 2), g('c', 100, 60, 40, 3)], 190);
    expect([...r.niveis.values()]).toEqual([1, 1, 1]);
    expect(r.cabe).toBe(true);
  });

  it('colapsa na ordem de prioridade crescente quando reduzir não basta', () => {
    // todos reduzidos = 180 > 130 → começa a colapsar pelo de menor prioridade (c=1), depois (a=2)
    const grupos = [g('a', 100, 60, 40, 2), g('b', 100, 60, 40, 9), g('c', 100, 60, 40, 1)];
    // 180 > 170 → colapsa só o de menor prioridade (c): 60 + 60 + 40 = 160
    const r = decidirNiveisGrupos(grupos, 170);
    expect(nivel(r.niveis, 'c')).toBe(NIVEL_COLAPSADO);
    expect(nivel(r.niveis, 'a')).toBe(1);
    expect(nivel(r.niveis, 'b')).toBe(1);
    expect(r.cabe).toBe(true);
    // 160 > 140 → colapsa também o próximo (a): 40 + 60 + 40 = 140
    const r2 = decidirNiveisGrupos(grupos, 140);
    expect(nivel(r2.niveis, 'c')).toBe(NIVEL_COLAPSADO);
    expect(nivel(r2.niveis, 'a')).toBe(NIVEL_COLAPSADO);
    expect(nivel(r2.niveis, 'b')).toBe(1);
    expect(r2.cabe).toBe(true);
  });

  it('empate de prioridade: o grupo mais à direita degrada primeiro', () => {
    const r = decidirNiveisGrupos([g('a', 100, 60, 40), g('b', 100, 60, 40), g('c', 100, 60, 40)], 260);
    expect(nivel(r.niveis, 'c')).toBe(1);
    expect(nivel(r.niveis, 'a')).toBe(0);
    expect(nivel(r.niveis, 'b')).toBe(0);
  });

  it('pula níveis que não economizam largura (grupo só com botões grandes vai direto ao colapso)', () => {
    const r = decidirNiveisGrupos([g('a', 100, 100, 40, 1), g('b', 100, 60, 40, 5)], 150);
    // reduzir 'a' não ajuda; reduzir 'b' leva a 160 (ainda > 150) → colapsa 'a' (menor prioridade) → 40+60=100
    expect(nivel(r.niveis, 'a')).toBe(NIVEL_COLAPSADO);
    expect(nivel(r.niveis, 'b')).toBe(1);
    expect(r.cabe).toBe(true);
  });

  it('é determinístico e sem histerese: a mesma entrada dá sempre a mesma saída (volta ao largo expande tudo)', () => {
    const grupos = [g('a', 100, 60, 40, 1), g('b', 100, 60, 40, 2)];
    const estreito = decidirNiveisGrupos(grupos, 90);
    const largo = decidirNiveisGrupos(grupos, 500);
    const estreito2 = decidirNiveisGrupos(grupos, 90);
    expect([...estreito.niveis]).toEqual([...estreito2.niveis]);
    expect([...largo.niveis.values()]).toEqual([0, 0]);
  });

  it('não cabe nem tudo colapsado: devolve cabe=false (o painel rola) e não entra em laço', () => {
    const r = decidirNiveisGrupos([g('a', 100, 60, 40), g('b', 100, 60, 40)], 30);
    expect(r.cabe).toBe(false);
    expect([...r.niveis.values()]).toEqual([NIVEL_COLAPSADO, NIVEL_COLAPSADO]);
  });

  it('desconta a largura fixa extra (padding/bordas do contêiner)', () => {
    const r = decidirNiveisGrupos([g('a', 100, 60, 40)], 110, 16);
    expect(nivel(r.niveis, 'a')).toBe(1);
  });

  it('entradas hostis: lista vazia, NaN, Infinity, negativos e espaço inválido não estouram', () => {
    expect(decidirNiveisGrupos([], 100).niveis.size).toBe(0);
    expect(decidirNiveisGrupos(null as unknown as GrupoMedido[], 100).niveis.size).toBe(0);
    // espaço inválido/oculto (0, NaN, Infinity): nada a decidir, tudo cheio
    for (const disp of [0, -5, NaN, Infinity]) {
      const r = decidirNiveisGrupos([g('a', 100, 60, 40)], disp);
      expect(nivel(r.niveis, 'a')).toBe(0);
    }
    const sujo = decidirNiveisGrupos(
      [
        { id: 'x', larguras: [NaN, -3, Infinity] },
        { id: 'y', larguras: [] },
        { id: 'z', larguras: [50] },
        null as unknown as GrupoMedido
      ],
      40
    );
    expect(sujo.niveis.get('x')).toBeDefined();
    expect(sujo.niveis.get('z')).toBe(0); // sem nível menor: nada a fazer
  });

  it('muitos grupos (2000) resolvem rápido', () => {
    const grupos = Array.from({ length: 2000 }, (_, i) => g(`g${i}`, 100, 60, 40, i % 7));
    const t0 = performance.now();
    const r = decidirNiveisGrupos(grupos, 50_000);
    expect(performance.now() - t0).toBeLessThan(200);
    expect(r.niveis.size).toBe(2000);
  });
});

describe('decidirRecolhimentoAuto — recolher a faixa em telas estreitas', () => {
  it('cruzar para estreito recolhe; voltar a largo restaura só o que foi recolhido automaticamente', () => {
    const a = decidirRecolhimentoAuto(null, 500, 640, false, false);
    expect(a).toEqual({ estreito: true, acao: 'recolher' });
    const b = decidirRecolhimentoAuto(true, 800, 640, true, true);
    expect(b).toEqual({ estreito: false, acao: 'restaurar' });
  });

  it('não restaura o recolhimento feito pelo usuário', () => {
    expect(decidirRecolhimentoAuto(true, 800, 640, true, false)).toEqual({ estreito: false, acao: null });
  });

  it('só age na travessia: usuário que expandiu a faixa em tela estreita não é contrariado', () => {
    expect(decidirRecolhimentoAuto(true, 500, 640, false, false)).toEqual({ estreito: true, acao: null });
  });

  it('já recolhido pelo usuário em tela estreita: não faz nada', () => {
    expect(decidirRecolhimentoAuto(null, 500, 640, true, false)).toEqual({ estreito: true, acao: null });
  });

  it('largura 0 (oculto/sem layout) ou limite inválido não decidem nada', () => {
    expect(decidirRecolhimentoAuto(null, 0, 640, false, false)).toEqual({ estreito: null, acao: null });
    for (const limite of [0, -1, NaN, Infinity]) {
      expect(decidirRecolhimentoAuto(null, 500, limite, false, false)).toEqual({ estreito: null, acao: null });
    }
    expect(decidirRecolhimentoAuto(true, NaN, 640, false, false)).toEqual({ estreito: true, acao: null });
  });
});

describe('rolagemParaVisivel — traz a aba ativa para a área visível da lista de abas', () => {
  it('já visível: mantém a rolagem', () => {
    expect(rolagemParaVisivel({ inicio: 50, tamanho: 60, rolagem: 0, visivel: 300 })).toBe(0);
  });

  it('aba à direita da área visível: rola o mínimo para mostrá-la inteira (com margem)', () => {
    expect(rolagemParaVisivel({ inicio: 400, tamanho: 80, rolagem: 0, visivel: 300, margem: 8 })).toBe(188);
  });

  it('aba à esquerda da área visível: rola de volta até ela (com margem)', () => {
    expect(rolagemParaVisivel({ inicio: 20, tamanho: 80, rolagem: 200, visivel: 300, margem: 8 })).toBe(12);
  });

  it('nunca devolve negativo; entradas inválidas mantêm a rolagem atual', () => {
    expect(rolagemParaVisivel({ inicio: 0, tamanho: 80, rolagem: 50, visivel: 300, margem: 8 })).toBe(0);
    expect(rolagemParaVisivel({ inicio: NaN, tamanho: 80, rolagem: 50, visivel: 300 })).toBe(50);
    expect(rolagemParaVisivel({ inicio: 10, tamanho: 80, rolagem: 50, visivel: 0 })).toBe(50);
    expect(rolagemParaVisivel({ inicio: 10, tamanho: 80, rolagem: NaN, visivel: 300 })).toBe(0);
  });

  it('aba maior que a área visível: alinha o início da aba', () => {
    expect(rolagemParaVisivel({ inicio: 100, tamanho: 500, rolagem: 0, visivel: 300, margem: 8 })).toBe(92);
  });
});
