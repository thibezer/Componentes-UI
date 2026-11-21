import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-paleta-ferramentas';
import type { UIPaletaFerramentas } from './ui-paleta-ferramentas';
import type { FerramentaItem } from './tipos';

/**
 * Paleta responsiva e inteligente: colunas="auto" + excesso="menu" (botão "Mais ferramentas").
 * happy-dom não faz layout: o espaço é simulado no contêiner (clientHeight/Width) e o transbordo
 * real na raiz da paleta (scrollHeight/clientHeight), exatamente o que o componente mede.
 * Medidas padrão (botão md): 34px, gap 2px, moldura 10px → n botões = n*34 + (n-1)*2 + 10.
 */

const ids = (n: number): FerramentaItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `f${i}`, rotulo: `Ferramenta ${i}`, icone: 'mover', atalho: String.fromCharCode(97 + i) }));

function montar(atributos: Record<string, string> = {}, itens: FerramentaItem[] = ids(12)) {
  const pai = document.createElement('div');
  document.body.appendChild(pai);
  const p = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
  Object.entries(atributos).forEach(([k, v]) => p.setAttribute(k, v));
  p.ferramentas = itens;
  pai.appendChild(p);
  return { pai, p };
}

function definir(el: Element, prop: string, valor: number) {
  Object.defineProperty(el, prop, { value: valor, configurable: true });
}

/** Simula o contêiner com `limite` px; `transborda` = a paleta realmente rolaria nesse espaço. */
function espaco(pai: HTMLElement, p: UIPaletaFerramentas, limite: number, transborda = true) {
  ['clientHeight', 'clientWidth'].forEach(k => definir(pai, k, limite));
  const raiz = p.shadowRoot!.querySelector('.ui-paleta')!;
  ['scrollHeight', 'scrollWidth'].forEach(k => definir(raiz, k, transborda ? 9999 : 0));
  ['clientHeight', 'clientWidth'].forEach(k => definir(raiz, k, 100));
  p.reajustar();
}

const raizDe = (p: UIPaletaFerramentas) => p.shadowRoot!.querySelector('.ui-paleta') as HTMLElement;
const botoes = (p: UIPaletaFerramentas) => Array.from(p.shadowRoot!.querySelectorAll<HTMLButtonElement>('.ui-ferr-btn'));
const mais = (p: UIPaletaFerramentas) => p.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn--mais');
const normais = (p: UIPaletaFerramentas) => botoes(p).filter(b => !b.classList.contains('ui-ferr-btn--mais'));

describe('<ui-paleta-ferramentas> responsiva — excesso="menu" (padrão)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('sem limite de espaço: todos os botões, sem botão "mais"', () => {
    const { p } = montar();
    expect(normais(p)).toHaveLength(12);
    expect(mais(p)).toBeNull();
  });

  it('regressão: paleta criada vazia em contêiner de altura automática não oculta nada ao receber as ferramentas', () => {
    // o contêiner mede só a paleta vazia (≈10px) e a lista chega depois: sem transbordo real, nada se oculta
    const pai = document.createElement('div');
    document.body.appendChild(pai);
    const p = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
    p.setAttribute('colunas', 'auto');
    pai.appendChild(p);
    ['clientHeight', 'clientWidth'].forEach(k => definir(pai, k, 10));
    p.ferramentas = ids(12);
    p.reajustar();
    expect(normais(p)).toHaveLength(12);
    expect(mais(p)).toBeNull();
    expect(p.colunas).toBe(1);
  });

  it('cabendo tudo, mesmo com contêiner medido: nada é ocultado', () => {
    const { pai, p } = montar();
    espaco(pai, p, 500, false);
    expect(normais(p)).toHaveLength(12);
    expect(mais(p)).toBeNull();
  });

  it('contêiner pequeno: oculta o excedente num botão "Mais ferramentas"', () => {
    const { pai, p } = montar();
    espaco(pai, p, 200); // k=4 + "mais" = 188px
    expect(normais(p)).toHaveLength(4);
    const m = mais(p)!;
    expect(m).toBeTruthy();
    expect(m.getAttribute('aria-haspopup')).toBe('menu');
    expect(m.getAttribute('aria-label')).toBe('Mais ferramentas');
    expect(m.hasAttribute('data-id')).toBe(false);
  });

  it('o espaço volta a crescer: botões ocultos reaparecem e o "mais" some', () => {
    const { pai, p } = montar();
    espaco(pai, p, 200);
    expect(mais(p)).toBeTruthy();
    espaco(pai, p, 600, false);
    expect(normais(p)).toHaveLength(12);
    expect(mais(p)).toBeNull();
  });

  it('reajustar é idempotente: não recria o DOM quando nada mudou', () => {
    const { pai, p } = montar();
    espaco(pai, p, 200);
    const antes = normais(p)[0];
    p.reajustar();
    p.reajustar();
    expect(normais(p)[0]).toBe(antes);
  });

  it('o menu "mais" lista os ocultos e escolher um ativa a ferramenta (evento cancelável)', () => {
    const { pai, p } = montar();
    espaco(pai, p, 200);
    const disparos: string[] = [];
    p.addEventListener('ui-ferramenta', e => disparos.push((e as CustomEvent).detail.id));

    mais(p)!.click();
    const itens = Array.from(p.shadowRoot!.querySelectorAll<HTMLButtonElement>('.ui-ferr-menu__item'));
    expect(itens.map(i => i.dataset.id)).toEqual(['f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11']);
    expect(mais(p)!.getAttribute('aria-expanded')).toBe('true');

    itens[2].click(); // f6
    expect(p.valor).toBe('f6');
    expect(disparos).toEqual(['f6']);
  });

  it('ferramenta ativa oculta: o "mais" assume o estado ativo e nomeia a ferramenta', () => {
    const { pai, p } = montar();
    espaco(pai, p, 200);
    p.ativar('f9');
    const m = mais(p)!;
    expect(m.classList.contains('ui-ferr-btn--ativo')).toBe(true);
    expect(m.getAttribute('aria-label')).toBe('Mais ferramentas: Ferramenta 9 ativa');
    expect(m.dataset.tooltip).toBe('Mais ferramentas — Ferramenta 9');
    p.ativar('f1');
    expect(mais(p)!.classList.contains('ui-ferr-btn--ativo')).toBe(false);
  });

  it('atalhos continuam valendo para ferramentas ocultas', () => {
    const { pai, p } = montar({ atalhos: '' });
    espaco(pai, p, 200);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true, cancelable: true })); // f9
    expect(p.valor).toBe('f9');
  });

  it('grupos ocultos viram submenu dentro do menu "mais"', () => {
    const itens: FerramentaItem[] = [
      ...ids(6),
      { id: 'forma', rotulo: 'Formas', filhos: [{ id: 'ret', rotulo: 'Retângulo' }, { id: 'elip', rotulo: 'Elipse' }] }
    ];
    const { pai, p } = montar({}, itens);
    espaco(pai, p, 160); // k=3 + mais
    mais(p)!.click();
    const grupo = p.shadowRoot!.querySelector('.ui-ferr-menu__item--has-sub');
    expect(grupo).toBeTruthy();
    // ferramenta ativa dentro de um grupo oculto também é refletida
    p.ativar('elip');
    expect(mais(p)!.classList.contains('ui-ferr-btn--ativo')).toBe(true);
  });

  it('separadores soltos na borda do corte são descartados', () => {
    const itens: FerramentaItem[] = [...ids(3), { id: 's', tipo: 'separador' }, ...ids(3).map(i => ({ ...i, id: `g${i.id}` }))];
    const { pai, p } = montar({}, itens);
    espaco(pai, p, 152); // 3 botões + mais: o separador cai exatamente na fronteira
    const seps = p.shadowRoot!.querySelectorAll('.ui-paleta__sep');
    expect(seps.length).toBe(0);
    expect(normais(p)).toHaveLength(3);
  });

  it('todos os ocultos desabilitados: o "mais" fica desabilitado', () => {
    const itens = ids(12).map((i, n) => (n >= 4 ? { ...i, disabled: true } : i));
    const { pai, p } = montar({}, itens);
    espaco(pai, p, 200);
    expect(mais(p)!.disabled).toBe(true);
  });

  it('seta de abrir flyout no "mais" abre o menu com foco no primeiro item', () => {
    const { pai, p } = montar();
    espaco(pai, p, 200);
    const m = mais(p)!;
    m.focus();
    m.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(p.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();
  });

  it('o "mais" entra na navegação por setas (roving)', () => {
    const { pai, p } = montar();
    espaco(pai, p, 200);
    const todos = botoes(p);
    todos[todos.length - 2].focus();
    todos[todos.length - 2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(p.shadowRoot!.activeElement).toBe(mais(p));
  });

  it('emite ui-paleta-ajuste só quando o ajuste muda', () => {
    const { pai, p } = montar();
    const eventos: Array<{ colunas: number; visiveis: number; total: number; ocultos: string[] }> = [];
    p.addEventListener('ui-paleta-ajuste', e => eventos.push((e as CustomEvent).detail));
    espaco(pai, p, 200);
    espaco(pai, p, 200);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ colunas: 1, visiveis: 4, total: 12 });
    expect(eventos[0].ocultos).toEqual(['f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11']);
    espaco(pai, p, 600, false);
    expect(eventos).toHaveLength(2);
    expect(eventos[1].ocultos).toEqual([]);
  });

  it('trocar a lista de ferramentas com o espaço já reduzido reajusta', () => {
    const { pai, p } = montar();
    espaco(pai, p, 200);
    p.ferramentas = ids(3);
    expect(normais(p)).toHaveLength(3);
    expect(mais(p)).toBeNull();
  });

  it('horizontal usa a largura do contêiner', () => {
    const { pai, p } = montar({ orientacao: 'horizontal' });
    espaco(pai, p, 200);
    expect(normais(p)).toHaveLength(4);
    expect(mais(p)).toBeTruthy();
  });
});

describe('<ui-paleta-ferramentas> responsiva — colunas="auto"', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('passa para 2 colunas antes de ocultar ferramentas', () => {
    const { pai, p } = montar({ colunas: 'auto' });
    expect(p.colunas).toBe(1);
    espaco(pai, p, 250); // 1 col = 440px; 2 col = 6 linhas = 224px
    expect(raizDe(p).classList.contains('ui-paleta--cols-2')).toBe(true);
    expect(p.colunas).toBe(2);
    expect(normais(p)).toHaveLength(12);
    expect(mais(p)).toBeNull();
  });

  it('volta a 1 coluna quando o espaço sobra', () => {
    const { pai, p } = montar({ colunas: 'auto' });
    espaco(pai, p, 250);
    espaco(pai, p, 600, false);
    expect(raizDe(p).classList.contains('ui-paleta--cols-2')).toBe(false);
    expect(p.colunas).toBe(1);
  });

  it('se nem 2 colunas cabem, oculta o excedente em 2 colunas', () => {
    const { pai, p } = montar({ colunas: 'auto' });
    espaco(pai, p, 120);
    expect(raizDe(p).classList.contains('ui-paleta--cols-2')).toBe(true);
    expect(mais(p)).toBeTruthy();
  });

  it('colunas="2" fixo continua funcionando e a propriedade aceita "auto"', () => {
    const { p } = montar({ colunas: '2' });
    expect(p.colunas).toBe(2);
    p.colunas = 'auto';
    expect(p.getAttribute('colunas')).toBe('auto');
    expect(p.colunas).toBe(1);
  });

  it('navegação em grade acompanha as colunas efetivas', () => {
    const { pai, p } = montar({ colunas: 'auto' });
    espaco(pai, p, 250);
    const b = botoes(p);
    b[0].focus();
    b[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(p.shadowRoot!.activeElement).toBe(b[1]);
  });
});

describe('<ui-paleta-ferramentas> responsiva — excesso="rolar" e robustez', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('excesso="rolar" mantém o comportamento antigo (nunca oculta)', () => {
    const { pai, p } = montar({ excesso: 'rolar' });
    espaco(pai, p, 100);
    expect(normais(p)).toHaveLength(12);
    expect(mais(p)).toBeNull();
    expect(p.excesso).toBe('rolar');
  });

  it('mudar excesso em tempo de execução reajusta', () => {
    const { pai, p } = montar({ excesso: 'rolar' });
    espaco(pai, p, 200);
    p.excesso = 'menu';
    espaco(pai, p, 200);
    expect(mais(p)).toBeTruthy();
    expect(p.excesso).toBe('menu');
    p.setAttribute('excesso', 'qualquer-coisa');
    expect(p.excesso).toBe('menu');
  });

  it('entradas hostis: lista nula, só separadores, contêiner ausente, medidas inválidas', () => {
    const { pai, p } = montar();
    expect(() => {
      p.ferramentas = null as unknown as FerramentaItem[];
      espaco(pai, p, 200);
      p.ferramentas = [{ id: 's1', tipo: 'separador' }, { id: 's2', tipo: 'separador' }];
      espaco(pai, p, 10);
      p.ferramentas = ids(5);
      espaco(pai, p, NaN);
      espaco(pai, p, -50);
      espaco(pai, p, Infinity);
    }).not.toThrow();
    expect(mais(p)).toBeNull();

    const solta = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
    solta.ferramentas = ids(5);
    expect(() => solta.reajustar()).not.toThrow(); // desconectada
  });

  it('ResizeObserver: observa ao conectar, desconecta ao remover e não duplica ao reconectar', () => {
    const instancias: Array<{ observados: Element[]; desconectou: boolean }> = [];
    class ROFalso {
      observados: Element[] = [];
      desconectou = false;
      constructor(_cb: ResizeObserverCallback) {
        instancias.push(this);
      }
      observe(el: Element) {
        this.observados.push(el);
      }
      unobserve() {}
      disconnect() {
        this.desconectou = true;
      }
    }
    vi.stubGlobal('ResizeObserver', ROFalso);

    const { pai, p } = montar();
    expect(instancias).toHaveLength(1);
    expect(instancias[0].observados).toContain(pai);
    expect(instancias[0].observados).toContain(p);

    p.remove();
    expect(instancias[0].desconectou).toBe(true);

    pai.appendChild(p);
    expect(instancias).toHaveLength(2);
    expect(instancias[1].desconectou).toBe(false);
    expect(instancias.filter(i => !i.desconectou)).toHaveLength(1);
  });

  it('desconectar fecha o menu aberto e cancela ajuste agendado', () => {
    const { pai, p } = montar();
    espaco(pai, p, 200);
    mais(p)!.click();
    expect(p.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();
    p.remove();
    expect(p.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();
    expect(() => p.reajustar()).not.toThrow();
  });

  it('o foco do teclado sobrevive ao reajuste', () => {
    const { pai, p } = montar();
    espaco(pai, p, 600, false);
    const b = botoes(p)[1];
    b.focus();
    espaco(pai, p, 200);
    expect((p.shadowRoot!.activeElement as HTMLElement).dataset.id).toBe('f1');
  });
});
