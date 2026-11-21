import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-ribbon';
import { UIRibbon } from './ui-ribbon';
import { criarGrupoRibbon } from './ribbon-render';
import { criarBotaoFerramenta } from './ferramentas-comum';
import type { RibbonAba } from './tipos';

/* ---------- Layout simulado (o happy-dom não calcula tamanhos) ---------- */

let larguraPainel = 700;
let larguraHost = 1000;
const larguraGrupo = { cheio: 200, reduzido: 120, colapsado: 60 };
let observadores: { cb: ResizeObserverCallback; alvos: Element[]; desconectado: boolean }[] = [];

const descritores: [string, PropertyDescriptor | undefined][] = [];
function simular(nome: 'offsetWidth' | 'clientWidth', get: (el: HTMLElement) => number | undefined) {
  descritores.push([nome, Object.getOwnPropertyDescriptor(HTMLElement.prototype, nome)]);
  Object.defineProperty(HTMLElement.prototype, nome, {
    configurable: true,
    get(this: HTMLElement) {
      return get(this) ?? 0;
    }
  });
}

class ResizeObserverFalso {
  registro: (typeof observadores)[number];
  constructor(cb: ResizeObserverCallback) {
    this.registro = { cb, alvos: [], desconectado: false };
    observadores.push(this.registro);
  }
  observe(el: Element) {
    this.registro.alvos.push(el);
  }
  unobserve() {}
  disconnect() {
    this.registro.desconectado = true;
  }
}

/** Dispara os observadores ainda conectados (como se o navegador tivesse redimensionado). */
const redimensionar = () => observadores.filter(o => !o.desconectado).forEach(o => o.cb([], o as unknown as ResizeObserver));

const abas = (extra: Partial<RibbonAba>[] = []): RibbonAba[] => [
  {
    id: 'inicio',
    rotulo: 'Início',
    grupos: [
      { id: 'g1', rotulo: 'Área', prioridade: 3, itens: [{ id: 'a1', rotulo: 'Colar', icone: 'colar' }, { id: 'a2', rotulo: 'Copiar', icone: 'copiar' }] },
      { id: 'g2', rotulo: 'Fonte', prioridade: 2, itens: [{ id: 'b1', rotulo: 'Negrito', icone: 'negrito' }, { id: 'b2', rotulo: 'Itálico', icone: 'italico' }] },
      { id: 'g3', rotulo: 'Parágrafo', prioridade: 1, itens: [{ id: 'c1', rotulo: 'Alinhar', icone: 'alinhar' }, { id: 'c2', rotulo: 'Listar', icone: 'lista' }] }
    ]
  },
  ...(extra as RibbonAba[])
];

function montar(a: RibbonAba[] = abas(), attrs: Record<string, string> = {}): UIRibbon {
  const r = document.createElement('ui-ribbon') as UIRibbon;
  Object.entries(attrs).forEach(([k, v]) => r.setAttribute(k, v));
  r.abas = a;
  document.body.appendChild(r);
  return r;
}

const grupo = (r: UIRibbon, id: string) => r.shadowRoot!.querySelector<HTMLElement>(`.ui-ribbon__grupo[data-id="${id}"]`)!;
const estado = (r: UIRibbon, id: string) => {
  const el = grupo(r, id);
  return el.classList.contains('ui-ribbon__grupo--colapsado') ? 'colapsado' : el.classList.contains('ui-ribbon__grupo--reduzido') ? 'reduzido' : 'cheio';
};

beforeEach(() => {
  document.body.innerHTML = '';
  larguraPainel = 700;
  larguraHost = 1000;
  observadores = [];
  vi.stubGlobal('ResizeObserver', ResizeObserverFalso);
  simular('clientWidth', el => (el.classList.contains('ui-ribbon__painel') ? larguraPainel : undefined));
  simular('offsetWidth', el => {
    if (el.tagName === 'UI-RIBBON') return larguraHost;
    if (el.classList.contains('ui-ribbon__grupo')) {
      if (el.classList.contains('ui-ribbon__grupo--colapsado')) return larguraGrupo.colapsado;
      if (el.classList.contains('ui-ribbon__grupo--reduzido')) return larguraGrupo.reduzido;
      return larguraGrupo.cheio;
    }
    return undefined;
  });
});

afterEach(() => {
  descritores.splice(0).reverse().forEach(([nome, d]) => {
    if (d) Object.defineProperty(HTMLElement.prototype, nome, d);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[nome];
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ribbon-render — nível reduzido (só ícones)', () => {
  it('criarGrupoRibbon({ reduzido }) deixa botões pequenos com ícone sem rótulo visível, mas com nome acessível', () => {
    const g = { id: 'g', rotulo: 'G', itens: [{ id: 'x', rotulo: 'Colar', icone: 'colar' }, { id: 'y', rotulo: 'Sem ícone' }] };
    const el = criarGrupoRibbon(g, (i, v, t) => criarBotaoFerramenta(i, v, t), { reduzido: true });
    expect(el.classList.contains('ui-ribbon__grupo--reduzido')).toBe(true);
    const x = el.querySelector<HTMLButtonElement>('[data-id="x"]')!;
    expect(x.querySelector('.ui-ferr-btn__rotulo')).toBeNull();
    expect(x.classList.contains('ui-ferr-btn--so-icone')).toBe(true);
    expect(x.getAttribute('aria-label')).toBe('Colar');
    expect(x.dataset.tooltip).toBe('Colar');
    // sem ícone, o rótulo é a única pista: continua visível
    expect(el.querySelector('[data-id="y"] .ui-ferr-btn__rotulo')?.textContent).toBe('Sem ícone');
  });

  it('não altera os dados do consumidor (o item original mantém o rótulo)', () => {
    const item = { id: 'x', rotulo: 'Colar', icone: 'colar' };
    criarGrupoRibbon({ id: 'g', rotulo: 'G', itens: [item] }, (i, v, t) => criarBotaoFerramenta(i, v, t), { reduzido: true });
    expect((item as { somenteIcone?: boolean }).somenteIcone).toBeUndefined();
  });

  it('botões grandes mantêm o rótulo no nível reduzido', () => {
    const g = { id: 'g', rotulo: 'G', itens: [{ id: 'x', rotulo: 'Colar', icone: 'colar', tamanho: 'grande' as const }] };
    const el = criarGrupoRibbon(g, (i, v, t) => criarBotaoFerramenta(i, v, t), { reduzido: true });
    expect(el.querySelector('[data-id="x"] .ui-ferr-btn__rotulo')?.textContent).toBe('Colar');
  });
});

describe('<ui-ribbon> responsivo — degradê progressivo por largura', () => {
  it('largo: nada degrada; estreitando reduz por prioridade, depois colapsa; alargando restaura tudo', () => {
    const r = montar();
    redimensionar();
    expect(['g1', 'g2', 'g3'].map(id => estado(r, id))).toEqual(['cheio', 'cheio', 'cheio']);

    larguraPainel = 500;
    redimensionar();
    expect(['g1', 'g2', 'g3'].map(id => estado(r, id))).toEqual(['cheio', 'reduzido', 'reduzido']);

    larguraPainel = 380;
    redimensionar();
    expect(['g1', 'g2', 'g3'].map(id => estado(r, id))).toEqual(['reduzido', 'reduzido', 'reduzido']);

    larguraPainel = 305; // (a implementação reserva 1px de folga de arredondamento)
    redimensionar();
    expect(['g1', 'g2', 'g3'].map(id => estado(r, id))).toEqual(['reduzido', 'reduzido', 'colapsado']);

    // uma única notificação resolve vários degraus de uma vez
    larguraPainel = 100;
    redimensionar();
    expect(['g1', 'g2', 'g3'].map(id => estado(r, id))).toEqual(['colapsado', 'colapsado', 'colapsado']);

    larguraPainel = 900;
    redimensionar();
    expect(['g1', 'g2', 'g3'].map(id => estado(r, id))).toEqual(['cheio', 'cheio', 'cheio']);
  });

  it('mesma largura de novo não recria o DOM do painel (sem laço nem re-render à toa)', () => {
    const r = montar();
    larguraPainel = 500;
    redimensionar();
    const antes = grupo(r, 'g1');
    redimensionar();
    redimensionar();
    expect(grupo(r, 'g1')).toBe(antes);
  });

  it('painel oculto (largura 0, p. ex. faixa recolhida) não decide nada', () => {
    const r = montar();
    larguraPainel = 0;
    redimensionar();
    expect(['g1', 'g2', 'g3'].map(id => estado(r, id))).toEqual(['cheio', 'cheio', 'cheio']);
  });

  it('ao trocar de aba, a nova aba é medida e ajustada à largura atual', () => {
    const r = montar(abas([{
      id: 'editar',
      rotulo: 'Editar',
      grupos: [
        { id: 'e1', rotulo: 'Uno', itens: [{ id: 'e1a', rotulo: 'A', icone: 'a' }] },
        { id: 'e2', rotulo: 'Duo', itens: [{ id: 'e2a', rotulo: 'B', icone: 'b' }] }
      ]
    }]));
    larguraPainel = 300; // dois grupos de 200 não cabem
    r.selecionarAba('editar');
    expect(['e1', 'e2'].map(id => estado(r, id))).not.toEqual(['cheio', 'cheio']);
  });

  it('item de grupo colapsado continua acionável pelo flyout e emite ui-ferramenta', () => {
    const r = montar();
    const spy = vi.fn();
    r.addEventListener('ui-ferramenta', spy);
    larguraPainel = 100;
    redimensionar();
    grupo(r, 'g3').querySelector<HTMLButtonElement>('.ui-ribbon__btn-colapsado')!.click();
    r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-menu__item[data-id="c1"]')!.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.id).toBe('c1');
  });

  it('atualizarItem que muda a aparência (rótulo) refaz a medição', () => {
    const r = montar();
    larguraPainel = 500;
    redimensionar();
    expect(estado(r, 'g1')).toBe('cheio');
    larguraGrupo.cheio = 300; // o novo rótulo alargou os grupos (simulado)
    try {
      r.atualizarItem('a1', { rotulo: 'Colar tudo e manter formatação' });
      expect(estado(r, 'g1')).not.toBe('cheio');
    } finally {
      larguraGrupo.cheio = 200;
    }
  });

  it('atributo compacto invalida a medição e reajusta', () => {
    const r = montar();
    larguraPainel = 500;
    redimensionar();
    larguraGrupo.cheio = 120; // modo compacto estreita os grupos (simulado)
    try {
      r.setAttribute('compacto', '');
      expect(['g1', 'g2', 'g3'].map(id => estado(r, id))).toEqual(['cheio', 'cheio', 'cheio']);
    } finally {
      larguraGrupo.cheio = 200;
    }
  });

  it('aba sem grupos, grupos sem itens e prioridade NaN não quebram', () => {
    const r = montar([
      { id: 'vazia', rotulo: 'Vazia', grupos: [] },
      { id: 'x', rotulo: 'X', grupos: [{ id: 'gx', rotulo: 'GX', prioridade: NaN, itens: [] }] }
    ]);
    expect(() => redimensionar()).not.toThrow();
    larguraPainel = 10;
    r.selecionarAba('x');
    expect(() => redimensionar()).not.toThrow();
  });

  it('desconectar desliga os observadores; reconectar não os duplica', () => {
    const r = montar();
    const vivos = () => observadores.filter(o => !o.desconectado).length;
    expect(vivos()).toBe(1);
    r.remove();
    expect(vivos()).toBe(0);
    expect(() => redimensionar()).not.toThrow();
    document.body.appendChild(r);
    expect(vivos()).toBe(1);
    document.body.appendChild(r); // reconexão idempotente
    expect(vivos()).toBe(1);
  });

  it('sem ResizeObserver (ambiente antigo/SSR) o componente monta normalmente', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    expect(() => montar()).not.toThrow();
  });
});

describe('<ui-ribbon> recolher-abaixo — recolhimento automático em tela estreita', () => {
  const montarAuto = (limite = '640') => montar(abas(), { 'recolher-abaixo': limite });

  it('recolhe ao ficar abaixo do limite e restaura ao voltar, emitindo ui-recolhido-change', () => {
    const r = montarAuto();
    const spy = vi.fn();
    r.addEventListener('ui-recolhido-change', spy);

    larguraHost = 500;
    redimensionar();
    expect(r.recolhido).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.recolhido).toBe(true);

    larguraHost = 900;
    redimensionar();
    expect(r.recolhido).toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('monta já estreito: recolhe na primeira medição', () => {
    larguraHost = 400;
    const r = montarAuto();
    redimensionar();
    expect(r.recolhido).toBe(true);
  });

  it('não restaura o que o usuário recolheu à mão', () => {
    const r = montarAuto();
    r.recolhido = true; // escolha do usuário em tela larga
    larguraHost = 500;
    redimensionar();
    larguraHost = 900;
    redimensionar();
    expect(r.recolhido).toBe(true);
  });

  it('se o usuário expande a faixa em tela estreita, a automação não a recolhe de novo', () => {
    const r = montarAuto();
    larguraHost = 500;
    redimensionar();
    expect(r.recolhido).toBe(true);
    r.recolhido = false; // usuário fixou a faixa
    redimensionar();
    redimensionar();
    expect(r.recolhido).toBe(false);
    // ao voltar a largo e estreitar de novo, a automação volta a valer
    larguraHost = 900;
    redimensionar();
    larguraHost = 500;
    redimensionar();
    expect(r.recolhido).toBe(true);
  });

  it('limite inválido ou ausente desliga a automação', () => {
    for (const limite of ['', 'abc', '0', '-10']) {
      document.body.innerHTML = '';
      observadores = [];
      larguraHost = 300;
      const r = montarAuto(limite);
      redimensionar();
      expect(r.recolhido).toBe(false);
    }
  });

  it('a propriedade recolherAbaixo espelha o atributo', () => {
    const r = montar();
    expect(r.recolherAbaixo).toBe(0);
    r.recolherAbaixo = 600;
    expect(r.getAttribute('recolher-abaixo')).toBe('600');
    larguraHost = 500;
    redimensionar();
    expect(r.recolhido).toBe(true);
    r.recolherAbaixo = 0;
    expect(r.hasAttribute('recolher-abaixo')).toBe(false);
  });
});

describe('<ui-ribbon> abas — aba ativa sempre visível', () => {
  it('ao selecionar uma aba fora da área visível, a lista de abas rola até ela', () => {
    const muitas: RibbonAba[] = Array.from({ length: 12 }, (_, i) => ({
      id: `t${i}`, rotulo: `Aba ${i}`, grupos: [{ id: `g${i}`, rotulo: 'G', itens: [{ id: `i${i}`, rotulo: 'I' }] }]
    }));
    const r = montar(muitas);
    const lista = r.shadowRoot!.querySelector<HTMLElement>('.ui-ribbon__abas')!;
    Object.defineProperty(lista, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(lista, 'scrollWidth', { configurable: true, value: 1200 });
    // retângulos coerentes com a rolagem: aba i fica em i*100 no conteúdo, 90 de largura
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('ui-ribbon__aba')) {
        const i = Number(this.dataset.id!.slice(1));
        const left = i * 100 - (this.parentElement as HTMLElement).scrollLeft;
        return { left, right: left + 90, width: 90, top: 0, bottom: 20, height: 20, x: left, y: 0, toJSON() {} } as DOMRect;
      }
      return original.call(this);
    });
    r.selecionarAba('t9');
    // aba 9: início 900, fim 990; com margem 8 → 998 - 300 = 698
    expect(lista.scrollLeft).toBe(698);
    // voltar a uma aba à esquerda rola de volta
    r.selecionarAba('t0');
    expect(lista.scrollLeft).toBe(0);
  });
});

describe('<ui-ribbon> abas — menu "mais abas" quando a lista transborda', () => {
  const muitas = (n = 12): RibbonAba[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `t${i}`, rotulo: `Aba ${i}`, grupos: [{ id: `g${i}`, rotulo: 'G', itens: [{ id: `i${i}`, rotulo: 'I' }] }]
    }));

  const lista = (r: UIRibbon) => r.shadowRoot!.querySelector<HTMLElement>('.ui-ribbon__abas')!;
  const botao = (r: UIRibbon) => r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ribbon__mais-abas')!;
  const transbordar = (r: UIRibbon, transborda: boolean) => {
    Object.defineProperty(lista(r), 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(lista(r), 'scrollWidth', { configurable: true, value: transborda ? 1200 : 300 });
    redimensionar();
  };

  it('só aparece quando as abas não cabem e some quando passam a caber', () => {
    const r = montar(muitas());
    expect(botao(r).hidden).toBe(true);
    transbordar(r, true);
    expect(botao(r).hidden).toBe(false);
    transbordar(r, false);
    expect(botao(r).hidden).toBe(true);
  });

  it('é um botão de menu acessível, com rótulo configurável', () => {
    const r = montar(muitas());
    expect(botao(r).getAttribute('aria-haspopup')).toBe('menu');
    expect(botao(r).getAttribute('aria-expanded')).toBe('false');
    expect(botao(r).getAttribute('aria-label')).toBe('Todas as abas');
    expect(botao(r).getAttribute('part')).toBe('mais-abas');
    r.setAttribute('rotulo-mais-abas', 'Mostrar abas');
    expect(botao(r).getAttribute('aria-label')).toBe('Mostrar abas');
  });

  it('lista todas as abas visíveis (não as ocultas) e marca a ativa', () => {
    const a = muitas(5);
    a[3].oculta = true;
    const r = montar(a);
    transbordar(r, true);
    botao(r).click();
    const itens = [...r.shadowRoot!.querySelectorAll<HTMLElement>('.ui-ferr-menu__item')];
    expect(itens.map(i => i.dataset.id)).toEqual(['t0', 't1', 't2', 't4']);
    expect(botao(r).getAttribute('aria-expanded')).toBe('true');
    expect(itens[0].getAttribute('aria-checked')).toBe('true');
    expect(itens[1].getAttribute('aria-checked')).toBe('false');
  });

  it('escolher um item seleciona a aba, emite ui-aba-change, fecha o menu e foca a aba', () => {
    const r = montar(muitas());
    transbordar(r, true);
    const spy = vi.fn();
    r.addEventListener('ui-aba-change', spy);
    botao(r).click();
    r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-menu__item[data-id="t7"]')!.click();
    expect(r.abaAtiva).toBe('t7');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.id).toBe('t7');
    expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
    expect(botao(r).getAttribute('aria-expanded')).toBe('false');
    expect(r.shadowRoot!.activeElement?.getAttribute('data-id')).toBe('t7');
  });

  it('clicar de novo no botão fecha o menu; o menu não vaza ao desconectar', () => {
    const r = montar(muitas());
    transbordar(r, true);
    botao(r).click();
    botao(r).click();
    expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
    botao(r).click();
    r.remove();
    expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
  });

  it('se as abas passam a caber com o menu aberto, o menu fecha junto com o botão', () => {
    const r = montar(muitas());
    transbordar(r, true);
    botao(r).click();
    transbordar(r, false);
    expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
    expect(botao(r).hidden).toBe(true);
  });

  it('abas ocultas/exibidas e troca de `abas` reavaliam o transbordo; sem abas não quebra', () => {
    const r = montar([]);
    expect(() => redimensionar()).not.toThrow();
    r.abas = muitas(3);
    transbordar(r, true);
    r.definirAbaVisivel('t1', false);
    botao(r).click();
    expect([...r.shadowRoot!.querySelectorAll<HTMLElement>('.ui-ferr-menu__item')].map(i => i.dataset.id)).toEqual(['t0', 't2']);
  });

  it('rótulos com HTML/caracteres especiais são texto, não markup', () => {
    const r = montar([{ id: 'x', rotulo: '<img src=x onerror=alert(1)>', grupos: [] }, ...muitas(2)]);
    transbordar(r, true);
    botao(r).click();
    expect(r.shadowRoot!.querySelector('.ui-ferr-menu img')).toBeNull();
    expect(r.shadowRoot!.querySelector('.ui-ferr-menu__item')!.textContent).toContain('<img');
  });
});
