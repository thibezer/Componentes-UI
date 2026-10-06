import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../src');
const CORES = fs.readFileSync(path.join(SRC, 'tokens/colors.css'), 'utf-8').replace(/\r\n/g, '\n');

/** Declarações `--ui-*` de um bloco, a partir do índice onde ele começa. */
function declaracoes(inicio: number): Record<string, string> {
  const abre = CORES.indexOf('{', inicio);
  const fecha = CORES.indexOf('}', abre);
  return Object.fromEntries(
    Array.from(CORES.slice(abre + 1, fecha).matchAll(/(--ui-[a-z0-9-]+):\s*([^;]+);/g), (m) => [m[1], m[2].trim()])
  );
}

const escuro = declaracoes(CORES.indexOf(':root,'));
const claro = declaracoes(CORES.indexOf(':root[data-tema="claro"]'));
const claroAutomatico = declaracoes(CORES.indexOf('@media (prefers-color-scheme: light)'));

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Cor `c` com opacidade `alfa` sobre `base` (como um fundo tingido com color-mix). */
function tingir(c: string, base: string, alfa: number): string {
  const canal = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map((i) => Math.round(canal(c, i) * alfa + canal(base, i) * (1 - alfa))
    .toString(16).padStart(2, '0')).join('');
}

describe('Tokens de cor dos temas', () => {
  it('o tema claro automático (prefers-color-scheme) deve ser idêntico ao tema claro forçado', () => {
    expect(Object.keys(claro).length).toBeGreaterThan(10);
    expect(claroAutomatico).toEqual(claro);
  });

  it('os dois temas devem definir o mesmo conjunto de tokens', () => {
    expect(Object.keys(claro).sort()).toEqual(Object.keys(escuro).sort());
  });

  describe.each([
    ['escuro', escuro],
    ['claro', claro],
  ])('tema %s: contraste WCAG AA (4,5:1)', (_nome, t) => {
    const fundos = ['--ui-cor-fundo', '--ui-cor-superficie', '--ui-cor-fundo-elevado', '--ui-cor-fundo-card'];
    const textos = ['--ui-cor-texto', '--ui-cor-texto-secundario', '--ui-cor-texto-erro', '--ui-cor-texto-sucesso',
      '--ui-cor-texto-alerta', '--ui-cor-texto-info', '--ui-cor-primaria'];
    const status = ['--ui-cor-texto-erro', '--ui-cor-texto-sucesso', '--ui-cor-texto-alerta', '--ui-cor-texto-info'];

    it.each(textos)('%s sobre todos os fundos', (texto) => {
      for (const fundo of fundos) {
        expect(contraste(t[texto], t[fundo]), `${texto} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it.each(status)('%s sobre o próprio tom de fundo (até 16%%)', (cor) => {
      for (const fundo of fundos) {
        expect(contraste(t[cor], tingir(t[cor], t[fundo], 0.16)), `${cor} sobre tom em ${fundo}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('texto sobre a primária, sobre os status sólidos e sobre o botão destrutivo', () => {
      expect(contraste(t['--ui-cor-texto-sobre-primaria'], t['--ui-cor-primaria'])).toBeGreaterThanOrEqual(4.5);
      for (const cor of status) {
        expect(contraste(t['--ui-cor-texto-sobre-status'], t[cor]), cor).toBeGreaterThanOrEqual(4.5);
      }
      for (const fundo of ['--ui-cor-botao-destrutivo-fundo', '--ui-cor-botao-destrutivo-hover']) {
        expect(contraste(t['--ui-cor-botao-destrutivo-texto'], t[fundo]), fundo).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  it('nenhum componente deve detectar o tema por conta própria (o tema chega só pelos tokens)', () => {
    const arquivos = fs.readdirSync(path.join(SRC, 'components'), { recursive: true })
      .map(String).filter((arquivo) => arquivo.endsWith('.css'));
    const comSeletorDeTema = arquivos.filter((arquivo) =>
      /data-tema|data-theme|:host-context|prefers-color-scheme|(^|[\s,])\.(light|dark)\b/m
        .test(fs.readFileSync(path.join(SRC, 'components', arquivo), 'utf-8'))
    );
    expect(comSeletorDeTema).toEqual([]);
  });
});

describe('UIBus: tema do sistema operacional', () => {
  let prefereClaro = false;
  let aoMudar: (() => void) | null = null;

  beforeEach(() => {
    vi.resetModules();
    prefereClaro = false;
    aoMudar = null;
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      get matches() { return consulta.includes('light') && prefereClaro; },
      addEventListener: (_tipo: string, ouvinte: () => void) => { aoMudar = ouvinte; },
    }));
    const html = document.documentElement;
    html.removeAttribute('data-tema');
    html.removeAttribute('data-theme');
    html.classList.remove('dark', 'light');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const carregarUIBus = async () => (await import('../src/core/ui-bus')).UIBus;

  it('sem tema forçado, obterTema() deve seguir o sistema operacional', async () => {
    const UIBus = await carregarUIBus();
    expect(UIBus.obterTema()).toBe('escuro');
    prefereClaro = true;
    expect(UIBus.obterTema()).toBe('claro');
  });

  it('definirTema() sem argumento deve alternar a partir do tema em vigor (inclusive o do SO)', async () => {
    prefereClaro = true;
    const UIBus = await carregarUIBus();
    expect(UIBus.definirTema()).toBe('escuro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('escuro');
  });

  it("definirTema('auto') deve remover o tema forçado e voltar ao do SO", async () => {
    prefereClaro = true;
    const UIBus = await carregarUIBus();
    UIBus.definirTema('escuro');

    expect(UIBus.definirTema('auto')).toBe('claro');
    const html = document.documentElement;
    expect(html.hasAttribute('data-tema')).toBe(false);
    expect(html.classList.contains('dark') || html.classList.contains('light')).toBe(false);
  });

  it('deve emitir tema:alterado quando o SO muda de tema, só se nenhum tema estiver forçado', async () => {
    const UIBus = await carregarUIBus();
    const ouvinte = vi.fn();
    UIBus.on('tema:alterado', ouvinte);

    prefereClaro = true;
    aoMudar!();
    expect(ouvinte).toHaveBeenLastCalledWith({ tema: 'claro' });

    UIBus.definirTema('escuro');
    ouvinte.mockClear();
    prefereClaro = false;
    aoMudar!();
    expect(ouvinte).not.toHaveBeenCalled();
  });
});
