import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/prancha';
import { criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { teclaReservadaDoNavegador, lerModoTeclado } from '../src/components/ui-canvas-prancha';
import type { UIEditorPrancha } from '../src/components/ui-editor-prancha';
import { decidirBarraColapsada, HISTERESE_BARRA_FORMAS_PX, lerBarraFormas, lerLateral } from '../src/components/ui-editor-prancha/editor-modos';

/* Itens 1 e 2 da segunda requisição do ConecteMapas: editor responsivo e teclado isolado (Camadas B, C e D). */

afterEach(() => {
  // Evita que o happy-dom mantenha o foco num shadow root que vai ser removido do documento
  for (const ed of Array.from(document.querySelectorAll('ui-editor-prancha'))) {
    try { (ed.shadowRoot?.activeElement as HTMLElement | null)?.blur?.(); } catch {}
  }
  try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch {}
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const ret = (id: string) => criarRetangulo({ id, aparencia: { preenchimento: { cor: '#000' } } }, { x: 10, y: 10, largura: 20, altura: 20 })!;

function montarEditor(atributos: Record<string, string> = {}): UIEditorPrancha {
  const ed = document.createElement('ui-editor-prancha') as UIEditorPrancha;
  for (const [k, v] of Object.entries(atributos)) ed.setAttribute(k, v);
  document.body.appendChild(ed);
  return ed;
}

const viewportDe = (ed: UIEditorPrancha): HTMLElement => ed.prancha.shadowRoot!.getElementById('viewport')!;
const tecla = (alvo: EventTarget, key: string, extra: KeyboardEventInit = {}, tipo = 'keydown'): KeyboardEvent => {
  const e = new KeyboardEvent(tipo, { key, bubbles: true, composed: true, cancelable: true, ...extra });
  alvo.dispatchEvent(e);
  return e;
};

const AMOSTRA_30_TECLAS: Array<[string, KeyboardEventInit?]> = [
  ['a'], ['b'], ['f'], ['g'], ['h'], ['k'], ['m'], ['n'], ['o'], ['q'], ['s'], ['u'], ['x'], ['y'], ['z'],
  ['['], [']'], ['Delete'], ['Backspace'], ['ArrowLeft'], ['ArrowUp'], ['ArrowRight'], ['ArrowDown'], ['Enter'], ['Escape'],
  ['d', { ctrlKey: true }], ['z', { ctrlKey: true }], ['a', { ctrlKey: true }], ['1'], [' ']
];

describe('teclado isolado (item 2)', () => {
  const AMOSTRA = AMOSTRA_30_TECLAS;

  it('com o foco no editor nenhuma tecla (tratada ou não) chega aos atalhos globais registrados ANTES', () => {
    const naJanela = vi.fn();
    const noDocumento = vi.fn();
    window.addEventListener('keydown', naJanela);
    document.addEventListener('keydown', noDocumento);
    const ed = montarEditor();
    ed.elementos = [ret('a')];
    expect(AMOSTRA).toHaveLength(30);
    for (const [k, extra] of AMOSTRA) tecla(viewportDe(ed), k, extra);
    expect(naJanela).not.toHaveBeenCalled();
    expect(noDocumento).not.toHaveBeenCalled();
    window.removeEventListener('keydown', naJanela);
    document.removeEventListener('keydown', noDocumento);
  });

  it('o isolamento vale para toda parte do editor (paleta, lateral, botões) e para keyup e keypress', () => {
    const g = vi.fn();
    window.addEventListener('keydown', g);
    window.addEventListener('keyup', g);
    window.addEventListener('keypress', g);
    const ed = montarEditor();
    const partes = [ed.shadowRoot!.getElementById('paleta')!, ed.shadowRoot!.getElementById('propriedades')!, ed.shadowRoot!.getElementById('concluir')!, ed.shadowRoot!.getElementById('barra')!];
    for (const p of partes) for (const tipo of ['keydown', 'keyup', 'keypress']) tecla(p, 'f', {}, tipo);
    expect(g).not.toHaveBeenCalled();
    window.removeEventListener('keydown', g);
    window.removeEventListener('keyup', g);
    window.removeEventListener('keypress', g);
  });

  it('as teclas reservadas do navegador chegam: F5, F11, F12, Ctrl+R, Ctrl+L, Ctrl+W, Ctrl+T, Ctrl+Shift+I/J, Tab', () => {
    const g = vi.fn();
    window.addEventListener('keydown', g);
    const ed = montarEditor();
    const reservadas: Array<[string, KeyboardEventInit?]> = [
      ['F5'], ['F11'], ['F12'], ['r', { ctrlKey: true }], ['l', { metaKey: true }], ['w', { ctrlKey: true }], ['t', { ctrlKey: true }],
      ['I', { ctrlKey: true, shiftKey: true }], ['J', { ctrlKey: true, shiftKey: true }], ['Tab']
    ];
    const faltou: string[] = [];
    for (const [k, extra] of reservadas) { g.mockClear(); tecla(viewportDe(ed), k, extra); if (g.mock.calls.length !== 1) faltou.push(k); }
    expect(faltou).toEqual([]);
    window.removeEventListener('keydown', g);
  });

  it('com o foco FORA do editor tudo chega ao hospedeiro e o editor não age', () => {
    const g = vi.fn();
    window.addEventListener('keydown', g);
    const ed = montarEditor();
    ed.elementos = [ret('a')];
    ed.prancha.selecionarElementos(['a']);
    for (const [k, extra] of AMOSTRA) tecla(document.body, k, extra);
    expect(g).toHaveBeenCalledTimes(AMOSTRA.length);
    expect(ed.elementos).toHaveLength(1);
    window.removeEventListener('keydown', g);
  });

  it('zoom do navegador: dentro do canvas a prancha vence (Ctrl+0 é dela); fora do canvas ele passa', () => {
    const g = vi.fn();
    window.addEventListener('keydown', g);
    const ed = montarEditor();
    const dentro = tecla(viewportDe(ed), '0', { ctrlKey: true });
    expect(dentro.defaultPrevented).toBe(true);
    expect(g).not.toHaveBeenCalled();
    // foco num campo da lateral: a prancha não trata (campo de texto), logo é o zoom do navegador e passa
    const campo = ed.shadowRoot!.getElementById('propriedades')!;
    tecla(campo, '+', { ctrlKey: true });
    expect(teclaReservadaDoNavegador(new KeyboardEvent('keydown', { key: '+', ctrlKey: true }))).toBe(true);
    expect(g).toHaveBeenCalled();
    window.removeEventListener('keydown', g);
  });

  it('a prancha ainda trata o que é dela e marca o evento (Delete apaga a seleção)', () => {
    const ed = montarEditor();
    ed.elementos = [ret('a')];
    ed.prancha.selecionarElementos(['a']);
    const e = tecla(viewportDe(ed), 'Delete');
    expect(e.defaultPrevented).toBe(true);
    expect(ed.elementos).toHaveLength(0);
  });

  it('reconectar várias vezes não duplica ouvintes (Regra #2): a ação roda uma vez e o Esc avisa uma vez', () => {
    const ed = montarEditor();
    for (let i = 0; i < 3; i++) { document.body.removeChild(ed); document.body.appendChild(ed); }
    const cancelar = vi.fn();
    ed.addEventListener('editor-cancelar', cancelar);
    ed.elementos = [ret('a'), ret('b')];
    ed.prancha.selecionarElementos(['a']);
    tecla(viewportDe(ed), 'Delete');
    expect(ed.elementos).toHaveLength(1);
    ed.prancha.limparSelecao();
    tecla(viewportDe(ed), 'Escape');
    expect(cancelar).toHaveBeenCalledTimes(1);
  });

  it('desconectado, o editor deixa de reter teclas', () => {
    const g = vi.fn();
    window.addEventListener('keydown', g);
    const ed = montarEditor();
    const vp = viewportDe(ed);
    document.body.removeChild(ed);
    tecla(vp, 'f');
    // o nó está fora do documento: o evento não sobe até a janela, mas também não há ouvinte do editor que o retenha
    expect(g).not.toHaveBeenCalled();
    window.removeEventListener('keydown', g);
  });

  it('teclado="local" não isola e "exclusivo" continua capturando; atributo inválido vira local; prancha avulsa isolada', () => {
    const g = vi.fn();
    window.addEventListener('keydown', g);
    const local = montarEditor({ teclado: 'local' });
    tecla(viewportDe(local), 'f');
    expect(g).toHaveBeenCalledTimes(1);
    document.body.innerHTML = '';
    const avulsa = document.createElement('ui-canvas-prancha');
    avulsa.setAttribute('teclado', 'isolado');
    document.body.appendChild(avulsa);
    g.mockClear();
    tecla(avulsa.shadowRoot!.getElementById('viewport')!, 'f');
    expect(g).not.toHaveBeenCalled();
    expect(lerModoTeclado('isolado')).toBe('isolado');
    expect(lerModoTeclado('exclusivo')).toBe('exclusivo');
    for (const ruim of [null, undefined, '', 'tudo', 42 as never]) expect(lerModoTeclado(ruim)).toBe('local');
    window.removeEventListener('keydown', g);
  });

  it('teclaReservadaDoNavegador: entradas hostis não lançam', () => {
    expect(() => teclaReservadaDoNavegador(null as never)).not.toThrow();
    expect(() => teclaReservadaDoNavegador({} as never)).not.toThrow();
    expect(teclaReservadaDoNavegador({ key: 5 } as never)).toBe(false);
  });

  it('campos de texto do editor: a tecla não é roubada (não há preventDefault) mas também não vaza', () => {
    const g = vi.fn();
    window.addEventListener('keydown', g);
    const ed = montarEditor();
    const e = tecla(ed.shadowRoot!.getElementById('propriedades')!, 'Delete');
    expect(e.defaultPrevented).toBe(false);
    expect(g).not.toHaveBeenCalled();
    window.removeEventListener('keydown', g);
  });
});

describe('editor responsivo (item 1)', () => {
  it('atributos barra-formas e lateral: valores, padrões e propriedades', () => {
    const ed = montarEditor();
    const raiz = ed.shadowRoot!.getElementById('raiz')!;
    expect([raiz.dataset.barra, raiz.dataset.lateral]).toEqual(['auto', 'auto']);
    ed.setAttribute('barra-formas', 'menu');
    ed.setAttribute('lateral', 'gaveta');
    expect([raiz.dataset.barra, raiz.dataset.lateral]).toEqual(['menu', 'gaveta']);
    expect([ed.barraFormas, ed.lateral]).toEqual(['menu', 'gaveta']);
    ed.barraFormas = 'botoes';
    ed.lateral = 'fixa';
    expect(ed.getAttribute('barra-formas')).toBe('botoes');
    expect(ed.getAttribute('lateral')).toBe('fixa');
    ed.setAttribute('barra-formas', '<img>');
    ed.setAttribute('lateral', 'x');
    expect([ed.barraFormas, ed.lateral]).toEqual(['auto', 'auto']);
    expect(lerBarraFormas(null)).toBe('auto');
    expect(lerLateral(undefined)).toBe('auto');
  });

  it('gaveta: recolhida por padrão, abre/fecha pelo botão com ARIA correta; em modo fixo é sempre visível', () => {
    const ed = montarEditor({ lateral: 'gaveta' });
    const botao = ed.shadowRoot!.getElementById('btn-lateral')!;
    const raiz = ed.shadowRoot!.getElementById('raiz')!;
    expect(ed.lateralAberta).toBe(false);
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(botao.getAttribute('aria-controls')).toBe('lateral');
    expect(ed.shadowRoot!.getElementById('lateral')).not.toBeNull();
    botao.click();
    expect(ed.lateralAberta).toBe(true);
    expect(botao.getAttribute('aria-expanded')).toBe('true');
    expect(raiz.dataset.lateralAberta).toBe('true');
    botao.click();
    expect(ed.lateralAberta).toBe(false);
    ed.setAttribute('lateral', 'fixa');
    expect(ed.lateralAberta).toBe(true);
    ed.lateralAberta = false; // ignorado em modo fixo
    expect(ed.lateralAberta).toBe(true);
    expect(botao.getAttribute('aria-expanded')).toBe('true');
  });

  it('Alt+P abre e fecha a lateral; Esc na lateral fecha e devolve o foco ao botão, sem cancelar o editor', () => {
    const ed = montarEditor({ lateral: 'gaveta' });
    const cancelar = vi.fn();
    ed.addEventListener('editor-cancelar', cancelar);
    const e = tecla(viewportDe(ed), 'p', { altKey: true });
    expect(e.defaultPrevented).toBe(true);
    expect(ed.lateralAberta).toBe(true);
    tecla(ed.shadowRoot!.getElementById('propriedades')!, 'Escape');
    expect(ed.lateralAberta).toBe(false);
    expect(ed.shadowRoot!.activeElement).toBe(ed.shadowRoot!.getElementById('btn-lateral'));
    expect(cancelar).not.toHaveBeenCalled();
    tecla(viewportDe(ed), 'P', { altKey: true });
    expect(ed.lateralAberta).toBe(true);
    tecla(viewportDe(ed), 'p', { altKey: true });
    expect(ed.lateralAberta).toBe(false);
  });

  it('auto: o ResizeObserver decide pela largura do editor (gaveta abaixo de 720 px, fixa acima), sem vazar observador', () => {
    const instancias: Array<{ cb: (e: unknown[]) => void; alvos: Element[]; desconectado: number }> = [];
    class RO {
      info = { cb: undefined as never as (e: unknown[]) => void, alvos: [] as Element[], desconectado: 0 };
      constructor(cb: (e: unknown[]) => void) { this.info.cb = cb; instancias.push(this.info); }
      observe(el: Element): void { this.info.alvos.push(el); }
      unobserve(): void {}
      disconnect(): void { this.info.desconectado++; }
    }
    vi.stubGlobal('ResizeObserver', RO);
    const ed = montarEditor();
    const novos = instancias.filter((i) => i.alvos.some((a) => a === ed.shadowRoot!.getElementById('raiz')));
    expect(novos).toHaveLength(1);
    const ro = novos[0];
    ro.cb([{ contentRect: { width: 500 } }]);
    expect(ed.lateralAberta).toBe(false); // gaveta
    ed.lateralAberta = true;
    expect(ed.lateralAberta).toBe(true);
    ro.cb([{ contentRect: { width: 1100 } }]);
    expect(ed.lateralAberta).toBe(true); // fixa
    expect(ed.shadowRoot!.getElementById('raiz')!.dataset.lateralAberta).toBe('false');
    ro.cb([{ contentRect: { width: 400 } }]);
    expect(ed.lateralAberta).toBe(false); // voltou recolhida
    ro.cb([]); ro.cb([{ contentRect: undefined }]); ro.cb([{ contentRect: { width: NaN } }]);
    expect(() => ro.cb([{ contentRect: { width: -5 } }])).not.toThrow();
    document.body.removeChild(ed);
    expect(ro.desconectado).toBeGreaterThanOrEqual(1);
    document.body.appendChild(ed);
    document.body.removeChild(ed);
    document.body.appendChild(ed);
    document.body.removeChild(ed);
    const vivos = instancias.filter((i) => i.alvos.length > 0 && i.desconectado === 0);
    expect(vivos).toHaveLength(0);
  });

  it('menu "Formas": ARIA, grupos, teclado, escolha insere a forma e fecha; clique fora e Esc fecham', () => {
    const ed = montarEditor({ 'barra-formas': 'menu' });
    const sh = ed.shadowRoot!;
    const botao = sh.getElementById('btn-formas') as HTMLButtonElement;
    const menu = sh.getElementById('menu-formas')!;
    expect(botao.getAttribute('aria-haspopup')).toBe('menu');
    expect(botao.getAttribute('aria-controls')).toBe('menu-formas');
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.hidden).toBe(true);
    expect(Array.from(menu.querySelectorAll('[role="group"]')).map((g) => g.getAttribute('aria-label'))).toEqual(['Molduras', 'Formas', 'Linhas', 'Setas']);
    expect(menu.querySelectorAll('button[role="menuitem"]')).toHaveLength(12);
    botao.click();
    expect(menu.hidden).toBe(false);
    expect(botao.getAttribute('aria-expanded')).toBe('true');
    expect(sh.activeElement).toBe(menu.querySelector('button[role="menuitem"]'));
    const itens = Array.from(menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'));
    tecla(itens[0], 'ArrowDown');
    expect(sh.activeElement).toBe(itens[1]);
    tecla(itens[1], 'ArrowUp');
    tecla(itens[0], 'ArrowUp');
    expect(sh.activeElement).toBe(itens[itens.length - 1]);
    tecla(itens[itens.length - 1], 'Home');
    expect(sh.activeElement).toBe(itens[0]);
    const cancelar = vi.fn();
    ed.addEventListener('editor-cancelar', cancelar);
    tecla(itens[0], 'Escape');
    expect(menu.hidden).toBe(true);
    expect(sh.activeElement).toBe(botao);
    expect(cancelar).not.toHaveBeenCalled();
    botao.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
    expect(menu.hidden).toBe(true);
    // (o happy-dom quebra no `activeElement` de um shadow irmão quando o foco está dentro do shadow do editor; em navegador não)
    (sh.activeElement as HTMLElement | null)?.blur?.();
    botao.click();
    (sh.activeElement as HTMLElement | null)?.blur?.();
    (menu.querySelector('button[data-predefinicao="elipse"]') as HTMLButtonElement).click();
    expect(menu.hidden).toBe(true);
    expect(ed.elementos).toHaveLength(1);
    expect(ed.elementos[0].geometria.tipo).toBe('elipse');
  });

  it('a barra de botões continua funcionando e o rodapé (Cancelar/Concluir) existe em qualquer modo', () => {
    for (const lateral of ['auto', 'fixa', 'gaveta']) for (const barra of ['auto', 'botoes', 'menu']) {
      const ed = montarEditor({ lateral, 'barra-formas': barra });
      const sh = ed.shadowRoot!;
      expect(sh.getElementById('cancelar')).not.toBeNull();
      expect(sh.getElementById('concluir')).not.toBeNull();
      (sh.querySelector('#botoes-formas button[data-predefinicao="retangulo"]') as HTMLButtonElement).click();
      expect(ed.elementos).toHaveLength(1);
      document.body.innerHTML = '';
    }
  });

  it('o CSS usa container query (não @media) e os tokens: rodapé sem quebra, alvo de toque pelo token', async () => {
    const css = (await import('node:fs')).readFileSync((await import('node:path')).resolve(__dirname, '..', 'src', 'components', 'ui-editor-prancha', 'ui-editor-prancha.css'), 'utf-8');
    expect(css).toContain('container-type: inline-size');
    expect(css).toMatch(/@container editor \(max-width: 719\.98px\)/);
    // o corte fixo de 720 px vale só para a lateral; barra-formas="auto" mede o transbordo real via ResizeObserver
    const bloco720 = css.slice(css.indexOf('@container editor (max-width: 719.98px)'));
    expect(bloco720).not.toContain('data-barra="auto"');
    expect(bloco720).toContain('data-lateral="auto"');
    expect(css).not.toMatch(/@media/);
    expect(css).toContain('--ui-editor-prancha-lateral');
    expect(css).toMatch(/\.acoes \{[^}]*flex-wrap: nowrap/);
    expect(css).toContain('min-height: var(--ui-touch-target-min)');
  });

  it('entradas hostis: atributos estranhos não lançam e nada vaza ao reconectar', () => {
    const ed = montarEditor();
    expect(() => {
      ed.setAttribute('lateral', '<script>');
      ed.setAttribute('barra-formas', '\u0000');
      ed.setAttribute('teclado', 'qualquer');
      ed.lateralAberta = 'sim' as never;
      ed.lateral = null as never;
    }).not.toThrow();
    for (let i = 0; i < 3; i++) { document.body.removeChild(ed); document.body.appendChild(ed); }
    ed.setAttribute('lateral', 'gaveta');
    ed.shadowRoot!.getElementById('btn-lateral')!.click();
    expect(ed.lateralAberta).toBe(true);
  });
});

describe('barra-formas="auto" por transbordo, ResizeObserver (1/quadro) e histerese', () => {
  const descritores: Array<[string, PropertyDescriptor | undefined]> = [];

  function simularProp(nome: 'clientWidth' | 'offsetWidth' | 'scrollWidth' | 'offsetTop' | 'offsetHeight', getter: (el: HTMLElement) => number | undefined): void {
    descritores.push([nome, Object.getOwnPropertyDescriptor(HTMLElement.prototype, nome)]);
    Object.defineProperty(HTMLElement.prototype, nome, {
      configurable: true,
      get(this: HTMLElement) { return getter(this) ?? 0; }
    });
  }

  afterEach(() => {
    descritores.splice(0).reverse().forEach(([nome, desc]) => {
      if (desc) Object.defineProperty(HTMLElement.prototype, nome, desc);
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[nome];
    });
    vi.restoreAllMocks();
  });

  function configurarAmbienteLayout(larguraBotaoLateral = 110) {
    let larguraEditor = 1300;
    let fatorLarguraCaractere = 7;
    let paddingBotao = 34;
    let quebraLinha = false;
    const observadores: Array<{ cb: ResizeObserverCallback; alvos: Element[]; desconectado: number }> = [];
    const quadros = new Map<number, FrameRequestCallback>();
    let proxId = 1;

    class RO {
      info = { cb: undefined as never as ResizeObserverCallback, alvos: [] as Element[], desconectado: 0 };
      constructor(cb: ResizeObserverCallback) { this.info.cb = cb; observadores.push(this.info); }
      observe(el: Element): void { this.info.alvos.push(el); }
      unobserve(): void {}
      disconnect(): void { this.info.desconectado++; }
    }

    vi.stubGlobal('ResizeObserver', RO);
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      const id = proxId++;
      quadros.set(id, cb);
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => { quadros.delete(id); }));

    simularProp('clientWidth', (el) => (el.id === 'raiz' || el.id === 'barra' || el.id === 'botoes-formas' ? larguraEditor : undefined));
    simularProp('offsetWidth', (el) => {
      if (el.id === 'btn-lateral') return larguraBotaoLateral;
      if (el.dataset?.predefinicao) return (el.textContent?.length ?? 0) * fatorLarguraCaractere + paddingBotao;
      return undefined;
    });
    simularProp('offsetHeight', (el) => (el.dataset?.predefinicao ? 44 : undefined));
    simularProp('offsetTop', (el) => {
      if (!quebraLinha || !el.dataset?.predefinicao) return 0;
      return el.dataset.predefinicao === 'seta-dupla' ? 48 : 0;
    });

    const dispararResize = (novaLargura: number) => {
      larguraEditor = novaLargura;
      for (const o of observadores) {
        if (o.desconectado === 0 && o.alvos.some((a) => a.id === 'raiz' || a.id === 'barra')) {
          o.cb(o.alvos.map((target) => ({ target, contentRect: { width: novaLargura } }) as ResizeObserverEntry), o as unknown as ResizeObserver);
        }
      }
    };

    const executarQuadro = () => {
      const pendentes = Array.from(quadros.entries());
      quadros.clear();
      for (const [, cb] of pendentes) cb(performance.now());
    };

    return {
      observadores,
      quadros,
      dispararResize,
      executarQuadro,
      setLarguraEditor: (w: number) => { larguraEditor = w; },
      setFatorCaractere: (px: number) => { fatorLarguraCaractere = px; },
      setPaddingBotao: (px: number) => { paddingBotao = px; },
      setQuebraLinha: (q: boolean) => { quebraLinha = q; }
    };
  }

  it('decidirBarraColapsada (Camada A): transbordo, histerese assimétrica e entradas hostis', () => {
    // 12 botões ~ 1150 px: 600, 800 e 1000 colapsam; 1300 fica em botões
    expect(decidirBarraColapsada({ colapsadaAtual: false, larguraNecessaria: 1150, larguraDisponivel: 600 })).toBe(true);
    expect(decidirBarraColapsada({ colapsadaAtual: false, larguraNecessaria: 1150, larguraDisponivel: 800 })).toBe(true);
    expect(decidirBarraColapsada({ colapsadaAtual: false, larguraNecessaria: 1150, larguraDisponivel: 1000 })).toBe(true);
    expect(decidirBarraColapsada({ colapsadaAtual: false, larguraNecessaria: 1150, larguraDisponivel: 1300 })).toBe(false);

    // histerese: depois de colapsar, precisa de +HISTERESE_BARRA_FORMAS_PX para voltar aos botões
    expect(decidirBarraColapsada({ colapsadaAtual: true, larguraNecessaria: 1150, larguraDisponivel: 1150 })).toBe(true);
    expect(decidirBarraColapsada({ colapsadaAtual: true, larguraNecessaria: 1150, larguraDisponivel: 1150 + HISTERESE_BARRA_FORMAS_PX - 1 })).toBe(true);
    expect(decidirBarraColapsada({ colapsadaAtual: true, larguraNecessaria: 1150, larguraDisponivel: 1150 + HISTERESE_BARRA_FORMAS_PX })).toBe(false);

    // após expandir, oscilar dentro da faixa morta [1150, 1150 + histerese) não pisca de volta para menu
    expect(decidirBarraColapsada({ colapsadaAtual: false, larguraNecessaria: 1150, larguraDisponivel: 1150 })).toBe(false);
    expect(decidirBarraColapsada({ colapsadaAtual: false, larguraNecessaria: 1150, larguraDisponivel: 1149 })).toBe(true);

    // quebra real no DOM força menu mesmo sem diferença grande
    expect(decidirBarraColapsada({ colapsadaAtual: false, larguraNecessaria: 1150, larguraDisponivel: 1150, transbordouNoDom: true })).toBe(true);

    // entradas hostis / sem layout preservam estado sem lançar
    expect(decidirBarraColapsada(null as never)).toBe(false);
    expect(decidirBarraColapsada({ colapsadaAtual: false, larguraNecessaria: 1150, larguraDisponivel: 0 })).toBe(false);
    expect(decidirBarraColapsada({ colapsadaAtual: true, larguraNecessaria: 1150, larguraDisponivel: 0 })).toBe(true);
    expect(decidirBarraColapsada({ colapsadaAtual: false, larguraNecessaria: NaN, larguraDisponivel: 800 })).toBe(false);
    expect(decidirBarraColapsada({ colapsadaAtual: true, larguraNecessaria: 1150, larguraDisponivel: Infinity, histerese: -5 })).toBe(true);
  });

  it('larguras de 600, 800, 1000 e 1300 px: abaixo de 1300 transborda e vira "Formas ▾", lateral mantém corte de 720 px', () => {
    const env = configurarAmbienteLayout();
    // 137 chars * 6 + 12*24 + 11*4 = 822 + 288 + 44 = 1154 px de largura necessária para uma linha
    env.setFatorCaractere(6);
    env.setPaddingBotao(24);
    const ed = montarEditor();
    const raiz = ed.shadowRoot!.getElementById('raiz')!;

    for (const [largura, barraEsperada, lateralGaveta] of [
      [600, 'menu', true],
      [800, 'menu', false],
      [1000, 'menu', false],
      [1300, 'botoes', false]
    ] as const) {
      env.dispararResize(largura);
      env.executarQuadro();
      expect(raiz.dataset.barra).toBe('auto');
      expect(raiz.dataset.barraModo, `barra em ${largura}px`).toBe(barraEsperada);
      expect(ed.lateralAberta, `lateral em ${largura}px`).toBe(!lateralGaveta);
    }
  });

  it('rótulos longos: até em 1300 px troca para "Formas ▾" quando não cabe em 1 linha, e volta ao alargar', () => {
    const env = configurarAmbienteLayout();
    env.setFatorCaractere(6);
    env.setPaddingBotao(24);
    const ed = montarEditor();
    const raiz = ed.shadowRoot!.getElementById('raiz')!;

    // Em 1300 px, com rótulos padrão (~1154 px), cabe em uma linha
    env.dispararResize(1300);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('botoes');

    // Troca por rótulos longos (~1600 px no total): em 1300 px não cabe mais -> "Formas ▾"
    const botoes = Array.from(ed.shadowRoot!.querySelectorAll<HTMLButtonElement>('#botoes-formas button[data-predefinicao]'));
    for (const b of botoes) b.textContent = `${b.textContent} personalizado longo`;
    env.dispararResize(1300);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('menu');

    // Alargando o suficiente (acima da soma dos rótulos longos + histerese), restaura botões
    env.dispararResize(3600);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('botoes');
  });

  it('histerese evita pisca-pisca ao oscilar na largura limite e ao usar lateral="gaveta"', () => {
    const env = configurarAmbienteLayout(110);
    // 137*6 + 12*24 + 11*4 = 1154 px
    env.setFatorCaractere(6);
    env.setPaddingBotao(24);
    const ed = montarEditor();
    const raiz = ed.shadowRoot!.getElementById('raiz')!;

    env.dispararResize(1300);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('botoes');

    // Lateral fixa em 1200 px cabe (1200 >= 1154); mudando para gaveta, botão "Propriedades" (110+4=114 px) deixa só 1086 px -> menu
    env.dispararResize(1200);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('botoes');
    ed.setAttribute('lateral', 'gaveta');
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('menu');

    // Volta para fixa e testa a faixa de histerese [1154, 1154 + 24): não pisca de volta para botões
    ed.setAttribute('lateral', 'fixa');
    for (const w of [1154, 1165, 1177]) {
      env.dispararResize(w);
      env.executarQuadro();
      expect(raiz.dataset.barraModo, `não deve expandir em ${w}px`).toBe('menu');
    }

    // Cruzando 1154 + 24 = 1178 px volta para botões, e oscilar para 1160 px não colapsa de novo
    env.dispararResize(1178);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('botoes');
    env.dispararResize(1160);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('botoes');
  });

  it('detecta quebra para segunda linha no DOM (offsetTop) e fecha menu aberto ao expandir', () => {
    const env = configurarAmbienteLayout();
    env.setFatorCaractere(4);
    env.setPaddingBotao(12); // soma pequena (~880 px), simulando quebra real pelo offsetTop
    const ed = montarEditor();
    const sh = ed.shadowRoot!;
    const raiz = sh.getElementById('raiz')!;

    env.dispararResize(1000);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('botoes');

    // Simula que o último botão quebrou para a segunda linha no DOM
    env.setQuebraLinha(true);
    env.dispararResize(1000);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('menu');

    // Abre o menu "Formas ▾" e depois alarga: o menu precisa fechar junto com a volta dos botões
    (sh.getElementById('btn-formas') as HTMLButtonElement).click();
    expect(sh.getElementById('menu-formas')!.hidden).toBe(false);
    env.setQuebraLinha(false);
    env.dispararResize(1300);
    env.executarQuadro();
    expect(raiz.dataset.barraModo).toBe('botoes');
    expect(sh.getElementById('menu-formas')!.hidden).toBe(true);
    expect(sh.getElementById('btn-formas')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('agrupa rajadas de ResizeObserver em 1 reajuste por quadro e desconecta observador e RAF no disconnectedCallback', () => {
    const env = configurarAmbienteLayout();
    env.setFatorCaractere(6);
    env.setPaddingBotao(24);
    const ed = montarEditor();
    const raf = globalThis.requestAnimationFrame as unknown as ReturnType<typeof vi.fn>;
    const caf = globalThis.cancelAnimationFrame as unknown as ReturnType<typeof vi.fn>;

    // limpa o agendamento inicial da montagem
    env.executarQuadro();
    raf.mockClear();
    const spyReajuste = vi.spyOn(ed, 'reajustarBarra');

    // Rajada de 10 redimensionamentos no mesmo quadro -> apenas 1 RAF agendado e 1 reajuste executado
    for (const w of [1250, 1200, 1100, 1000, 950, 900, 850, 800, 700, 600]) env.dispararResize(w);
    expect(raf).toHaveBeenCalledTimes(1);
    expect(spyReajuste).not.toHaveBeenCalled();

    env.executarQuadro();
    expect(spyReajuste).toHaveBeenCalledTimes(1);
    expect(ed.shadowRoot!.getElementById('raiz')!.dataset.barraModo).toBe('menu');

    // Desconecta com quadro pendente: cancela RAF e desconecta ResizeObserver
    env.dispararResize(1300);
    expect(env.quadros.size).toBe(1);
    const [[idPendente, cbPendente]] = Array.from(env.quadros.entries());
    spyReajuste.mockClear();
    document.body.removeChild(ed);
    expect(caf).toHaveBeenCalledWith(idPendente);
    expect(env.quadros.has(idPendente)).toBe(false);
    cbPendente(performance.now());
    expect(spyReajuste).not.toHaveBeenCalled();
    const obsEditor = env.observadores.filter((o) => o.alvos.includes(ed.shadowRoot!.getElementById('raiz')!));
    expect(obsEditor.every((o) => o.desconectado > 0)).toBe(true);
  });
});

describe('teclado modal', () => {
  it('lerModoTeclado reconhece "modal", o editor repassa para a prancha e a propriedade .teclado reflete/altera', () => {
    expect(lerModoTeclado('modal')).toBe('modal');
    const ed = montarEditor({ teclado: 'modal' });
    expect(ed.prancha.getAttribute('teclado')).toBe('modal');
    expect((ed as unknown as { teclado: string }).teclado).toBe('modal');
    expect((ed.prancha as unknown as { teclado: string }).teclado).toBe('modal');

    const avulsa = document.createElement('ui-canvas-prancha') as HTMLElement & { teclado: string };
    avulsa.teclado = 'modal';
    document.body.appendChild(avulsa);
    expect(avulsa.getAttribute('teclado')).toBe('modal');
    expect(avulsa.teclado).toBe('modal');
  });

  it('<ui-editor-prancha teclado="modal">: listener global registrado antes, foco no corpo da página, nenhuma das 30 teclas chega (keydown, keyup, keypress)', () => {
    const naJanela = vi.fn();
    const noDocumento = vi.fn();
    const noDocumentoCaptura = vi.fn();
    for (const tipo of ['keydown', 'keyup', 'keypress']) {
      window.addEventListener(tipo, naJanela);
      document.addEventListener(tipo, noDocumento);
      document.addEventListener(tipo, noDocumentoCaptura, { capture: true });
    }

    try {
      const ed = montarEditor({ teclado: 'modal' });
      ed.elementos = [ret('a')];
      ed.prancha.selecionarElementos(['a']);
      document.body.focus?.();

      expect(AMOSTRA_30_TECLAS).toHaveLength(30);
      for (const tipo of ['keydown', 'keyup', 'keypress']) {
        for (const [k, extra] of AMOSTRA_30_TECLAS) tecla(document.body, k, extra, tipo);
      }

      expect(naJanela).not.toHaveBeenCalled();
      expect(noDocumento).not.toHaveBeenCalled();
      expect(noDocumentoCaptura).not.toHaveBeenCalled();
      expect(ed.elementos).toHaveLength(1);
    } finally {
      for (const tipo of ['keydown', 'keyup', 'keypress']) {
        window.removeEventListener(tipo, naJanela);
        document.removeEventListener(tipo, noDocumento);
        document.removeEventListener(tipo, noDocumentoCaptura, { capture: true });
      }
    }
  });

  it('<ui-canvas-prancha teclado="modal">: prancha avulsa com foco no corpo da página bloqueia todas as 30 teclas', () => {
    const naJanela = vi.fn();
    const noDocumento = vi.fn();
    for (const tipo of ['keydown', 'keyup', 'keypress']) {
      window.addEventListener(tipo, naJanela);
      document.addEventListener(tipo, noDocumento);
    }

    try {
      const prancha = document.createElement('ui-canvas-prancha');
      prancha.setAttribute('teclado', 'modal');
      document.body.appendChild(prancha);

      for (const tipo of ['keydown', 'keyup', 'keypress']) {
        for (const [k, extra] of AMOSTRA_30_TECLAS) tecla(document.body, k, extra, tipo);
      }

      expect(naJanela).not.toHaveBeenCalled();
      expect(noDocumento).not.toHaveBeenCalled();
    } finally {
      for (const tipo of ['keydown', 'keyup', 'keypress']) {
        window.removeEventListener(tipo, naJanela);
        document.removeEventListener(tipo, noDocumento);
      }
    }
  });

  it('teclas reservadas do navegador continuam passando fora do componente (e zoom fora do canvas)', () => {
    const g = vi.fn();
    window.addEventListener('keydown', g);
    try {
      montarEditor({ teclado: 'modal' });
      const reservadas: Array<[string, KeyboardEventInit?]> = [
        ['F5'], ['F11'], ['F12'], ['r', { ctrlKey: true }], ['l', { metaKey: true }],
        ['w', { ctrlKey: true }], ['t', { ctrlKey: true }], ['I', { ctrlKey: true, shiftKey: true }],
        ['J', { ctrlKey: true, shiftKey: true }], ['Tab'], ['0', { ctrlKey: true }],
        ['+', { ctrlKey: true }], ['=', { ctrlKey: true }], ['-', { ctrlKey: true }]
      ];
      for (const [k, extra] of reservadas) {
        g.mockClear();
        tecla(document.body, k, extra);
        expect(g, `reservada ${k} deveria passar`).toHaveBeenCalledTimes(1);
      }
    } finally {
      window.removeEventListener('keydown', g);
    }
  });

  it('campos de texto fora do componente continuam passando quando o foco está num deles; outros alvos fora são bloqueados', () => {
    const g = vi.fn();
    const noInput = vi.fn();
    for (const tipo of ['keydown', 'keyup', 'keypress']) window.addEventListener(tipo, g);

    try {
      const input = document.createElement('input');
      const textarea = document.createElement('textarea');
      const select = document.createElement('select');
      const foraBtn = document.createElement('button');
      const hostShadow = document.createElement('div');
      const inputShadow = document.createElement('input');
      hostShadow.attachShadow({ mode: 'open' }).appendChild(inputShadow);
      document.body.append(input, textarea, select, foraBtn, hostShadow);
      input.addEventListener('keydown', noInput);

      const ed = montarEditor({ teclado: 'modal' });
      ed.elementos = [ret('a')];
      ed.prancha.selecionarElementos(['a']);

      for (const campo of [input, textarea, select, inputShadow]) {
        campo.focus();
        for (const tipo of ['keydown', 'keyup', 'keypress']) {
          g.mockClear();
          tecla(campo, 'a', {}, tipo);
          expect(g).toHaveBeenCalledTimes(1);
          g.mockClear();
          tecla(campo, 'Delete', {}, tipo);
          expect(g).toHaveBeenCalledTimes(1);
        }
      }
      expect(noInput).toHaveBeenCalled();

      // Foco no campo de fora, evento disparado no corpo da página também respeita o foco no campo de texto
      input.focus();
      g.mockClear();
      tecla(document.body, 'x');
      expect(g).toHaveBeenCalledTimes(1);

      // Foco num campo DENTRO do componente não libera evento disparado fora (no corpo da página)
      const inputDentro = document.createElement('input');
      ed.shadowRoot!.appendChild(inputDentro);
      inputDentro.focus();
      g.mockClear();
      tecla(document.body, 'x');
      expect(g).not.toHaveBeenCalled();

      // Alvo fora que não é campo de texto (botão externo) é bloqueado em captura na janela
      foraBtn.focus();
      const noBtn = vi.fn();
      foraBtn.addEventListener('keydown', noBtn);
      g.mockClear();
      tecla(foraBtn, 'Enter');
      expect(noBtn).not.toHaveBeenCalled();
      expect(g).not.toHaveBeenCalled();
      expect(ed.elementos).toHaveLength(1);
    } finally {
      for (const tipo of ['keydown', 'keyup', 'keypress']) window.removeEventListener(tipo, g);
    }
  });

  it('dentro do editor em modo modal: botões, painéis, menu e prancha funcionam normalmente e não vazam ao hospedeiro', () => {
    const g = vi.fn();
    for (const tipo of ['keydown', 'keyup', 'keypress']) window.addEventListener(tipo, g);

    try {
      const ed = montarEditor({ teclado: 'modal', lateral: 'gaveta' });
      const concluir = vi.fn();
      ed.addEventListener('editor-concluir', concluir);
      ed.elementos = [ret('a')];
      ed.prancha.selecionarElementos(['a']);

      // Alt+P abre a lateral (a prancha interna não bloqueia o editor pai)
      tecla(viewportDe(ed), 'p', { altKey: true });
      expect(ed.lateralAberta).toBe(true);
      expect(g).not.toHaveBeenCalled();

      // Input/painel dentro da lateral funciona, mas não vaza ao hospedeiro
      const propriedades = ed.shadowRoot!.getElementById('propriedades')!;
      const propKeydown = vi.fn();
      propriedades.addEventListener('keydown', propKeydown);
      tecla(propriedades, 'a');
      expect(propKeydown).toHaveBeenCalledTimes(1);
      expect(g).not.toHaveBeenCalled();

      // Zoom do navegador no painel de propriedades (fora do canvas) ainda passa
      tecla(propriedades, '+', { ctrlKey: true });
      expect(g).toHaveBeenCalledTimes(1);
      g.mockClear();

      // Esc na lateral fecha e limpa o foco antes de re-renderizar camadas (workaround do activeElement em shadow irmão no happy-dom)
      tecla(propriedades, 'Escape');
      expect(ed.lateralAberta).toBe(false);
      (ed.shadowRoot!.activeElement as HTMLElement | null)?.blur?.();

      // Botões do próprio editor funcionam e suas teclas não vazam
      const concluirBtn = ed.shadowRoot!.getElementById('concluir') as HTMLButtonElement;
      const btnKey = vi.fn();
      concluirBtn.addEventListener('keydown', btnKey);
      tecla(concluirBtn, 'Enter');
      expect(btnKey).toHaveBeenCalledTimes(1);
      expect(g).not.toHaveBeenCalled();

      // Prancha trata Delete no viewport e não vaza ao hospedeiro
      const e = tecla(viewportDe(ed), 'Delete');
      expect(e.defaultPrevented).toBe(true);
      expect(ed.elementos).toHaveLength(0);
      expect(g).not.toHaveBeenCalled();
    } finally {
      for (const tipo of ['keydown', 'keyup', 'keypress']) window.removeEventListener(tipo, g);
    }
  });

  it('sem vazar listener ao desconectar e reconectar; após desconectar, as 30 teclas voltam a chegar', () => {
    const naJanela = vi.fn();
    for (const tipo of ['keydown', 'keyup', 'keypress']) window.addEventListener(tipo, naJanela);
    const add = vi.spyOn(window, 'addEventListener');
    const rem = vi.spyOn(window, 'removeEventListener');

    try {
      const ed = montarEditor({ teclado: 'modal' });
      for (const [k, extra] of AMOSTRA_30_TECLAS) tecla(document.body, k, extra);
      expect(naJanela).not.toHaveBeenCalled();

      // Desconectar e reconectar 3 vezes
      for (let i = 0; i < 3; i++) {
        document.body.removeChild(ed);
        expect(rem.mock.calls.length).toBe(add.mock.calls.length);
        document.body.appendChild(ed);
      }
      document.body.removeChild(ed);
      expect(rem.mock.calls.length).toBe(add.mock.calls.length);

      // Após desconectar, todas as 30 teclas voltam a chegar ao listener global em keydown/keyup/keypress
      for (const tipo of ['keydown', 'keyup', 'keypress']) {
        naJanela.mockClear();
        for (const [k, extra] of AMOSTRA_30_TECLAS) tecla(document.body, k, extra, tipo);
        expect(naJanela).toHaveBeenCalledTimes(AMOSTRA_30_TECLAS.length);
      }

      // O mesmo para <ui-canvas-prancha teclado="modal"> avulsa
      add.mockClear();
      rem.mockClear();
      const avulsa = document.createElement('ui-canvas-prancha');
      avulsa.setAttribute('teclado', 'modal');
      document.body.appendChild(avulsa);
      naJanela.mockClear();
      tecla(document.body, 'f');
      expect(naJanela).not.toHaveBeenCalled();
      document.body.removeChild(avulsa);
      expect(rem.mock.calls.length).toBe(add.mock.calls.length);
      tecla(document.body, 'f');
      expect(naJanela).toHaveBeenCalledTimes(1);
    } finally {
      add.mockRestore();
      rem.mockRestore();
      for (const tipo of ['keydown', 'keyup', 'keypress']) window.removeEventListener(tipo, naJanela);
    }
  });

  it('troca dinâmica do atributo teclado entre modal, isolado e local', () => {
    const g = vi.fn();
    window.addEventListener('keydown', g);
    try {
      const ed = montarEditor({ teclado: 'isolado' });
      tecla(document.body, 'f');
      expect(g).toHaveBeenCalledTimes(1);

      g.mockClear();
      ed.setAttribute('teclado', 'modal');
      tecla(document.body, 'f');
      expect(g).not.toHaveBeenCalled();

      ed.removeAttribute('teclado'); // volta ao padrão 'isolado' do editor
      tecla(document.body, 'f');
      expect(g).toHaveBeenCalledTimes(1);

      g.mockClear();
      ed.setAttribute('teclado', 'modal');
      tecla(document.body, 'f');
      expect(g).not.toHaveBeenCalled();

      ed.setAttribute('teclado', 'local');
      tecla(document.body, 'f');
      expect(g).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('keydown', g);
    }
  });
});
