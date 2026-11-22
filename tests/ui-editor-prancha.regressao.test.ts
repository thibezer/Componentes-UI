import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/prancha';
import { criarRetangulo } from '../src/gerencigeo-canvas/prancha/elemento_criacao';
import { teclaReservadaDoNavegador, lerModoTeclado } from '../src/components/ui-canvas-prancha';
import type { UIEditorPrancha } from '../src/components/ui-editor-prancha';
import { lerBarraFormas, lerLateral } from '../src/components/ui-editor-prancha/editor-modos';

/* Itens 1 e 2 da segunda requisição do ConecteMapas: editor responsivo e teclado isolado (Camadas B, C e D). */

afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); });

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

describe('teclado isolado (item 2)', () => {
  const AMOSTRA: Array<[string, KeyboardEventInit?]> = [
    ['a'], ['b'], ['f'], ['g'], ['h'], ['k'], ['m'], ['n'], ['o'], ['q'], ['s'], ['u'], ['x'], ['y'], ['z'],
    ['['], [']'], ['Delete'], ['Backspace'], ['ArrowLeft'], ['ArrowUp'], ['ArrowRight'], ['ArrowDown'], ['Enter'], ['Escape'],
    ['d', { ctrlKey: true }], ['z', { ctrlKey: true }], ['a', { ctrlKey: true }], ['1'], [' ']
  ];

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
