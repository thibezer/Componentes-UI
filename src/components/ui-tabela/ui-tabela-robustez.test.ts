import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-tabela';
import type { UITabela, TabelaColuna } from './ui-tabela';
import { aplicarOrdenacaoTabela } from './tabela-ordenacao';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const espera = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const resposta = (corpo: unknown, init: ResponseInit = { status: 200 }) => new Response(JSON.stringify(corpo), init);

function criar(colunas: TabelaColuna[] = [{ id: 'n', rotulo: 'N', ordenavel: true }], dados: any[] = []): UITabela {
  const t = document.createElement('ui-tabela') as UITabela;
  document.body.appendChild(t);
  t.colunas = colunas;
  t.dados = dados;
  return t;
}
const textos = (t: UITabela) => Array.from(t.shadowRoot!.querySelectorAll('tbody tr[data-index] td')).map((td) => td.textContent);

describe('render defensivo e virtualização', () => {
  it('render que lança não derruba a tabela: a célula fica vazia e as outras linhas aparecem', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = criar([{ id: 'n', rotulo: 'N', render: (v) => { if (v === 'x') throw new Error('boom'); return String(v); } }], [{ id: 1, n: 'a' }, { id: 2, n: 'x' }, { id: 3, n: 'c' }]);
    expect(textos(t)).toEqual(['a', '', 'c']);
  });

  it('exceção num frame de scroll não trava as rolagens seguintes (ticking com finally)', async () => {
    const quadros: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { quadros.push(cb); return quadros.length; });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { quadros.push(cb); return quadros.length; });
    let falhar = false;
    const dados = Array.from({ length: 100 }, (_, i) => ({ id: i, n: `v${i}` }));
    const t = criar([{ id: 'n', rotulo: 'N', render: (v) => { if (falhar) throw new Error('x'); return v; } }], dados);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = t.shadowRoot!.querySelector('.ui-tabela-container')!;
    // render com erro por célula já não lança; força a exceção no próprio renderBody
    const original = t.renderBody.bind(t);
    let lanca = true;
    t.renderBody = () => { if (lanca) { lanca = false; throw new Error('render'); } original(); };
    container.dispatchEvent(new Event('scroll'));
    expect(() => quadros.shift()!(0)).toThrow('render');
    container.dispatchEvent(new Event('scroll'));
    expect(quadros.length).toBe(1); // um novo frame foi agendado: ticking foi liberado
    falhar = false;
  });
});

describe('colunas e dados do consumidor', () => {
  it('colunas congeladas não quebram e não são mutadas', () => {
    const col = Object.freeze({ id: 'n', rotulo: 'N', largura: 100 });
    const t = criar([col as TabelaColuna], [{ id: 1, n: 'a' }]);
    expect(t.colunas[0]).not.toBe(col);
    t.colunas[0].largura = 200; // a cópia interna é mutável
    expect(col.largura).toBe(100);
  });

  it('entradas nulas em dados são ignoradas', () => {
    const t = criar(undefined, [{ id: 1, n: 'a' }, null, undefined, { id: 2, n: 'b' }] as any);
    expect(t.dados).toHaveLength(2);
    expect(textos(t)).toEqual(['a', 'b']);
  });
});

describe('ordenação: tipos, comparador e nulos', () => {
  it('ordena Date, dd/mm/aaaa e booleanos pelo valor', () => {
    const datas = [{ d: new Date(2024, 5, 1) }, { d: new Date(2023, 0, 1) }];
    expect(aplicarOrdenacaoTabela(datas, 'd', 'asc').map((x) => x.d.getFullYear())).toEqual([2023, 2024]);
    const br = [{ d: '10/02/2024' }, { d: '09/03/2023' }];
    expect(aplicarOrdenacaoTabela(br, 'd', 'asc', { id: 'd', rotulo: 'D', tipo: 'data' }).map((x) => x.d)).toEqual(['09/03/2023', '10/02/2024']);
    const bools = [{ b: true }, { b: false }];
    expect(aplicarOrdenacaoTabela(bools, 'b', 'asc').map((x) => x.b)).toEqual([false, true]);
  });

  it('nulos ficam no fim em asc e desc', () => {
    const d = [{ v: null }, { v: 2 }, { v: 1 }];
    expect(aplicarOrdenacaoTabela(d, 'v', 'asc').map((x) => x.v)).toEqual([1, 2, null]);
    expect(aplicarOrdenacaoTabela(d, 'v', 'desc').map((x) => x.v)).toEqual([2, 1, null]);
  });

  it('comparador da coluna tem prioridade e respeita a direção', () => {
    const d = [{ v: 'aaa' }, { v: 'b' }, { v: 'cc' }];
    const col: TabelaColuna = { id: 'v', rotulo: 'V', comparador: (a, b) => a.length - b.length };
    expect(aplicarOrdenacaoTabela(d, 'v', 'asc', col).map((x) => x.v)).toEqual(['b', 'cc', 'aaa']);
    expect(aplicarOrdenacaoTabela(d, 'v', 'desc', col).map((x) => x.v)).toEqual(['aaa', 'cc', 'b']);
  });

  it('é estável para valores iguais', () => {
    const d = [{ k: 'A', i: 1 }, { k: 'a', i: 2 }, { k: 'á', i: 3 }];
    expect(aplicarOrdenacaoTabela(d, 'k', 'asc').map((x) => x.i)).toEqual([1, 2, 3]);
  });
});

describe('filtro', () => {
  it('ignora acentos e caixa; datas e textoFiltro entram na busca; filtra antes de ordenar', () => {
    const t = criar(
      [
        { id: 'n', rotulo: 'N', ordenavel: true },
        { id: 's', rotulo: 'S', render: (v) => (v === 1 ? 'Ativo' : 'Inativo'), textoFiltro: (v) => (v === 1 ? 'Ativo' : 'Inativo') },
        { id: 'd', rotulo: 'D' }
      ],
      [{ id: 1, n: 'Ipê', s: 1, d: new Date(2024, 0, 15) }, { id: 2, n: 'Cedro', s: 0, d: new Date(2023, 2, 1) }]
    );
    t.filtrar('ipe');
    expect(t.shadowRoot!.querySelectorAll('tbody tr[data-index]')).toHaveLength(1);
    t.filtrar('inativo');
    expect(textos(t)[0]).toBe('Cedro');
    t.filtrar('15/01/2024');
    expect(textos(t)[0]).toBe('Ipê');
  });
});

describe('seleção', () => {
  it('registros com id null não ficam todos selecionados', () => {
    const dados = [{ id: null, n: 'a' }, { id: null, n: 'b' }, { id: 3, n: 'c' }];
    const t = criar(undefined, dados);
    t.itemSelecionado = dados[1];
    const marcadas = t.shadowRoot!.querySelectorAll('tbody tr[data-selecionada]');
    expect(marcadas).toHaveLength(1);
    expect(t.indiceSelecionado).toBe(1);
  });

  it('emite ui-selecao-atualizada quando os dados trazem outro objeto do mesmo registro', () => {
    const t = criar(undefined, [{ id: 1, n: 'a' }]);
    t.itemSelecionado = t.dados[0];
    const ouvinte = vi.fn();
    t.addEventListener('ui-selecao-atualizada', ouvinte);
    const novo = { id: 1, n: 'a2' };
    t.dados = [novo];
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(t.itemSelecionado).toBe(novo);
  });
});

describe('clique em controles da célula', () => {
  it('botão dentro de custom element (shadow) não seleciona a linha; célula comum seleciona', () => {
    class HostBtn extends HTMLElement {
      constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = '<button id="b">x</button>'; }
    }
    if (!customElements.get('x-host-btn')) customElements.define('x-host-btn', HostBtn);
    const t = criar([{ id: 'n', rotulo: 'N', render: () => document.createElement('x-host-btn') }, { id: 'm', rotulo: 'M' }], [{ id: 1, n: 'a', m: 'txt' }]);
    const cliques = vi.fn();
    t.addEventListener('ui-linha-clique', cliques);
    const interno = (t.shadowRoot!.querySelector('x-host-btn') as HTMLElement).shadowRoot!.querySelector('button')!;
    interno.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(cliques).not.toHaveBeenCalled();
    (t.shadowRoot!.querySelectorAll('td')[1] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(cliques).toHaveBeenCalledTimes(1);
  });
});

describe('ui-sort cancelável e ordenação remota', () => {
  const dados = [{ id: 1, n: 'b' }, { id: 2, n: 'a' }];
  const clicarCabecalho = (t: UITabela) => (t.shadowRoot!.querySelector('th') as HTMLElement).click();

  it('preventDefault desfaz a ordenação', () => {
    const t = criar(undefined, dados);
    t.addEventListener('ui-sort', (e) => e.preventDefault());
    clicarCabecalho(t);
    expect(t.colunaOrdenada).toBeNull();
    expect(textos(t)).toEqual(['b', 'a']);
  });

  it('ordenacao-remota atualiza o indicador e emite o evento sem reordenar', () => {
    const t = criar(undefined, dados);
    t.ordenacaoRemota = true;
    const ouvinte = vi.fn();
    t.addEventListener('ui-sort', ouvinte);
    clicarCabecalho(t);
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(t.colunaOrdenada).toBe('n');
    expect(textos(t)).toEqual(['b', 'a']);
    expect(t.shadowRoot!.querySelector('th')!.getAttribute('aria-sort')).toBe('ascending');
  });
});

describe('redimensionamento', () => {
  const mouse = (tipo: string, x: number) => new MouseEvent(tipo, { bubbles: true, clientX: x });

  it('clicar na alça sem arrastar não emite ui-column-resize nem trava a ordenação', async () => {
    const t = criar(undefined, [{ id: 1, n: 'a' }]);
    const ouvinte = vi.fn();
    t.addEventListener('ui-column-resize', ouvinte);
    const alca = t.shadowRoot!.querySelector('.ui-tabela__resizer')!;
    alca.dispatchEvent(mouse('mousedown', 10));
    window.dispatchEvent(mouse('mouseup', 10));
    await espera(70);
    expect(ouvinte).not.toHaveBeenCalled();
    const sort = vi.fn();
    t.addEventListener('ui-sort', sort);
    (t.shadowRoot!.querySelector('th') as HTMLElement).click();
    expect(sort).toHaveBeenCalled();
  });

  it('arrastar emite a largura em px', () => {
    const t = criar(undefined, [{ id: 1, n: 'a' }]);
    const ouvinte = vi.fn();
    t.addEventListener('ui-column-resize', ouvinte);
    const alca = t.shadowRoot!.querySelector('.ui-tabela__resizer')!;
    alca.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(ouvinte.mock.calls[0][0].detail.largura).toMatch(/^\d+px$/);
  });

  it('desconectar durante o arraste libera a ordenação', async () => {
    const t = criar(undefined, [{ id: 1, n: 'a' }]);
    const alca = t.shadowRoot!.querySelector('.ui-tabela__resizer')!;
    alca.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    t.remove();
    document.body.appendChild(t);
    const sort = vi.fn();
    t.addEventListener('ui-sort', sort);
    (t.shadowRoot!.querySelector('th') as HTMLElement).click();
    expect(sort).toHaveBeenCalled();
  });
});

describe('modo remoto', () => {
  it('upgrade com src: uma única requisição (mesma URL em voo é reaproveitada)', async () => {
    const f = vi.fn(async () => resposta([{ id: 1, n: 'a' }]));
    vi.stubGlobal('fetch', f);
    const t = document.createElement('ui-tabela') as UITabela;
    t.setAttribute('src', '/a');
    document.body.appendChild(t);
    t.setAttribute('src', '/a'); // mesmo valor: sem requisição extra
    await espera();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('abortar por desconexão libera carregando', async () => {
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_r, rej) => {
      init.signal!.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' })));
    })));
    const t = criar();
    t.carregarDoEndpoint('/lento');
    expect(t.carregando).toBe(true);
    t.remove();
    await espera();
    expect(t.carregando).toBe(false);
  });

  it('fetchOpcoes e fetcher são usados; resolve true em sucesso', async () => {
    const f = vi.fn(async () => resposta({ items: [{ id: 1, n: 'a' }] }));
    const t = criar();
    t.fetcher = f;
    t.fetchOpcoes = { headers: { Authorization: 'Bearer x' }, credentials: 'include' };
    expect(await t.carregarDoEndpoint('/api')).toBe(true);
    const init = (f.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer x');
    expect(init.signal).toBeDefined();
    expect(t.dados).toHaveLength(1);
    expect(t.src).toBe('/api');
  });

  it('erro HTTP traz status e origem; resolve false sem rejeitar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = criar();
    t.fetcher = async () => resposta({}, { status: 401, statusText: 'Unauthorized' });
    const ouvinte = vi.fn();
    t.addEventListener('ui-fetch-erro', ouvinte);
    expect(await t.carregarDoEndpoint('/x')).toBe(false);
    const d = ouvinte.mock.calls[0][0].detail;
    expect(d).toMatchObject({ url: '/x', status: 401, origem: 'http' });
    expect(t.carregando).toBe(false);
  });

  it('erro de render é separado do erro de rede e libera carregando', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = criar();
    t.fetcher = async () => resposta([{ id: 1 }]);
    t.addEventListener('ui-linha-clique', () => {});
    Object.defineProperty(t, 'dados', { set() { throw new Error('render quebrou'); }, get: () => [], configurable: true });
    const ouvinte = vi.fn();
    t.addEventListener('ui-fetch-erro', ouvinte);
    expect(await t.carregarDoEndpoint('/x')).toBe(false);
    expect(ouvinte.mock.calls[0][0].detail.origem).toBe('render');
    expect(t.carregando).toBe(false);
  });

  it('requisição substituída emite ui-fetch-cancelado e só a última entrega dados', async () => {
    const t = criar();
    const esperas: Array<(r: Response) => void> = [];
    t.fetcher = (_u, init) => new Promise((res, rej) => {
      esperas.push(res);
      init.signal!.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' })));
    });
    const cancelado = vi.fn();
    t.addEventListener('ui-fetch-cancelado', cancelado);
    const p1 = t.carregarDoEndpoint('/1');
    const p2 = t.carregarDoEndpoint('/2');
    esperas[1](resposta([{ id: 2, n: 'segunda' }]));
    expect(await p1).toBe(false);
    expect(await p2).toBe(true);
    expect(cancelado).toHaveBeenCalledTimes(1);
    expect(textos(t)).toEqual(['segunda']);
  });

  it('carregarDoEndpoint guarda a URL e recarregar() a reutiliza', async () => {
    const f = vi.fn(async () => resposta([]));
    const t = criar();
    t.fetcher = f;
    await t.carregarDoEndpoint('/b');
    await t.recarregar();
    expect(f.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['/b', '/b']);
  });
});
