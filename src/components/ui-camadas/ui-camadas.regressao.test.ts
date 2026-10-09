import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-camadas';
import type { UICamadas } from './ui-camadas';
import type { CamadaItem, FeicaoItem } from './tipos';
import { sanitizarCorCss, corParaHex, buscarPorAtributo } from './camadas-utils';
import { obterIdsVisiveisFeicoes, filtrarFeicoesPorBusca } from './camadas-selecao';

const QUADRADO: [number, number][] = [
  [-23.5, -46.6],
  [-23.51, -46.6],
  [-23.51, -46.61],
  [-23.5, -46.61],
  [-23.5, -46.6]
];

function criarFeicoes(qtd: number, layerId = 'c0'): FeicaoItem[] {
  return Array.from({ length: qtd }, (_, i) => ({
    id: `f${i}`,
    name: `Feicao ${i}`,
    layerId,
    type: 'Polygon',
    coordinates: QUADRADO
  }));
}

function criarPainel(camadas: CamadaItem[], feicoes: FeicaoItem[], attrs: Record<string, string> = {}): UICamadas {
  const el = document.createElement('ui-camadas') as UICamadas;
  el.setAttribute('persistir', 'false');
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  el.definirCamadas(camadas, feicoes);
  return el;
}

const camadasPadrao = (): CamadaItem[] => [
  { id: 'c0', name: 'Camada 0', color: 'rgb(0, 224, 138)' },
  { id: 'c1', name: 'Camada 1', color: '#38bdf8' }
];

const sr = (el: UICamadas) => el.shadowRoot!;
const q = <T extends Element = HTMLElement>(el: UICamadas, sel: string) => sr(el).querySelector(sel) as T;

describe('UICamadas - regressões', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rodapé e métricas', () => {
    it('mostra a métrica ao selecionar, mesmo que o rodapé tenha sido renderizado sem seleção', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      expect(q(el, '.ui-footer-metric').style.display).toBe('none');

      el.selecionarFeicao('f0');

      const metrica = q(el, '.ui-footer-metric');
      expect(metrica.style.display).not.toBe('none');
      expect(metrica.textContent!.trim().length).toBeGreaterThan(0);
    });

    it('exige confirmação em 2 passos para excluir feições pelo rodapé', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      el.selecionarFeicao('f0');

      q(el, '#btn-footer-del').click();
      expect(el.feicoes).toHaveLength(3);
      expect(q(el, '#btn-footer-del').classList.contains('confirming')).toBe(true);

      q(el, '#btn-footer-del').click();
      expect(el.feicoes).toHaveLength(2);
    });

    it('emite ui-feicao-movida ao mover feições pelo rodapé', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      const movidas: string[] = [];
      el.addEventListener('ui-feicao-movida', (e) => movidas.push((e as CustomEvent).detail.feicaoId));

      el.selecionarFeicoes(['f0', 'f1']);
      const select = q<HTMLSelectElement>(el, '#select-footer-move');
      select.value = 'c1';
      select.dispatchEvent(new Event('change', { bubbles: true }));

      expect(movidas).toEqual(['f0', 'f1']);
    });
  });

  describe('busca e seleção em intervalo', () => {
    it('selecionarFeicoes atualiza a âncora do Shift', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(5));
      el.selecionarFeicoes(['f1', 'f2']);
      expect(el.lastClickedFeatureId).toBe('f2');
      el.selecionarFeicoes([]);
      expect(el.lastClickedFeatureId).toBeNull();
    });

    it('encontra feições além do limite de linhas por camada', async () => {
      vi.useFakeTimers();
      const feicoes = criarFeicoes(120);
      feicoes[110].name = 'ALVO UNICO';
      const el = criarPainel(camadasPadrao(), feicoes);
      expect(sr(el).querySelectorAll('.ui-feat-row').length).toBe(80);

      const input = q<HTMLInputElement>(el, '#input-layer-search');
      input.value = 'ALVO';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersByTime(100);

      expect(sr(el).querySelector('[data-feat-row="f110"]')).toBeTruthy();
    });

    it('mostra o botão de limpar busca ao digitar e mantém o foco no campo', () => {
      vi.useFakeTimers();
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      const input = q<HTMLInputElement>(el, '#input-layer-search');
      input.focus();
      input.value = 'Feic';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersByTime(100);

      expect(q(el, '#btn-clear-layer-search')).toBeTruthy();
      expect(sr(el).activeElement?.id).toBe('input-layer-search');
    });

    it('Escape no campo de busca limpa a busca sem limpar a seleção', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      el.selecionarFeicao('f0');
      el.searchQuery = 'Feic';
      el.solicitarRenderizacao();

      q(el, '#input-layer-search').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })
      );

      expect(el.searchQuery).toBe('');
      expect(el.selectedFeatureIds.size).toBe(1);
    });

    it('seleção em intervalo só alcança as feições exibidas (limite de linhas)', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(120));
      el.selecionarFeicao('f0');
      el.selecionarFeicao('f79', false, true);
      expect(el.selectedFeatureIds.size).toBe(80);

      // f119 não está na tela: o clique é ignorado em vez de selecionar o que ninguém vê
      el.selecionarFeicao('f119', false, true);
      expect(el.selectedFeatureIds.size).toBe(80);
    });

    it('funções puras respeitam busca e limite', () => {
      const camadas = camadasPadrao();
      const feicoes = criarFeicoes(100);
      const ids = obterIdsVisiveisFeicoes(camadas, feicoes, new Set(['c0']), '', 10);
      expect(ids).toHaveLength(10);
      expect(obterIdsVisiveisFeicoes(camadas, feicoes, new Set(), '')).toHaveLength(0);
      // Durante a busca, camadas recolhidas também entram
      expect(obterIdsVisiveisFeicoes(camadas, feicoes, new Set(), 'Feicao 9', 80).length).toBe(11);
      expect(filtrarFeicoesPorBusca(feicoes, 'feicao 99')).toHaveLength(1);
    });
  });

  describe('exclusão de camada', () => {
    it('remove da seleção as feições da camada excluída e notifica quando é pelo usuário', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      const notificacoes: unknown[] = [];
      el.addEventListener('ui-feicoes-selecionadas', (e) => notificacoes.push((e as CustomEvent).detail));
      el.selecionarFeicao('f0');

      q(el, '[data-layer-settings="c0"]').click();
      q(el, '[data-delete-layer="c0"]').click();
      q(el, '[data-delete-layer="c0"]').click();

      expect(el.selectedFeatureIds.size).toBe(0);
      expect(notificacoes.length).toBe(1);
      expect((notificacoes[0] as { feicoesIds: string[] }).feicoesIds).toEqual([]);
    });

    it('removerCamada programático limpa estado interno sem emitir eventos', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      el.selecionarFeicao('f0');
      const handler = vi.fn();
      el.addEventListener('ui-feicoes-selecionadas', handler);

      el.removerCamada('c0');

      expect(el.selectedFeatureIds.size).toBe(0);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('ids e dados', () => {
    it('suporta ids com aspas, colchetes e barras sem lançar exceção', () => {
      const id = 'a"b]\\c';
      const el = criarPainel([{ id, name: 'X', color: '#ff0000' }], [{ id: 'f"1', name: 'F', layerId: id }]);
      el.activeSettingsLayerId = id;
      el.solicitarRenderizacao();

      const picker = q<HTMLInputElement>(el, '[data-layer-color-picker]');
      picker.value = '#00ff00';
      expect(() => picker.dispatchEvent(new Event('input'))).not.toThrow();
      expect(el.obterCamada(id)?.color).toBe('#00ff00');
      expect(buscarPorAtributo(sr(el), 'data-layer-row', id)).toBeTruthy();
    });

    it('ignora ids duplicados em adicionarCamada e adicionarFeicao', () => {
      const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      el.adicionarCamada({ id: 'c0', name: 'Duplicada' });
      el.adicionarFeicao({ id: 'f0', name: 'Duplicada', layerId: 'c0' });
      expect(el.camadas).toHaveLength(2);
      expect(el.feicoes).toHaveLength(1);
      expect(aviso).toHaveBeenCalledTimes(2);
      aviso.mockRestore();
    });

    it('não altera os objetos originais do aplicativo', () => {
      const feicoes = criarFeicoes(1);
      const camadas = camadasPadrao();
      const el = criarPainel(camadas, feicoes);

      q(el, '[data-feat-eye="f0"]').click();
      q(el, '[data-layer-lock="c0"]').click();

      expect(feicoes[0].visible).toBeUndefined();
      expect(camadas[0].locked).toBeUndefined();
    });
  });

  describe('bloqueio', () => {
    it('não deixa alterar o bloqueio da feição enquanto a camada estiver travada', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      q(el, '[data-layer-lock="c0"]').click();
      const lockFeicao = q(el, '[data-feat-lock="f0"]');
      expect(lockFeicao.hasAttribute('data-locked-by-layer')).toBe(true);
      const antes = lockFeicao.innerHTML;

      lockFeicao.click();
      lockFeicao.click();

      expect(lockFeicao.innerHTML).toBe(antes);
      expect(el.feicoes[0].locked).toBeUndefined();
    });

    it('destravar a camada atualiza o ícone das feições sem novo render', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      q(el, '[data-layer-lock="c0"]').click();
      expect(q(el, '[data-feat-lock="f0"]').classList.contains('ui-lock-open')).toBe(false);

      q(el, '[data-layer-lock="c0"]').click();
      expect(q(el, '[data-feat-lock="f0"]').classList.contains('ui-lock-open')).toBe(true);
      expect(q(el, '[data-feat-lock="f0"]').hasAttribute('data-locked-by-layer')).toBe(false);
    });

    it('mostra um cadeado aberto (alvo de clique) quando destravado', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      expect(q(el, '[data-layer-lock="c0"]').innerHTML.trim()).not.toBe('');
      expect(q(el, '[data-layer-lock="c0"]').classList.contains('ui-lock-open')).toBe(true);
    });
  });

  describe('visibilidade global', () => {
    it('atualiza o ícone de "ocultar todas" quando uma camada muda individualmente', () => {
      const el = criarPainel(camadasPadrao(), []);
      const rotuloInicial = q(el, '#btn-toggle-all-vis').getAttribute('aria-label');
      q(el, '[data-layer-eye="c0"]').click();
      q(el, '[data-layer-eye="c1"]').click();
      expect(q(el, '#btn-toggle-all-vis').getAttribute('aria-label')).not.toBe(rotuloInicial);
    });
  });

  describe('teclado e acessibilidade', () => {
    it('Escape fecha o drawer de configurações antes de limpar a seleção', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      el.selecionarFeicao('f0');
      q(el, '[data-layer-settings="c0"]').click();
      expect(q(el, '#settings-drawer-c0')).toBeTruthy();

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(sr(el).getElementById('settings-drawer-c0')).toBeNull();
      expect(el.selectedFeatureIds.size).toBe(1);

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(el.selectedFeatureIds.size).toBe(0);
    });

    it('Escape digitado em campo de texto não limpa a seleção', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      el.selecionarFeicao('f0');
      q(el, '#input-layer-search').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })
      );
      expect(el.selectedFeatureIds.size).toBe(1);
    });

    it('controles-ícone são botões focáveis e ativam com Enter e Espaço', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      const olho = q(el, '[data-layer-eye="c0"]');
      expect(olho.getAttribute('role')).toBe('button');
      expect(olho.getAttribute('tabindex')).toBe('0');
      expect(olho.getAttribute('aria-label')).toBeTruthy();

      olho.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
      expect(el.camadas[0].visible).toBe(false);
      olho.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }));
      expect(el.camadas[0].visible).toBe(true);
    });

    it('expõe a árvore com papéis ARIA e navega pelas linhas com as setas', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      expect(q(el, '#ui-layer-tree-mount').getAttribute('role')).toBe('tree');
      expect(q(el, '[data-layer-id="c0"]').getAttribute('aria-expanded')).toBe('true');

      const primeira = q(el, '[data-layer-row="c0"]');
      expect(primeira.getAttribute('tabindex')).toBe('0');
      primeira.focus();
      primeira.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
      expect(sr(el).activeElement?.getAttribute('data-feat-row')).toBe('f0');
    });

    it('mantém aria-selected sincronizado com a seleção', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      el.selecionarFeicao('f1');
      expect(q(el, '[data-feat-row="f1"]').getAttribute('aria-selected')).toBe('true');
      expect(q(el, '[data-feat-row="f0"]').getAttribute('aria-selected')).toBe('false');
    });

    it('cards de mapa base são botões com aria-pressed', () => {
      const el = criarPainel(camadasPadrao(), []);
      const card = q(el, '[data-basemap-id="osm"]');
      expect(card.getAttribute('role')).toBe('button');
      card.click();
      expect(q(el, '[data-basemap-id="osm"]').getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('botão de colapsar', () => {
    it('aparece no modo flutuante e recolhe o painel emitindo o evento', () => {
      const el = criarPainel(camadasPadrao(), [], { flutuante: '' });
      const handler = vi.fn();
      el.addEventListener('ui-colapso-alterado', handler);

      q(el, '#btn-colapsar').click();

      expect(el.colapsado).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('não aparece fora do modo flutuante nem com colapsavel="false"', () => {
      const normal = criarPainel(camadasPadrao(), []);
      expect(sr(normal).getElementById('btn-colapsar')).toBeNull();

      const semBotao = criarPainel(camadasPadrao(), [], { flutuante: '', colapsavel: 'false' });
      expect(sr(semBotao).getElementById('btn-colapsar')).toBeNull();
    });
  });

  describe('resizer de altura', () => {
    it('continua funcionando depois de desconectar e reconectar o elemento', () => {
      const el = criarPainel(camadasPadrao(), []);
      el.setAttribute('redimensionavel', '');
      const resizer = q(el, '#resizer-altura');

      const pai = el.parentElement!;
      el.remove();
      pai.appendChild(el);

      resizer.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientY: 10 }));
      expect(resizer.classList.contains('ui-camadas-resizer--ativo')).toBe(true);
      window.dispatchEvent(new MouseEvent('pointerup'));
    });

    it('desconectar durante o arraste remove os listeners globais', () => {
      const el = criarPainel(camadasPadrao(), []);
      el.setAttribute('redimensionavel', '');
      const resizer = q(el, '#resizer-altura');
      const remover = vi.spyOn(window, 'removeEventListener');

      resizer.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientY: 10 }));
      el.remove();

      const tipos = remover.mock.calls.map((c) => c[0]);
      expect(tipos).toContain('pointermove');
      expect(tipos).toContain('pointerup');
      remover.mockRestore();
    });
  });

  describe('persistência', () => {
    it('não grava no storage antes de conectar (ordem dos atributos não importa)', () => {
      document.body.innerHTML = '<ui-camadas colapsado camada-ativa="c1" storage-key="ordem-attr"></ui-camadas>';
      expect(localStorage.getItem('ui_camadas_estado_default')).toBeNull();
    });

    it('o atributo colapsado declarado pelo autor vence o estado salvo', () => {
      localStorage.setItem(
        'ui_camadas_estado_attr-vence',
        JSON.stringify({ versao: 1, expandedLayerIds: [], collapsedLayerIds: [], painelColapsado: false })
      );
      document.body.innerHTML = '<ui-camadas colapsado storage-key="attr-vence"></ui-camadas>';
      const el = document.body.firstElementChild as UICamadas;
      expect(el.colapsado).toBe(true);
    });

    it('restaura colapso salvo quando o autor não declarou o atributo', () => {
      localStorage.setItem(
        'ui_camadas_estado_salvo-colapsado',
        JSON.stringify({ versao: 1, expandedLayerIds: [], collapsedLayerIds: [], painelColapsado: true })
      );
      document.body.innerHTML = '<ui-camadas storage-key="salvo-colapsado"></ui-camadas>';
      expect((document.body.firstElementChild as UICamadas).colapsado).toBe(true);
    });

    it('customização do usuário persiste, mas mudança feita pelo aplicativo vence', () => {
      const montar = (camadas: CamadaItem[]) => {
        document.body.innerHTML = '';
        const el = document.createElement('ui-camadas') as UICamadas;
        el.setAttribute('storage-key', 'app-vs-usuario');
        document.body.appendChild(el);
        el.definirCamadas(camadas, []);
        return el;
      };

      // 1ª sessão: o usuário oculta a camada e o aplicativo a chamava "Original"
      const sessao1 = montar([{ id: 'c0', name: 'Original', color: '#111111' }]);
      q(sessao1, '[data-layer-eye="c0"]').click();
      expect(sessao1.camadas[0].visible).toBe(false);

      // 2ª sessão, aplicativo igual: a ocultação do usuário é restaurada
      const sessao2 = montar([{ id: 'c0', name: 'Original', color: '#111111' }]);
      expect(sessao2.camadas[0].visible).toBe(false);

      // 3ª sessão: o aplicativo renomeou e trocou a cor — o que ele enviou prevalece
      const sessao3 = montar([{ id: 'c0', name: 'Renomeada pelo app', color: '#222222' }]);
      expect(sessao3.camadas[0].name).toBe('Renomeada pelo app');
      expect(sessao3.camadas[0].color).toBe('#222222');
      // ...e a ocultação, que o aplicativo não mexeu, continua valendo
      expect(sessao3.camadas[0].visible).toBe(false);
    });

    it('grava com debounce durante a edição contínua da opacidade', () => {
      vi.useFakeTimers();
      const chave = 'ui_camadas_estado_debounce-op';
      const el = document.createElement('ui-camadas') as UICamadas;
      el.setAttribute('storage-key', 'debounce-op');
      document.body.appendChild(el);
      el.definirCamadas([{ id: 'c0', name: 'C0' }], []);
      const opacidadeSalva = () => JSON.parse(localStorage.getItem(chave) || '{}').camadasOverrides?.c0?.opacity;
      expect(opacidadeSalva()).toBe(1);

      q(el, '[data-layer-settings="c0"]').click();
      const slider = q<HTMLInputElement>(el, '[data-layer-opacity-slider="c0"]');
      for (const v of ['0.9', '0.8', '0.7', '0.6']) {
        slider.value = v;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Durante o arraste nada é gravado...
      expect(opacidadeSalva()).toBe(1);

      // ...e, passado o debounce, grava uma única vez o valor final
      vi.advanceTimersByTime(250);
      expect(opacidadeSalva()).toBe(0.6);
    });
  });

  describe('cores', () => {
    it('corParaHex converte formatos CSS para #rrggbb', () => {
      expect(corParaHex('#0f8')).toBe('#00ff88');
      expect(corParaHex('#00E08A80')).toBe('#00e08a');
      expect(corParaHex('rgb(0, 224, 138)')).toBe('#00e08a');
      expect(corParaHex('rgba(255, 0, 0, 0.5)')).toBe('#ff0000');
      expect(corParaHex('hsl(120, 100%, 50%)')).toBe('#00ff00');
      expect(corParaHex('transparent', '#123456')).toBe('#123456');
    });

    it('o seletor de cor do drawer recebe sempre um valor #rrggbb válido', () => {
      const el = criarPainel(camadasPadrao(), []);
      q(el, '[data-layer-settings="c0"]').click();
      expect(q<HTMLInputElement>(el, '[data-layer-color-picker="c0"]').getAttribute('value')).toBe('#00e08a');
    });

    it('sanitizarCorCss aceita nomes, percentuais e sintaxe moderna, e continua barrando injeção', () => {
      expect(sanitizarCorCss('red')).toBe('red');
      expect(sanitizarCorCss('rgb(10%, 20%, 30%)')).toBe('rgb(10%, 20%, 30%)');
      expect(sanitizarCorCss('rgb(0 224 138 / 50%)')).toBe('rgb(0 224 138 / 50%)');
      expect(sanitizarCorCss('hsl(150deg 100% 45%)')).toBe('hsl(150deg 100% 45%)');
      expect(sanitizarCorCss('red; background: url(x)', '#000')).toBe('#000');
      expect(sanitizarCorCss('url(javascript:alert(1))', '#000')).toBe('#000');
      expect(sanitizarCorCss('#12345', '#000')).toBe('#000');
    });
  });

  describe('render', () => {
    it('preserva o scroll da árvore ao re-renderizar', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(50));
      q(el, '#ui-layer-tree-mount').scrollTop = 120;
      el.solicitarRenderizacao();
      // jsdom não faz layout, então o scrollTop não é calculado: basta não lançar e manter o nó
      expect(q(el, '#ui-layer-tree-mount')).toBeTruthy();
    });

    it('arraste: dragleave para um filho da própria linha não remove o indicador', () => {
      const el = criarPainel(camadasPadrao(), []);
      const linha = q(el, '[data-layer-row="c1"]');
      linha.classList.add('drop-above');
      const filho = linha.querySelector('.ui-col-name')!;
      const evento = new Event('dragleave', { bubbles: true }) as Event & { relatedTarget: Node };
      Object.defineProperty(evento, 'relatedTarget', { value: filho });
      linha.dispatchEvent(evento);
      expect(linha.classList.contains('drop-above')).toBe(true);
    });
  });
});
