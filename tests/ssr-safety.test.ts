// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isBrowser, SafeHTMLElement, definirCustomElement } from '../src/core/ssr-safe';
import { UIBus } from '../src/core/ui-bus';

describe('SSR Safety (Node.js runtime sem DOM)', () => {
  it('deve identificar ambiente como não-navegador', () => {
    expect(isBrowser).toBe(false);
  });

  it('SafeHTMLElement deve prover uma classe fallback válida sem lançar ReferenceError', () => {
    expect(SafeHTMLElement).toBeDefined();
    class MeuComponenteSSR extends SafeHTMLElement {
      constructor() {
        super();
      }
    }
    const instancia = new MeuComponenteSSR();
    expect(instancia).toBeInstanceOf(SafeHTMLElement);
  });

  it('definirCustomElement deve ser no-op silencioso quando customElements não existir', () => {
    expect(() => {
      definirCustomElement('ui-teste-ssr', class extends SafeHTMLElement {});
    }).not.toThrow();
  });

  it('UIBus não deve quebrar em ambiente SSR ao emitir ou escutar eventos', () => {
    let chamado = false;
    const unsub = UIBus.on('tema:alterado', () => {
      chamado = true;
    });

    expect(() => {
      UIBus.abrirModal('meu-modal');
      UIBus.fecharModal('meu-modal');
      UIBus.abrirDrawer('meu-drawer');
      UIBus.fecharDrawer('meu-drawer');
      UIBus.copiar('texto');
      UIBus.definirTema();
      UIBus.definirDensidade('compacta');
      UIBus.emit('tema:alterado', { tema: 'escuro' });
    }).not.toThrow();

    expect(chamado).toBe(true);
    unsub();
  });

  it('módulos puros do motor de formas (LOD, simplificação, índice) rodam em Node sem DOM nem Leaflet', async () => {
    const lod = await import('../src/gerencigeo-canvas/feature_lod');
    expect(lod.ehMarca({ minLat: 0, maxLat: 0.00001, minLon: 0, maxLon: 0.00001 }, 10)).toBe(true);
    expect(lod.projetarMercator(0, 0, 0).x).toBeCloseTo(128);
    const simp = await import('../src/gerencigeo-canvas/feature_simplificacao');
    expect(simp.toleranciaPorZoom(10)).toBeGreaterThan(0);
    const indice = await import('../src/gerencigeo-canvas/feature_indice');
    expect(new indice.IndiceEspacial().tamanho).toBe(0);
    expect(isBrowser).toBe(false);
  });

  it('importação dos entrypoints e componentes não deve lançar ReferenceError em ambiente de servidor', async () => {
    // Importações simulando Server-Side Rendering (Next.js App Router / Nuxt / SvelteKit)
    const core = await import('../src/core/index');
    expect(core).toBeDefined();
    expect(core.SafeHTMLElement).toBeDefined();
    expect(core.definirCustomElement).toBeDefined();

    const botao = await import('../src/botao');
    expect(botao.UIBotao).toBeDefined();

    const forms = await import('../src/forms');
    expect(forms.UICampoTexto).toBeDefined();
    expect(forms.UIAreaTexto).toBeDefined();
    expect(forms.UITextarea).toBeDefined();
    expect(forms.UICheckbox).toBeDefined();
    expect(forms.UIRadio).toBeDefined();
    expect(forms.UISwitch).toBeDefined();
    expect(forms.UIListaFlutuante).toBeDefined();

    const feedback = await import('../src/feedback');
    expect(feedback.UIModal).toBeDefined();
    expect(feedback.UIDrawer).toBeDefined();
    expect(feedback.UIAlerta).toBeDefined();
    expect(feedback.UIToast).toBeDefined();
    expect(feedback.UITooltip).toBeDefined();
    expect(feedback.UISkeleton).toBeDefined();

    const data = await import('../src/data');
    expect(data.UITabela).toBeDefined();
    expect(data.UIStat).toBeDefined();
    expect(data.UITabelaPropriedades).toBeDefined();

    const tools = await import('../src/tools');
    expect(tools.UIRibbon).toBeDefined();
    expect(tools.UIPaletaFerramentas).toBeDefined();

    const cores = await import('../src/cores');
    expect(cores.UIControleCores).toBeDefined();
    expect(cores.UISeletorCor).toBeDefined();
    expect(cores.abrirSeletorCor).toBeDefined();

    const index = await import('../src/index');
    expect(index).toBeDefined();

    const register = await import('../src/register');
    expect(register.registrarTodosComponentes).toBeDefined();
    expect(() => register.registrarTodosComponentes()).not.toThrow();
  }, 20000);

  it('núcleo plano da prancha (espaço, matriz, elementos, histórico) roda em Node sem DOM nem Leaflet', async () => {
    const espaco = await import('../src/gerencigeo-canvas/espaco/index');
    expect(espaco.ESPACO_PLANO.distancia([0, 0], [3, 4])).toBe(5);
    expect(espaco.inverter(espaco.escala(2))).not.toBeNull();
    const prancha = await import('../src/gerencigeo-canvas/prancha/index');
    const el = prancha.criarRetangulo({ id: 'a', aparencia: { preenchimento: { cor: '#000' } } }, { x: 0, y: 0, largura: 10, altura: 10 })!;
    expect(prancha.elementoNoTopo([5, 5], [el])?.id).toBe('a');
    expect(prancha.gerarPredefinicao('moldura-dupla', { x: 0, y: 0, largura: 100, altura: 50 })).toHaveLength(2);
    expect(new prancha.Historico<number>().podeDesfazer).toBe(false);
    expect(isBrowser).toBe(false);
  });

  it('pintor e exportação SVG da prancha rodam em Node (contexto falso, string SVG)', async () => {
    const prancha = await import('../src/gerencigeo-canvas/prancha/index');
    const el = prancha.criarRetangulo({ id: 'a', aparencia: { preenchimento: { cor: '#000' } } }, { x: 0, y: 0, largura: 10, altura: 10 })!;
    const chamadas: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'fillText' ? undefined : () => { chamadas.push(String(k)); }),
      set: () => true
    });
    expect(prancha.desenharElementos(ctx as never, [el]).itens).toBe(1);
    expect(chamadas).toContain('fill');
    expect(prancha.exportarSvg([el], { largura: 10, altura: 10 })).toContain('<path');
  });

  it('booleanas (Pathfinder) e efeitos da prancha rodam em Node', async () => {
    const b = await import('../src/gerencigeo-canvas/booleanas/index');
    const r = b.operacaoBooleana([{ aneis: [[[0, 0], [2, 0], [2, 2], [0, 2]]] }, { aneis: [[[1, 1], [3, 1], [3, 3], [1, 3]]] }], 'uniao');
    expect(b.areaDosPoligonos(r.poligonos)).toBeCloseTo(7, 9);
    const prancha = await import('../src/gerencigeo-canvas/prancha/index');
    const el = prancha.criarRetangulo({ id: 'a', aparencia: { preenchimento: { cor: '#000' }, sombra: {}, mesclagem: 'tela' } }, { x: 0, y: 0, largura: 10, altura: 10 })!;
    expect(prancha.exportarSvg([el], { largura: 10, altura: 10 })).toContain('feGaussianBlur');
  });

  it('entrypoint ./prancha/nucleo (só o núcleo) importa em Node e pinta sem DOM, sem custom element', async () => {
    const m = await import('../src/prancha-nucleo');
    expect(m.desenharPlano).toBeDefined();
    expect(m.planejar).toBeDefined();
    expect(m.envelopeVisual).toBeDefined();
    expect(m.diagnosticarContexto).toBeDefined();
    expect((m as Record<string, unknown>).UICanvasPrancha).toBeUndefined();
    expect((m as Record<string, unknown>).UIEditorPrancha).toBeUndefined();
    const el = m.criarRetangulo({ id: 'a', aparencia: { preenchimento: { cor: '#000' } } }, { x: 0, y: 0, largura: 10, altura: 10 })!;
    expect(m.envelopeVisual(el)).not.toBeNull();
    expect(m.ROTULOS_PREDEFINICOES.seta).toBe('Seta');
    expect(m.caixaDoQuadro(100, 100, { esquerda: 10, direita: 10, superior: 10, inferior: 10 })).toEqual({ x: 10, y: 10, largura: 80, altura: 80 });
  }, 20000);

  it('entrypoint ./prancha (componente + núcleo) importa no servidor sem ReferenceError', async () => {
    const m = await import('../src/prancha');
    expect(m.UICanvasPrancha).toBeDefined();
    expect(m.ESPACO_PLANO).toBeDefined();
    expect(m.desenharElementos).toBeDefined();
    expect(m.FERRAMENTAS_PRANCHA).toContain('caneta');
    expect(m.UIEditorPrancha).toBeDefined();
    expect(m.ligarPaineisPrancha).toBeDefined();
  }, 20000);
});
