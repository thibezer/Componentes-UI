import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-tabela';
import type { UITabela } from './ui-tabela';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const espera = (ms = 30) => new Promise((r) => setTimeout(r, ms));

function simularFetch() {
  const fetchFalso = vi.fn(async () => new Response(JSON.stringify([{ id: 1, a: 'x' }]), { status: 200 }));
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

describe('ui-tabela com src', () => {
  it('busca uma vez ao conectar e não refaz o fetch ao mudar outros atributos', async () => {
    const f = simularFetch();
    const t = document.createElement('ui-tabela') as UITabela;
    t.colunas = [{ id: 'a', rotulo: 'A' }];
    t.setAttribute('src', '/dados.json');
    document.body.appendChild(t);
    await espera();
    expect(f).toHaveBeenCalledTimes(1);

    t.setAttribute('densidade', 'compacta');
    t.setAttribute('aria-label', 'Lotes');
    t.setAttribute('max-height', '200px');
    await espera();
    expect(f).toHaveBeenCalledTimes(1);
    expect(t.dados).toHaveLength(1);
  });

  it('trocar o src conectado busca o novo endpoint uma vez', async () => {
    const f = simularFetch();
    const t = document.createElement('ui-tabela') as UITabela;
    t.setAttribute('src', '/a.json');
    document.body.appendChild(t);
    await espera();
    t.setAttribute('src', '/b.json');
    await espera();
    expect(f).toHaveBeenCalledTimes(2);
    expect((f.mock.calls[1] as unknown[])[0]).toBe('/b.json');
  });
});

describe('ui-tabela: filtro e ordenação valem juntos', () => {
  const dados = [{ id: 1, n: 'cedro' }, { id: 2, n: 'ipê' }, { id: 3, n: 'cerejeira' }, { id: 4, n: 'angico' }];

  function nova(): UITabela {
    const t = document.createElement('ui-tabela') as UITabela;
    t.colunas = [{ id: 'n', rotulo: 'Nome', ordenavel: true }];
    document.body.appendChild(t);
    t.dados = dados;
    return t;
  }
  const nomes = (t: UITabela) =>
    Array.from(t.shadowRoot!.querySelectorAll('tbody tr[data-index] td')).map((td) => td.textContent);

  it('ordenar depois de filtrar mantém o filtro', () => {
    const t = nova();
    t.filtrar('ce');
    t.colunaOrdenada = 'n';
    expect(nomes(t)).toEqual(['cedro', 'cerejeira']);
    t.direcaoOrdenacao = 'desc';
    expect(nomes(t)).toEqual(['cerejeira', 'cedro']);
  });

  it('filtrar depois de ordenar mantém a ordem; trocar os dados mantém o filtro', () => {
    const t = nova();
    t.colunaOrdenada = 'n';
    t.direcaoOrdenacao = 'desc';
    t.filtrar('r');
    expect(nomes(t)).toEqual(['cerejeira', 'cedro']);
    t.dados = [...dados, { id: 5, n: 'peroba' }];
    expect(nomes(t)).toEqual(['peroba', 'cerejeira', 'cedro']);
    t.filtrar('');
    expect(nomes(t)).toHaveLength(5);
  });
});

describe('ui-tabela: o filtro olha as colunas declaradas', () => {
  it('ignora campos fora das colunas e objetos', () => {
    const t = document.createElement('ui-tabela') as UITabela;
    t.colunas = [{ id: 'n', rotulo: 'Nome' }];
    document.body.appendChild(t);
    t.dados = [{ id: 1, n: 'cedro', interno: 'segredo', obj: { a: 1 } }, { id: 2, n: 'ipê', interno: 'cedro' }];
    const vazio = () => (t.shadowRoot!.querySelector('table') as HTMLElement).style.display === 'none';
    t.filtrar('segredo');
    expect(vazio()).toBe(true);
    t.filtrar('object');
    expect(vazio()).toBe(true);
    t.filtrar('cedro');
    expect(t.shadowRoot!.querySelectorAll('tbody tr[data-index]')).toHaveLength(1);
  });
});
