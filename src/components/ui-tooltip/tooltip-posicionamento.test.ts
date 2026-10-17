import { describe, it, expect } from 'vitest';
import { normalizarPosicao, calcularPosicaoBalao, DESLOCAMENTO_PX, MARGEM_TELA_PX, type Retangulo } from './tooltip-posicionamento';

const retangulo = (left: number, top: number, width: number, height: number): Retangulo => ({
  left, top, width, height, right: left + width, bottom: top + height
});
const tela = { largura: 1000, altura: 800 };
const balao = { width: 100, height: 40 };

describe('normalizarPosicao', () => {
  it.each([
    ['topo', 'topo'], ['top', 'topo'], ['baixo', 'baixo'], ['bottom', 'baixo'],
    ['esquerda', 'esquerda'], ['left', 'esquerda'], ['direita', 'direita'], ['right', 'direita'],
    ['  BAIXO ', 'baixo']
  ])('%s → %s', (entrada, esperado) => {
    expect(normalizarPosicao(entrada)).toBe(esperado);
  });

  it.each([null, undefined, '', 'cima', '__proto__', 'constructor', 'toString'])('%s cai em topo', (entrada) => {
    expect(normalizarPosicao(entrada as never)).toBe('topo');
  });
});

describe('calcularPosicaoBalao', () => {
  const gatilho = retangulo(400, 300, 80, 30);

  it('topo: acima e centralizado', () => {
    expect(calcularPosicaoBalao(gatilho, balao, 'topo', tela)).toEqual({ top: 300 - 40 - DESLOCAMENTO_PX, left: 440 - 50 });
  });

  it('baixo: abaixo e centralizado', () => {
    expect(calcularPosicaoBalao(gatilho, balao, 'baixo', tela)).toEqual({ top: 330 + DESLOCAMENTO_PX, left: 390 });
  });

  it('esquerda e direita: centralizado na vertical', () => {
    expect(calcularPosicaoBalao(gatilho, balao, 'esquerda', tela)).toEqual({ top: 315 - 20, left: 400 - 100 - DESLOCAMENTO_PX });
    expect(calcularPosicaoBalao(gatilho, balao, 'direita', tela)).toEqual({ top: 295, left: 480 + DESLOCAMENTO_PX });
  });

  it('não vaza da janela: encosta na margem', () => {
    const noCanto = retangulo(0, 0, 10, 10);
    expect(calcularPosicaoBalao(noCanto, balao, 'topo', tela)).toEqual({ top: MARGEM_TELA_PX, left: MARGEM_TELA_PX });
    const noFim = retangulo(990, 790, 10, 10);
    const r = calcularPosicaoBalao(noFim, balao, 'baixo', tela);
    expect(r.left).toBe(1000 - 100 - MARGEM_TELA_PX);
    expect(r.top).toBe(800 - 40 - MARGEM_TELA_PX);
  });

  it('valores NaN/Infinity (elemento sem layout) não geram NaN', () => {
    const sujo = { top: NaN, left: NaN, right: NaN, bottom: NaN, width: Infinity, height: NaN };
    const r = calcularPosicaoBalao(sujo, { width: NaN, height: NaN }, 'direita', tela);
    expect(Number.isFinite(r.top) && Number.isFinite(r.left)).toBe(true);
  });

  it('balão maior que a janela fica na margem, sem valores negativos absurdos', () => {
    const r = calcularPosicaoBalao(gatilho, { width: 5000, height: 5000 }, 'baixo', tela);
    expect(r.left).toBe(MARGEM_TELA_PX);
    expect(r.top).toBe(MARGEM_TELA_PX);
  });
});
