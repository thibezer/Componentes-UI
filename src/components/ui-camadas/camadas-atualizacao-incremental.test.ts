import { describe, it, expect } from 'vitest';
import { decidirAtualizacao } from './camadas-atualizacao-incremental';
import type { EntradaDecisaoIncremental } from './tipos';

const base = (): EntradaDecisaoIncremental => ({
  arvoreRenderizada: true,
  buscaAtiva: false,
  editandoCamada: false,
  editandoFeicao: false,
  idsDuplicados: false,
  camadasAfetadas: [{ existeNoModelo: true, renderizadaNoDom: true, drawerAberto: false }]
});

describe('decidirAtualizacao', () => {
  it('libera o caminho incremental no caso comum', () => {
    expect(decidirAtualizacao(base())).toEqual({ incremental: true });
  });

  it('sem nenhuma camada afetada também é incremental (nada a fazer)', () => {
    expect(decidirAtualizacao({ ...base(), camadasAfetadas: [] })).toEqual({ incremental: true });
  });

  it.each([
    ['arvore-nao-renderizada', { arvoreRenderizada: false }],
    ['busca-ativa', { buscaAtiva: true }],
    ['edicao-inline', { editandoCamada: true }],
    ['edicao-inline', { editandoFeicao: true }],
    ['ids-duplicados', { idsDuplicados: true }],
    ['camada-orfa', { camadasAfetadas: [{ existeNoModelo: false, renderizadaNoDom: false, drawerAberto: false }] }],
    ['camada-fora-do-dom', { camadasAfetadas: [{ existeNoModelo: true, renderizadaNoDom: false, drawerAberto: false }] }],
    ['drawer-aberto', { camadasAfetadas: [{ existeNoModelo: true, renderizadaNoDom: true, drawerAberto: true }] }]
  ] as const)('cai no render completo: %s', (motivo, mudanca) => {
    expect(decidirAtualizacao({ ...base(), ...mudanca })).toEqual({ incremental: false, motivo });
  });

  it('uma camada problemática entre várias força o completo', () => {
    const ok = { existeNoModelo: true, renderizadaNoDom: true, drawerAberto: false };
    const r = decidirAtualizacao({ ...base(), camadasAfetadas: [ok, { ...ok, renderizadaNoDom: false }, ok] });
    expect(r).toEqual({ incremental: false, motivo: 'camada-fora-do-dom' });
  });

  it('é pura: não altera a entrada', () => {
    const entrada = base();
    const copia = JSON.stringify(entrada);
    decidirAtualizacao(entrada);
    expect(JSON.stringify(entrada)).toBe(copia);
  });
});
