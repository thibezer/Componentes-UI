import { describe, it, expect, vi, beforeEach } from 'vitest';
import './ui-tabela';
import type { UITabela } from './ui-tabela';

const COLUNAS = [
  { id: 'n', rotulo: 'Nome', ordenavel: true },
  { id: 'v', rotulo: 'Valor' }
];

function criar(dados: Record<string, any>[] = [{ id: 1, n: 'a', v: 1 }, { id: 2, n: 'b', v: 2 }]): UITabela {
  const t = document.createElement('ui-tabela') as UITabela;
  t.setAttribute('aria-label', 'Lotes');
  t.colunas = COLUNAS as any;
  document.body.appendChild(t);
  t.dados = dados;
  return t;
}
const raiz = (t: UITabela) => t.shadowRoot!;

describe('ui-tabela: cabeçalho', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('só colunas ordenáveis têm ícone de ordenação', () => {
    const t = criar();
    const ths = raiz(t).querySelectorAll('th');
    expect(ths[0].querySelector('.ui-tabela__sort-icon')).toBeTruthy();
    expect(ths[1].querySelector('.ui-tabela__sort-icon')).toBeNull();
    expect(ths[1].hasAttribute('aria-sort')).toBe(false);
  });

  it('a seta reflete inativa, crescente e decrescente', () => {
    const t = criar();
    const seta = () => raiz(t).querySelector('.ui-tabela__sort-arrow')!;
    expect(seta().classList.contains('ui-tabela__sort-arrow--inativo')).toBe(true);
    (raiz(t).querySelector('.ui-tabela__ordenar') as HTMLElement).click();
    expect(seta().classList.contains('ui-tabela__sort-arrow--asc')).toBe(true);
    (raiz(t).querySelector('.ui-tabela__ordenar') as HTMLElement).click();
    expect(seta().classList.contains('ui-tabela__sort-arrow--desc')).toBe(true);
  });
});

describe('ui-tabela: ARIA da grade', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('expõe total de linhas/colunas, índices e seleção', () => {
    const t = criar();
    const tabela = raiz(t).querySelector('table')!;
    expect(tabela.getAttribute('role')).toBe('grid');
    expect(tabela.getAttribute('aria-rowcount')).toBe('3');
    expect(tabela.getAttribute('aria-colcount')).toBe('2');
    const linhas = raiz(t).querySelectorAll('tbody tr[data-index]');
    expect(linhas[0].getAttribute('aria-rowindex')).toBe('2');
    expect(linhas[1].getAttribute('aria-rowindex')).toBe('3');
    expect(linhas[0].getAttribute('aria-selected')).toBe('false');
    (linhas[1] as HTMLElement).click();
    const depois = raiz(t).querySelectorAll('tbody tr[data-index]');
    expect(depois[1].getAttribute('aria-selected')).toBe('true');
    expect(depois[0].getAttribute('aria-selected')).toBe('false');
  });

  it('contêiner rolável vira região nomeada pelo aria-label do host', () => {
    const t = criar();
    const c = raiz(t).querySelector('.ui-tabela-container')!;
    expect(c.getAttribute('role')).toBe('region');
    expect(c.getAttribute('aria-label')).toBe('Lotes');
  });

  it('espaçadores virtuais ficam ocultos para leitores de tela', () => {
    const t = document.createElement('ui-tabela') as UITabela;
    t.colunas = COLUNAS as any;
    document.body.appendChild(t);
    t.dados = Array.from({ length: 200 }, (_, i) => ({ id: i, n: `n${i}`, v: i }));
    const c = raiz(t).querySelector('.ui-tabela-container') as HTMLElement;
    c.scrollTop = 3000;
    t.renderBody();
    const espacadores = raiz(t).querySelectorAll('tr.ui-tabela__virtual-spacer');
    expect(espacadores.length).toBeGreaterThan(0);
    espacadores.forEach((e) => expect(e.getAttribute('aria-hidden')).toBe('true'));
    expect(raiz(t).querySelector('table')!.getAttribute('aria-rowcount')).toBe('201');
  });
});

describe('ui-tabela: estados', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('vazio mantém o cabeçalho visível; filtro sem resultado usa mensagem própria', () => {
    const t = criar();
    t.setAttribute('texto-vazio', 'Sem dados');
    t.setAttribute('texto-sem-resultados', 'Nada para o filtro');
    const vazio = raiz(t).querySelector('.ui-tabela__empty') as HTMLElement;
    const tabela = raiz(t).querySelector('table') as HTMLElement;
    t.filtrar('zzz');
    expect(vazio.style.display).toBe('flex');
    expect(tabela.style.display).toBe('table');
    expect(raiz(t).querySelectorAll('th').length).toBe(2);
    expect(vazio.querySelector('.ui-tabela__empty-text')!.textContent).toBe('Nada para o filtro');
    expect(raiz(t).querySelector('.ui-tabela__sr')!.textContent).toBe('Nada para o filtro');
    t.filtrar('');
    t.dados = [];
    expect(vazio.querySelector('.ui-tabela__empty-text')!.textContent).toBe('Sem dados');
    expect(vazio.getAttribute('role')).toBe('status');
  });

  it('o overlay de carregamento é uma região de status com texto configurável', () => {
    const t = criar();
    const overlay = raiz(t).querySelector('.ui-tabela__loading')!;
    expect(overlay.getAttribute('role')).toBe('status');
    t.setAttribute('texto-carregando', 'Buscando...');
    expect(overlay.textContent).toContain('Buscando...');
  });

  it('ui-fetch-erro mostra o aviso (role=alert) e "Tentar novamente" recarrega; sucesso o oculta', async () => {
    const t = criar([]);
    const f = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Erro', json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: async () => [{ id: 1, n: 'a', v: 1 }] });
    t.fetcher = f as any;
    t.setAttribute('texto-erro', 'Falha ao buscar');
    t.src = '/api/x';
    await vi.waitFor(() => expect(f).toHaveBeenCalledTimes(1));
    const erro = raiz(t).querySelector('.ui-tabela__erro') as HTMLElement;
    await vi.waitFor(() => expect(erro.style.display).toBe('flex'));
    expect(erro.getAttribute('role')).toBe('alert');
    expect(erro.getAttribute('part')).toBe('erro');
    expect(erro.textContent).toContain('Falha ao buscar');
    (erro.querySelector('.ui-tabela__erro-acao') as HTMLElement).click();
    await vi.waitFor(() => expect(raiz(t).querySelectorAll('tbody tr[data-index]').length).toBe(1));
    expect(f).toHaveBeenCalledTimes(2);
    expect(erro.style.display).toBe('none');
  });
});

describe('ui-tabela: redimensionamento', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('a alça é um separador focável e as setas ajustam a largura (com ui-column-resize)', () => {
    const t = criar();
    const alca = raiz(t).querySelector('.ui-tabela__resizer') as HTMLElement;
    expect(alca.getAttribute('role')).toBe('separator');
    expect(alca.tabIndex).toBe(0);
    const ouvinte = vi.fn();
    t.addEventListener('ui-column-resize', ouvinte);
    alca.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(ouvinte.mock.calls[0][0].detail.largura).toMatch(/^\d+px$/);
    expect(t.colunas[0].largura).toMatch(/px$/);
  });

  it('clicar na alça não ordena a coluna', () => {
    const t = criar();
    const ordenar = vi.fn();
    t.addEventListener('ui-sort', ordenar);
    (raiz(t).querySelector('.ui-tabela__resizer') as HTMLElement).click();
    expect(ordenar).not.toHaveBeenCalled();
  });

  it('toque (pointerdown) inicia o arraste e emite a largura', () => {
    const t = criar();
    const ouvinte = vi.fn();
    t.addEventListener('ui-column-resize', ouvinte);
    const alca = raiz(t).querySelector('.ui-tabela__resizer') as HTMLElement;
    const ev = (tipo: string) => {
      const e = new MouseEvent(tipo, { bubbles: true });
      Object.defineProperty(e, 'pointerType', { value: 'touch' });
      Object.defineProperty(e, 'pointerId', { value: 7 });
      return e;
    };
    alca.dispatchEvent(ev('pointerdown'));
    window.dispatchEvent(ev('pointermove'));
    window.dispatchEvent(ev('pointerup'));
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('Enter na alça abre o diálogo rotulado, valida inline e aplica a largura', () => {
    const t = criar();
    const ouvinte = vi.fn();
    t.addEventListener('ui-column-resize', ouvinte);
    const alca = raiz(t).querySelector('.ui-tabela__resizer') as HTMLElement;
    alca.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const dialogo = raiz(t).querySelector('dialog') as HTMLDialogElement;
    expect(dialogo).toBeTruthy();
    const campo = dialogo.querySelector('input') as HTMLInputElement;
    expect(campo.type).toBe('number');
    expect(dialogo.querySelector(`label[for="${campo.id}"]`)).toBeTruthy();
    campo.value = '5';
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(dialogo.querySelector('.ui-tabela__prompt-erro')!.textContent).not.toBe('');
    expect(ouvinte).not.toHaveBeenCalled();
    campo.value = '150';
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(ouvinte.mock.calls[0][0].detail.largura).toBe('150px');
    expect(raiz(t).querySelector('dialog')).toBeNull();
  });
});
