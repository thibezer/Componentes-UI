import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import '../src/components/ui-avatar';
import '../src/components/ui-botao';
import '../src/components/ui-campo-texto';
import '../src/components/ui-area-texto';
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
import '../src/components/ui-tabela-propriedades';

import type { UIListaFlutuante } from '../src/components/ui-lista-flutuante';
import type { UISegmented } from '../src/components/ui-segmented';
import type { UITabela } from '../src/components/ui-tabela';
import type { UITabelaPropriedades } from '../src/components/ui-tabela-propriedades';

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
    'ui-area-texto': ['rotulo', 'campo', 'input', 'ajuda', 'contador', 'rodape'],
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
    'ui-tabela-propriedades': ['base', 'cabecalho', 'titulo', 'splitter', 'corpo', 'lista-categorias', 'vazio'],
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

  it('<ui-tabela-propriedades> deve expor parts semânticos de categorias, linhas e editores', () => {
    const painel = document.createElement('ui-tabela-propriedades') as UITabelaPropriedades;
    document.body.appendChild(painel);
    painel.categorias = [
      {
        id: 'dimensoes',
        titulo: 'Dimensões',
        propriedades: [
          { id: 'comprimento', rotulo: 'Comprimento', tipo: 'numero', valor: 50, unidade: 'm' }
        ]
      }
    ];

    const shadow = painel.shadowRoot!;
    expect(shadow.querySelector('[part~="categoria"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="categoria-cabecalho"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="categoria-conteudo"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="linha"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="rotulo"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="valor"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="editor"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="unidade"]')).not.toBeNull();
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

describe('Customização de formato squarecircles', () => {
  const espacamento = fs.readFileSync(path.join(SRC, 'tokens/spacing.css'), 'utf-8');

  it('--ui-raio-squircle deve estar definido no :root de spacing.css', () => {
    expect(espacamento).toMatch(/--ui-raio-squircle:\s*24%/);
  });

  it('classes .squarecircle e .squarecircles devem existir em spacing.css e sobrescrever a escala de raio', () => {
    expect(espacamento).toMatch(/\.squarecircles/);
    expect(espacamento).toMatch(/\.squarecircle/);
    expect(espacamento).toMatch(/--ui-raio-squircle:\s*28%/);
  });

  it('componentes devem aceitar classe e atributo squarecircle sem erros', () => {
    const avatar = document.createElement('ui-avatar');
    avatar.className = 'squarecircle';
    avatar.setAttribute('formato', 'squarecircle');

    const botao = document.createElement('ui-botao');
    botao.className = 'squarecircles';
    botao.setAttribute('formato', 'squarecircle');

    const card = document.createElement('ui-card');
    card.className = 'ui-squarecircles';

    const badge = document.createElement('ui-badge');
    badge.className = 'squarecircle';

    const checkbox = document.createElement('ui-checkbox');
    checkbox.className = 'squarecircle';

    document.body.appendChild(avatar);
    document.body.appendChild(botao);
    document.body.appendChild(card);
    document.body.appendChild(badge);
    document.body.appendChild(checkbox);

    expect(avatar.shadowRoot!.querySelector('.ui-avatar--squarecircle')).not.toBeNull();
    expect(botao.shadowRoot!.querySelector('button')).not.toBeNull();
    expect(card.shadowRoot!.querySelector('.ui-card')).not.toBeNull();
    expect(badge.shadowRoot!.querySelector('.ui-badge')).not.toBeNull();
    expect(checkbox.shadowRoot!.querySelector('.ui-checkbox__box')).not.toBeNull();
  });
});

describe('Suporte a degradê interno, tokens e parts estruturais', () => {
  const cores = fs.readFileSync(path.join(SRC, 'tokens/colors.css'), 'utf-8');
  const gradientes = fs.readFileSync(path.join(SRC, 'tokens/gradients.css'), 'utf-8');
  const tokensIndex = fs.readFileSync(path.join(SRC, 'tokens/index.css'), 'utf-8');

  it('deve declarar todos os tokens --ui-gradiente-* e o módulo gradients.css', () => {
    const tokensEsperados = [
      '--ui-gradiente-superficie',
      '--ui-gradiente-card',
      '--ui-gradiente-elevado',
      '--ui-gradiente-primario',
      '--ui-gradiente-secundario',
      '--ui-gradiente-destaque',
      '--ui-gradiente-destrutivo',
      '--ui-gradiente-sucesso',
      '--ui-gradiente-erro',
      '--ui-gradiente-alerta',
      '--ui-gradiente-info',
      '--ui-gradiente-texto'
    ];
    for (const token of tokensEsperados) {
      expect(cores).toContain(token);
    }
    expect(tokensIndex).toContain('./gradients.css');
    expect(gradientes).toMatch(/\.degrade\b/);
    expect(gradientes).toMatch(/\.ui-degrade\b/);
    expect(gradientes).toMatch(/--ui-fundo-card:\s*var\(--ui-gradiente-card\)/);
    expect(gradientes).toMatch(/--ui-fundo-primario:\s*var\(--ui-gradiente-primario\)/);
  });

  it('estilos CSS de superfícies e controles não devem bloquear gradientes com background-color: var(--ui-*)', () => {
    const arquivosCss = [
      'components/ui-card/ui-card.css',
      'components/ui-botao/ui-botao.css',
      'components/ui-stat/ui-stat.css',
      'components/ui-badge/ui-badge.css',
      'components/ui-avatar/ui-avatar.css',
      'components/ui-alerta/ui-alerta.css',
      'components/ui-modal/ui-modal.css',
      'components/ui-drawer/ui-drawer.css',
      'components/ui-tooltip/ui-tooltip.css',
      'components/ui-campo-texto/ui-campo-texto.css',
      'components/ui-area-texto/ui-area-texto.css',
      'components/ui-lista-flutuante/ui-lista-flutuante.css',
      'components/ui-segmented/ui-segmented.css',
      'components/ui-checkbox/ui-checkbox.css',
      'components/ui-radio/ui-radio.css',
      'components/ui-switch/ui-switch.css',
      'components/ui-tabela/ui-tabela.css',
      'components/ui-camadas/ui-camadas.css',
      'components/ui-tabela-propriedades/ui-tabela-propriedades.css',
      'components/ui-barra-ferramentas/ui-ribbon.css',
      'components/ui-barra-ferramentas/ui-paleta-ferramentas.css',
      'components/ui-barra-ferramentas/ferramentas-comum.css',
      'components/ui-seletor-mapa-base/ui-seletor-mapa-base.css'
    ];

    for (const rel of arquivosCss) {
      const css = fs.readFileSync(path.join(SRC, rel), 'utf-8');
      expect(css, `${rel} ainda usa background-color com token --ui-`).not.toMatch(
        /background-color:\s*var\(--ui-/
      );
    }
  });

  it('componentes antes sem ::part(base) devem expor parts estruturais', async () => {
    await import('../src/components/ui-stat/ui-stat');
    await import('../src/components/ui-skeleton/ui-skeleton');
    await import('../src/components/ui-barra-ferramentas/ui-ribbon');
    await import('../src/components/ui-barra-ferramentas/ui-paleta-ferramentas');
    await import('../src/components/ui-seletor-mapa-base/ui-seletor-mapa-base');
    await import('../src/components/ui-canvas-cad/ui-canvas-cad');
    await import('../src/components/ui-mapa/ui-mapa');

    const avatar = document.createElement('ui-avatar');
    const stat = document.createElement('ui-stat');
    const skeletonTexto = document.createElement('ui-skeleton');
    const skeletonCard = document.createElement('ui-skeleton');
    skeletonCard.setAttribute('variante', 'card');
    const ribbon = document.createElement('ui-ribbon');
    const paleta = document.createElement('ui-paleta-ferramentas');
    const basemap = document.createElement('ui-seletor-mapa-base');
    const canvasCad = document.createElement('ui-canvas-cad');
    const mapa = document.createElement('ui-mapa');

    document.body.append(avatar, stat, skeletonTexto, skeletonCard, ribbon, paleta, basemap, canvasCad, mapa);

    expect(avatar.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
    expect(avatar.shadowRoot!.querySelector('[part="status"]')).not.toBeNull();
    expect(stat.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
    expect(stat.shadowRoot!.querySelector('[part="valor"]')).not.toBeNull();
    expect(skeletonTexto.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
    expect(skeletonCard.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
    expect(ribbon.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
    expect(ribbon.shadowRoot!.querySelector('[part="abas"]')).not.toBeNull();
    expect(paleta.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
    expect(basemap.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
    expect(canvasCad.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
    expect(mapa.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
  });

  it('componentes devem aceitar degrade, gradiente, classe .degrade, presets e rejeitar valores hostis', async () => {
    await import('../src/components/ui-alerta/ui-alerta');
    await import('../src/components/ui-modal/ui-modal');
    await import('../src/components/ui-drawer/ui-drawer');
    await import('../src/components/ui-tooltip/ui-tooltip');
    await import('../src/components/ui-campo-texto/ui-campo-texto');
    await import('../src/components/ui-area-texto/ui-area-texto');
    await import('../src/components/ui-radio/ui-radio');
    await import('../src/components/ui-switch/ui-switch');
    await import('../src/components/ui-texto/ui-texto');
    await import('../src/components/ui-tabela/ui-tabela');
    await import('../src/components/ui-camadas/ui-camadas');
    await import('../src/components/ui-tabela-propriedades/ui-tabela-propriedades');

    const casos: Array<{ tag: string; selector: string }> = [
      { tag: 'ui-card', selector: '.ui-card' },
      { tag: 'ui-botao', selector: '[part="base"]' },
      { tag: 'ui-stat', selector: '.ui-stat' },
      { tag: 'ui-badge', selector: '.ui-badge' },
      { tag: 'ui-avatar', selector: '.ui-avatar' },
      { tag: 'ui-alerta', selector: '.ui-alerta' },
      { tag: 'ui-modal', selector: '.ui-modal__dialog' },
      { tag: 'ui-drawer', selector: '.ui-drawer__painel' },
      { tag: 'ui-tooltip', selector: '.ui-tooltip__bubble' },
      { tag: 'ui-campo-texto', selector: '.ui-campo-texto__wrapper' },
      { tag: 'ui-area-texto', selector: '.ui-area-texto__wrapper' },
      { tag: 'ui-lista-flutuante', selector: '.ui-lista-flutuante__gatilho' },
      { tag: 'ui-segmented', selector: '.ui-segmented' },
      { tag: 'ui-checkbox', selector: '.ui-checkbox' },
      { tag: 'ui-radio', selector: '.ui-radio' },
      { tag: 'ui-switch', selector: '.ui-switch' },
      { tag: 'ui-skeleton', selector: '.ui-skeleton-container' },
      { tag: 'ui-texto', selector: '.ui-texto' },
      { tag: 'ui-ribbon', selector: '.ui-ribbon' },
      { tag: 'ui-paleta-ferramentas', selector: '.ui-paleta' },
      { tag: 'ui-seletor-mapa-base', selector: '.ui-basemap-trigger' },
      { tag: 'ui-tabela', selector: '.ui-tabela-container' },
      { tag: 'ui-camadas', selector: '.ui-camadas-container' },
      { tag: 'ui-tabela-propriedades', selector: '.ui-prop__container' }
    ];

    for (const { tag, selector } of casos) {
      const el = document.createElement(tag);
      document.body.appendChild(el);

      const alvo = () => el.shadowRoot!.querySelector(selector) as HTMLElement;
      expect(alvo(), `${tag} sem alvo ${selector}`).not.toBeNull();
      expect(alvo().getAttribute('data-degrade')).toBeNull();

      // Ativação booleana + alias
      el.setAttribute('degrade', '');
      expect(alvo().getAttribute('data-degrade'), `${tag} degrade=''`).toBe('ativo');
      expect(alvo().style.getPropertyValue('--ui-degrade-interno')).toBe('');

      // Preset semântico
      el.setAttribute('degrade', 'primario');
      expect(alvo().style.getPropertyValue('--ui-degrade-interno')).toBe('var(--ui-gradiente-primario)');

      // Desativação explícita
      el.setAttribute('degrade', 'false');
      expect(alvo().getAttribute('data-degrade')).toBeNull();
      expect(alvo().style.getPropertyValue('--ui-degrade-interno')).toBe('');

      // Gradiente CSS customizado seguro via alias gradiente
      el.removeAttribute('degrade');
      el.setAttribute('gradiente', 'linear-gradient(135deg, #10b981, #06b6d4)');
      expect(alvo().getAttribute('data-degrade')).toBe('ativo');
      expect(alvo().style.getPropertyValue('--ui-degrade-interno')).toBe(
        'linear-gradient(135deg, #10b981, #06b6d4)'
      );

      // Entrada hostil nunca é aplicada no CSS inline
      el.setAttribute('gradiente', 'linear-gradient(red, url(https://evil.com/x.png))');
      expect(alvo().getAttribute('data-degrade')).toBeNull();
      expect(alvo().style.getPropertyValue('--ui-degrade-interno')).toBe('');

      el.removeAttribute('gradiente');
      el.classList.add('degrade');
      // Força reavaliação quando o atributo muda ou via sync inicial em nova montagem
      el.remove();
      document.body.appendChild(el);
      expect(alvo().getAttribute('data-degrade'), `${tag} class="degrade"`).toBe('ativo');
    }
  });
});
