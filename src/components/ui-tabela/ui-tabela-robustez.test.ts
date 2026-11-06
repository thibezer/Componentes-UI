import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-tabela';
import '../ui-checkbox/ui-checkbox';
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

describe('células interativas: foco, valor digitado e cliques em controles', () => {
  const dadosN = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, nome: `n${i}`, ativo: false }));
  const colunaInput: TabelaColuna = {
    id: 'nome',
    rotulo: 'Nome',
    render: (v: string) => { const i = document.createElement('input'); i.value = String(v); return i; }
  };
  const corpo = (t: UITabela) => t.shadowRoot!.querySelector('tbody')!;
  const inputDaLinha = (t: UITabela, indice: number) => corpo(t).querySelector<HTMLInputElement>(`tr[data-index="${indice}"] input`)!;
  const rolar = (t: UITabela, topo: number) => {
    t.shadowRoot!.querySelector<HTMLElement>('.ui-tabela-container')!.scrollTop = topo;
    t.renderBody('rolagem');
  };

  it('rolar a janela virtual mantém o input em edição (mesmo nó, foco e texto digitado)', () => {
    const t = criar([colunaInput], dadosN(200));
    const input = inputDaLinha(t, 3);
    input.focus();
    input.value = 'digitando...';
    rolar(t, 120); // a linha 3 continua dentro da janela
    expect(inputDaLinha(t, 3)).toBe(input);
    expect(input.isConnected).toBe(true);
    expect(t.shadowRoot!.activeElement).toBe(input);
    expect(input.value).toBe('digitando...');
  });

  it('a rolagem incremental produz o mesmo DOM de uma renderização completa', () => {
    const t = criar([{ id: 'nome', rotulo: 'N' }, { id: 'id', rotulo: 'I' }], dadosN(300));
    t.indiceSelecionado = 120;
    // `class=""` sobra do classList.toggle da seleção em linhas que nunca foram selecionadas: não é diferença de estrutura
    const html = () => corpo(t).innerHTML.replace(/ class=""/g, '');
    for (const topo of [0, 300, 900, 2500, 2400, 12000, 0]) {
      rolar(t, topo);
      const incremental = html();
      t.renderBody(); // completa
      expect(incremental).toBe(html());
    }
  });

  it('linhas que saem da janela são removidas e as novas entram em ordem, com espaçadores coerentes', () => {
    const t = criar([colunaInput], dadosN(200));
    rolar(t, 4000);
    const indices = Array.from(corpo(t).querySelectorAll('tr[data-index]')).map((tr) => Number(tr.getAttribute('data-index')));
    expect(indices.length).toBeGreaterThan(0);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(indices[0]).toBeGreaterThan(50);
    expect(corpo(t).querySelectorAll('tr.ui-tabela__virtual-spacer').length).toBe(2);
    expect(corpo(t).querySelector('tr[data-index="3"]')).toBeNull();
  });

  it('trocar `dados` (renderização completa) devolve o foco ao mesmo campo da mesma linha', () => {
    const itens = dadosN(5);
    const t = criar([colunaInput], itens);
    inputDaLinha(t, 2).focus();
    t.dados = [...itens];
    const novo = inputDaLinha(t, 2);
    expect(t.shadowRoot!.activeElement).toBe(novo);
  });

  it('o foco volta ao campo certo mesmo quando a linha mudou de posição (ordenar/filtrar)', () => {
    const itens = [{ id: 1, nome: 'b' }, { id: 2, nome: 'a' }, { id: 3, nome: 'c' }];
    const t = criar([{ ...colunaInput, ordenavel: true }], itens);
    inputDaLinha(t, 0).focus(); // item b
    t.colunaOrdenada = 'nome'; // b passa para o índice 1
    const ativo = t.shadowRoot!.activeElement as HTMLInputElement;
    expect(ativo?.tagName).toBe('INPUT');
    expect(ativo.value).toBe('b');
  });

  it('texto digitado e ainda não gravado no item sobrevive a trocar `dados`, filtrar e ordenar', () => {
    const itens = [{ id: 1, nome: 'b' }, { id: 2, nome: 'a' }, { id: 3, nome: 'c' }];
    const t = criar([{ ...colunaInput, ordenavel: true }], itens);
    const input = inputDaLinha(t, 0);
    input.focus();
    input.value = 'bXYZ';
    input.setSelectionRange(1, 3);
    t.dados = [...itens];
    let ativo = t.shadowRoot!.activeElement as HTMLInputElement;
    expect(ativo.value).toBe('bXYZ');
    expect([ativo.selectionStart, ativo.selectionEnd]).toEqual([1, 3]);
    t.colunaOrdenada = 'nome'; // a linha muda de posição
    ativo = t.shadowRoot!.activeElement as HTMLInputElement;
    expect(ativo.value).toBe('bXYZ');
    t.filtrar('b');
    ativo = t.shadowRoot!.activeElement as HTMLInputElement;
    expect(ativo.value).toBe('bXYZ');
    expect(itens[0].nome).toBe('b'); // a tabela nunca grava nos dados
  });

  it('se o dado mudou por baixo da edição, o dado novo prevalece sobre o texto digitado', () => {
    const itens = [{ id: 1, nome: 'b' }];
    const t = criar([colunaInput], itens);
    const input = inputDaLinha(t, 0);
    input.focus();
    input.value = 'digitado';
    itens[0].nome = 'vindo do servidor';
    t.dados = [...itens];
    expect((t.shadowRoot!.activeElement as HTMLInputElement).value).toBe('vindo do servidor');
  });

  it('checkbox marcado e ainda não gravado sobrevive à renderização completa', () => {
    const itens = [{ id: 1, ativo: false }];
    const t = criar([{ id: 'ativo', rotulo: 'A', render: (v: boolean) => { const c = document.createElement('input'); c.type = 'checkbox'; c.checked = v; return c; } }], itens);
    const caixa = inputDaLinha(t, 0);
    caixa.focus();
    caixa.checked = true;
    t.dados = [...itens];
    const novo = t.shadowRoot!.activeElement as HTMLInputElement;
    expect(novo).not.toBe(caixa);
    expect(novo.checked).toBe(true);
  });

  it('o foco não é roubado se estava fora da tabela', () => {
    const t = criar([colunaInput], dadosN(5));
    const fora = document.createElement('button');
    document.body.appendChild(fora);
    fora.focus();
    t.dados = dadosN(5);
    expect(document.activeElement).toBe(fora);
  });

  it('clicar em ui-checkbox, switch, label ou contenteditable dentro da célula não seleciona a linha', () => {
    const t = criar([
      { id: 'a', rotulo: 'A', render: () => document.createElement('ui-checkbox') },
      { id: 'b', rotulo: 'B', render: () => { const d = document.createElement('div'); d.setAttribute('contenteditable', 'true'); return d; } },
      { id: 'c', rotulo: 'C', render: () => { const l = document.createElement('label'); l.textContent = 'x'; return l; } },
      { id: 'd', rotulo: 'D', render: () => { const s = document.createElement('span'); s.setAttribute('role', 'switch'); return s; } }
    ], dadosN(2));
    const ouvinte = vi.fn();
    t.addEventListener('ui-linha-clique', ouvinte);
    const raiz = t.shadowRoot!;
    (raiz.querySelector('ui-checkbox')!.shadowRoot!.querySelector('[part="base"]') as HTMLElement).click();
    (raiz.querySelector('[contenteditable]') as HTMLElement).click();
    (raiz.querySelector('label') as HTMLElement).click();
    (raiz.querySelector('[role="switch"]') as HTMLElement).click();
    expect(ouvinte).not.toHaveBeenCalled();
    // célula de texto simples continua selecionando a linha
    const t2 = criar([{ id: 'nome', rotulo: 'N' }], dadosN(2));
    const ouvinte2 = vi.fn();
    t2.addEventListener('ui-linha-clique', ouvinte2);
    (t2.shadowRoot!.querySelector('tbody tr td') as HTMLElement).click();
    expect(ouvinte2).toHaveBeenCalledTimes(1);
  });
});

describe('indiceDados no render e região de anúncio', () => {
  it('render recebe como 4º argumento a posição do item em `dados` (estável ao ordenar e filtrar)', () => {
    const vistos: Array<[string, number, number]> = [];
    const itens = [{ id: 1, nome: 'b' }, { id: 2, nome: 'a' }, { id: 3, nome: 'c' }];
    const t = criar([{ id: 'nome', rotulo: 'N', ordenavel: true, render: (v: string, _item: any, idx: number, indiceDados: number) => { vistos.push([v, idx, indiceDados]); return v; } }], itens);
    vistos.length = 0;
    t.colunaOrdenada = 'nome';
    expect(vistos).toEqual([['a', 0, 1], ['b', 1, 0], ['c', 2, 2]]);
    vistos.length = 0;
    t.filtrar('c');
    expect(vistos).toEqual([['c', 0, 2]]);
  });

  it('a região de anúncio do filtro não é reescrita quando o texto não mudou (rolagem com filtro ativo)', () => {
    const t = criar([{ id: 'n', rotulo: 'N' }], Array.from({ length: 100 }, (_, i) => ({ id: i, n: `v${i}` })));
    t.filtrar('v');
    const regiao = t.shadowRoot!.querySelector('.ui-tabela__sr')!;
    const mo = new MutationObserver(() => {});
    mo.observe(regiao, { childList: true, characterData: true, subtree: true });
    t.renderBody('rolagem'); t.renderBody('rolagem'); t.renderBody();
    expect(mo.takeRecords().length).toBe(0);
    t.filtrar('v1'); // texto novo: aí sim escreve
    expect(mo.takeRecords().length).toBeGreaterThan(0);
    mo.disconnect();
  });

  it('mudar aria-label não recria as linhas (nem o campo em edição)', () => {
    const t = criar([{ id: 'nome', rotulo: 'N', render: (v: string) => { const i = document.createElement('input'); i.value = v; return i; } }], [{ id: 1, nome: 'a' }]);
    const input = t.shadowRoot!.querySelector('input')!;
    input.focus();
    t.setAttribute('aria-label', 'Vértices');
    t.setAttribute('texto-erro', 'Falhou');
    t.setAttribute('texto-carregando', 'Aguarde');
    expect(t.shadowRoot!.querySelector('input')).toBe(input);
    expect(t.shadowRoot!.activeElement).toBe(input);
    expect(t.shadowRoot!.querySelector('table')!.getAttribute('aria-label')).toBe('Vértices');
  });
});
