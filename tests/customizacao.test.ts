import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import '../src/components/ui-botao';
import '../src/components/ui-campo-texto';
import '../src/components/ui-lista-flutuante';
import '../src/components/ui-modal';
import '../src/components/ui-drawer';
import '../src/components/ui-card';
import '../src/components/ui-checkbox';
import '../src/components/ui-radio';
import '../src/components/ui-switch';
import '../src/components/ui-badge';
import '../src/components/ui-alerta';
import '../src/components/ui-tooltip';
import '../src/components/ui-segmented';
import '../src/components/ui-tabela';

import type { UIListaFlutuante } from '../src/components/ui-lista-flutuante';
import type { UISegmented } from '../src/components/ui-segmented';
import type { UITabela } from '../src/components/ui-tabela';

const SRC = path.resolve(__dirname, '../src');

function arquivosCss(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return entrada.name === 'tokens' ? [] : arquivosCss(caminho);
    return entrada.name.endsWith('.css') ? [caminho] : [];
  });
}

describe('Design tokens de fonte e raio', () => {
  const tokensDefinidos = new Set(
    fs.readdirSync(path.join(SRC, 'tokens'))
      .map((arquivo) => fs.readFileSync(path.join(SRC, 'tokens', arquivo), 'utf-8'))
      .flatMap((css) => Array.from(css.matchAll(/(--ui-[a-z0-9-]+)\s*:/g), (m) => m[1]))
  );

  it('todo token de fonte e raio usado pelos componentes deve estar definido em src/tokens', () => {
    const indefinidos = arquivosCss(SRC).flatMap((arquivo) => {
      const css = fs.readFileSync(arquivo, 'utf-8');
      return Array.from(css.matchAll(/var\((--ui-(?:fonte|raio)[a-z0-9-]*)/g), (m) => m[1])
        .filter((token) => !tokensDefinidos.has(token))
        .map((token) => `${path.relative(SRC, arquivo)}: ${token}`);
    });

    expect(indefinidos).toEqual([]);
  });

  it('nenhum componente deve usar nomes alternativos de token ou famílias de fonte fixas', () => {
    const proibidos = /--ui-fonte-(mono|principal|familia)|--ui-radius-|--border-radius-|font-family:\s*(-apple-system|ui-monospace|sans-serif|monospace)/;
    const ocorrencias = arquivosCss(SRC).filter((arquivo) => proibidos.test(fs.readFileSync(arquivo, 'utf-8')));

    expect(ocorrencias.map((arquivo) => path.relative(SRC, arquivo))).toEqual([]);
  });

  it('a escala de raio deve derivar de --ui-raio-borda', () => {
    const espacamento = fs.readFileSync(path.join(SRC, 'tokens/spacing.css'), 'utf-8');
    for (const token of ['--ui-raio-sm', '--ui-raio-lg', '--ui-raio-xl']) {
      expect(espacamento).toMatch(new RegExp(`${token}:\\s*calc\\(var\\(--ui-raio-borda\\)`));
    }
  });
});

describe('Shadow parts (::part) para customização', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const partsEsperados: Record<string, string[]> = {
    'ui-botao': ['base', 'spinner'],
    'ui-campo-texto': ['rotulo', 'campo', 'input', 'icone-esquerda', 'icone-direita', 'ajuda'],
    'ui-lista-flutuante': ['rotulo', 'campo', 'valor', 'seta', 'lista'],
    'ui-modal': ['fundo', 'painel', 'cabecalho', 'titulo', 'fechar', 'corpo', 'rodape'],
    'ui-drawer': ['fundo', 'painel', 'cabecalho', 'titulo', 'descricao', 'fechar', 'corpo', 'rodape'],
    'ui-card': ['base', 'midia', 'cabecalho', 'corpo', 'rodape'],
    'ui-checkbox': ['base', 'controle', 'indicador', 'rotulo'],
    'ui-radio': ['base', 'controle', 'indicador', 'rotulo'],
    'ui-switch': ['base', 'controle', 'indicador', 'rotulo'],
    'ui-badge': ['base', 'rotulo', 'remover'],
    'ui-alerta': ['base', 'icone', 'conteudo', 'titulo', 'mensagem', 'acao', 'fechar', 'progresso'],
    'ui-tooltip': ['balao', 'texto', 'seta'],
    'ui-segmented': ['base', 'indicador'],
    'ui-tabela': ['base', 'tabela', 'vazio', 'carregando'],
  };

  it.each(Object.entries(partsEsperados))('<%s> deve expor os parts documentados', (tag, parts) => {
    const el = document.createElement(tag);
    document.body.appendChild(el);

    const expostos = new Set(
      Array.from(el.shadowRoot!.querySelectorAll('[part]'))
        .flatMap((no) => no.getAttribute('part')!.split(/\s+/))
    );
    for (const part of parts) {
      expect(expostos, `${tag}::part(${part})`).toContain(part);
    }
  });

  it('<ui-lista-flutuante> deve marcar a opção selecionada com o part opcao-selecionada', () => {
    const lista = document.createElement('ui-lista-flutuante') as UIListaFlutuante;
    document.body.appendChild(lista);
    lista.itens = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];

    lista.value = 'b';
    const partsDe = (id: string) => lista.shadowRoot!.querySelector(`[data-id="${id}"]`)!.getAttribute('part');
    expect(partsDe('a')).toBe('opcao');
    expect(partsDe('b')).toBe('opcao opcao-selecionada');

    lista.value = 'a';
    expect(partsDe('a')).toBe('opcao opcao-selecionada');
    expect(partsDe('b')).toBe('opcao');
  });

  it('<ui-segmented> deve marcar a opção ativa com o part opcao-selecionada', () => {
    const seg = document.createElement('ui-segmented') as UISegmented;
    document.body.appendChild(seg);
    seg.opcoes = [{ valor: 'm', rotulo: 'Mapa' }, { valor: 's', rotulo: 'Satélite' }];

    seg.value = 's';
    const partsDe = (valor: string) => seg.shadowRoot!.querySelector(`[data-valor="${valor}"]`)!.getAttribute('part');
    expect(partsDe('s')).toBe('opcao opcao-selecionada');
    expect(partsDe('m')).toBe('opcao');
  });

  it('<ui-tabela> deve expor linhas, células e a linha selecionada', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);
    tabela.colunas = [{ id: 'nome', rotulo: 'Nome' }];
    const dados = [{ id: 1, nome: 'M-01' }, { id: 2, nome: 'M-02' }];
    tabela.dados = dados;

    const raiz = tabela.shadowRoot!;
    expect(raiz.querySelector('th')!.getAttribute('part')).toBe('celula-cabecalho');
    expect(raiz.querySelector('td')!.getAttribute('part')).toBe('celula');

    tabela.itemSelecionado = dados[1];
    const linhas = Array.from(raiz.querySelectorAll('tbody tr'));
    expect(linhas.map((tr) => tr.getAttribute('part'))).toEqual(['linha', 'linha linha-selecionada']);
  });
});
