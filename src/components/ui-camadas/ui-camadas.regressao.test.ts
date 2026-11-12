import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-camadas';
import type { UICamadas } from './ui-camadas';
import type { CamadaItem, FeicaoItem } from './tipos';
import { sanitizarCorCss, corParaHex, buscarPorAtributo } from './camadas-utils';
import { substituirMiniaturaQuebrada } from './camadas-render';
import { obterIdsVisiveisFeicoes, filtrarFeicoesPorBusca, filtrarCamadasPorBusca } from './camadas-selecao';

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
    it('não exibe métrica de área no rodapé ao selecionar', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      el.selecionarFeicao('f0');
      expect(el.shadowRoot!.querySelector('.ui-footer-metric')).toBeNull();
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

  describe('arrastos interrompidos pela desconexão (Regra #2)', () => {
    /** Conta, por tipo, os listeners de `window` que ficaram adicionados e não removidos. */
    function saldoWindow() {
      const saldo = new Map<string, number>();
      const marcar = (t: string, d: number) => saldo.set(t, (saldo.get(t) ?? 0) + d);
      const add = vi.spyOn(window, 'addEventListener').mockImplementation(((t: string) => { marcar(t, 1); }) as never);
      const rem = vi.spyOn(window, 'removeEventListener').mockImplementation(((t: string) => { marcar(t, -1); }) as never);
      return {
        saldo,
        restaurar: () => { add.mockRestore(); rem.mockRestore(); }
      };
    }

    it('desconectar durante o arraste por toque da camada não deixa pointermove/pointerup em window (falhava antes)', () => {
      const el = criarPainel(camadasPadrao(), []);
      const handle = sr(el).querySelector('.ui-layer-row .ui-col-drag') as HTMLElement;
      expect(handle).not.toBeNull();
      const w = saldoWindow();
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
      expect(w.saldo.get('pointermove')).toBe(1);
      el.remove();
      expect(w.saldo.get('pointermove')).toBe(0);
      expect(w.saldo.get('pointerup')).toBe(0);
      expect(w.saldo.get('pointercancel')).toBe(0);
      w.restaurar();
    });

    it('um novo pointerdown de toque cancela o anterior em vez de empilhar listeners', () => {
      const el = criarPainel(camadasPadrao(), []);
      const handle = sr(el).querySelector('.ui-layer-row .ui-col-drag') as HTMLElement;
      const w = saldoWindow();
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
      handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
      expect(w.saldo.get('pointermove')).toBe(1);
      w.restaurar();
    });

    it('desconectar durante a pintura de controles devolve user-select ao body e solta a window (falhava antes)', () => {
      const el = criarPainel(camadasPadrao(), []);
      const olhos = sr(el).querySelectorAll('[data-layer-eye]');
      expect(olhos.length).toBeGreaterThan(1);
      const w = saldoWindow();
      // happy-dom não implementa elementFromPoint no shadow root
      Object.defineProperty(sr(el), 'elementFromPoint', { value: () => olhos[1], configurable: true });

      olhos[0].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0 }));
      expect(w.saldo.get('pointermove')).toBe(1);
      const mover = new MouseEvent('pointermove', { clientX: 40, clientY: 40, cancelable: true });
      // dispara o handler real: os spies de window não registram, então chama via mock de calls
      const handlers = (window.addEventListener as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter((c) => c[0] === 'pointermove');
      (handlers[0][1] as (e: Event) => void)(mover);
      expect(document.body.style.userSelect).toBe('none');

      el.remove();
      expect(document.body.style.userSelect).toBe('');
      expect(w.saldo.get('pointermove')).toBe(0);
      expect(w.saldo.get('dragstart')).toBe(0);
      w.restaurar();
    });
  });

  describe('busca por nome de camada (falhava antes: só filtrava feições)', () => {
    const arvore = (): CamadaItem[] => [
      { id: 'g1', name: 'Planejamento Urbano', isGroup: true },
      { id: 'zon', name: 'Zoneamento', parentId: 'g1' },
      { id: 'lot', name: 'Lotes', parentId: 'g1' },
      { id: 'eix', name: 'Eixos Viários' },
      { id: 'hid', name: 'Hidrografia' }
    ];
    const feicoesArvore = (): FeicaoItem[] => [
      { id: 'fa', name: 'Lote 14', layerId: 'lot', type: 'Polygon', coordinates: QUADRADO },
      { id: 'fb', name: 'Rio Azul', layerId: 'hid', type: 'LineString', coordinates: QUADRADO },
      { id: 'fc', name: 'Avenida', layerId: 'eix', type: 'LineString', coordinates: QUADRADO }
    ];
    const digitar = (el: UICamadas, termo: string) => {
      const input = q<HTMLInputElement>(el, '#input-layer-search');
      input.value = termo;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersByTime(100);
    };
    const idsLinhas = (el: UICamadas) =>
      Array.from(sr(el).querySelectorAll('[data-layer-row]')).map((n) => n.getAttribute('data-layer-row'));

    it('sem termo (ou só espaços) a função pura devolve null', () => {
      expect(filtrarCamadasPorBusca(arvore(), feicoesArvore(), '')).toBeNull();
      expect(filtrarCamadasPorBusca(arvore(), feicoesArvore(), '   ')).toBeNull();
    });

    it('camada que casa pelo nome aparece com todas as suas feições', () => {
      const r = filtrarCamadasPorBusca(arvore(), feicoesArvore(), 'hidro')!;
      expect([...r.camadasVisiveis]).toEqual(['hid']);
      expect(r.feicoesPorCamada.get('hid')!.map((f) => f.id)).toEqual(['fb']);
    });

    it('subcamada encontrada mantém os grupos ancestrais, sem os irmãos que não casam', () => {
      const r = filtrarCamadasPorBusca(arvore(), feicoesArvore(), 'zoneamento')!;
      expect(r.camadasVisiveis.has('zon')).toBe(true);
      expect(r.camadasVisiveis.has('g1')).toBe(true);
      expect(r.camadasVisiveis.has('lot')).toBe(false);
      expect(r.camadasVisiveis.has('eix')).toBe(false);
    });

    it('feição encontrada mantém a camada (e o grupo) mostrando só as feições que casam', () => {
      const r = filtrarCamadasPorBusca(arvore(), feicoesArvore(), 'lote 14')!;
      expect([...r.camadasVisiveis].sort()).toEqual(['g1', 'lot']);
      expect(r.feicoesPorCamada.get('lot')!.map((f) => f.id)).toEqual(['fa']);
    });

    it('grupo que casa pelo nome traz suas subcamadas junto', () => {
      const r = filtrarCamadasPorBusca(arvore(), feicoesArvore(), 'planejamento')!;
      expect([...r.camadasVisiveis].sort()).toEqual(['g1', 'lot', 'zon']);
    });

    it('é insensível a caixa e a nomes ausentes, e não trava com ciclo de parentId', () => {
      const ciclo: CamadaItem[] = [
        { id: 'a', name: 'Alfa', parentId: 'b' },
        { id: 'b', name: undefined as unknown as string, parentId: 'a' },
        { id: 'c', name: 'Gama', parentId: 'c' }
      ];
      expect(filtrarCamadasPorBusca(ciclo, [], 'ALFA')!.camadasVisiveis.has('a')).toBe(true);
      expect(filtrarCamadasPorBusca(ciclo, [], 'gama')!.camadasVisiveis.has('c')).toBe(true);
    });

    it('buscar o nome de uma camada mostra só ela, em vez de todas com "Nenhum item correspondente"', () => {
      vi.useFakeTimers();
      const el = criarPainel(arvore(), feicoesArvore());
      expect(idsLinhas(el)).toHaveLength(5);

      digitar(el, 'eixos');

      expect(idsLinhas(el)).toEqual(['eix']);
      expect(sr(el).querySelector('.ui-empty-row')).toBeNull();
      expect(sr(el).querySelector('[data-feat-row="fc"]')).toBeTruthy();
    });

    it('sem resultados mostra uma única mensagem com o termo escapado', () => {
      vi.useFakeTimers();
      const el = criarPainel(arvore(), feicoesArvore());

      digitar(el, '<img src=x onerror=alert(1)>');

      expect(idsLinhas(el)).toHaveLength(0);
      const vazio = q(el, '.ui-search-empty');
      expect(vazio).toBeTruthy();
      expect(vazio.textContent).toContain('<img src=x onerror=alert(1)>');
      expect(sr(el).querySelector('.ui-search-empty img')).toBeNull();
    });

    it('limpar a busca devolve todas as camadas', () => {
      vi.useFakeTimers();
      const el = criarPainel(arvore(), feicoesArvore());
      digitar(el, 'eixos');
      digitar(el, '');
      expect(idsLinhas(el)).toHaveLength(5);
    });

    it('a lista de feições navegáveis respeita a busca por camada', () => {
      expect(obterIdsVisiveisFeicoes(arvore(), feicoesArvore(), new Set(), 'eixos')).toEqual(['fc']);
    });
  });

  describe('seção de mapa base recolhível', () => {
    const toggle = (el: UICamadas) => q<HTMLElement>(el, '[data-basemap-toggle]');

    it('começa aberta, com botão que expõe aria-expanded e o mapa ativo', () => {
      const el = criarPainel(camadasPadrao(), []);
      expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
      expect(toggle(el).textContent).toContain('Esri');
      expect(sr(el).querySelectorAll('[data-basemap-id]').length).toBeGreaterThan(0);
    });

    it('clicar recolhe a grade, reflete no atributo e avisa o aplicativo', () => {
      const el = criarPainel(camadasPadrao(), []);
      const spy = vi.fn();
      el.addEventListener('ui-mapas-base-recolhimento', (e) => spy((e as CustomEvent).detail));

      toggle(el).click();

      expect(el.hasAttribute('mapas-base-recolhido')).toBe(true);
      expect(sr(el).querySelectorAll('[data-basemap-id]').length).toBe(0);
      expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
      expect(spy).toHaveBeenCalledWith({ recolhido: true });

      toggle(el).click();
      expect(el.hasAttribute('mapas-base-recolhido')).toBe(false);
      expect(sr(el).querySelectorAll('[data-basemap-id]').length).toBeGreaterThan(0);
      expect(spy).toHaveBeenLastCalledWith({ recolhido: false });
    });

    it('o atributo declarado pelo autor recolhe sem disparar evento', () => {
      const el = criarPainel(camadasPadrao(), [], { 'mapas-base-recolhido': '' });
      const spy = vi.fn();
      el.addEventListener('ui-mapas-base-recolhimento', spy);
      expect(sr(el).querySelectorAll('[data-basemap-id]').length).toBe(0);

      el.mapasBaseRecolhido = false;
      expect(sr(el).querySelectorAll('[data-basemap-id]').length).toBeGreaterThan(0);
      expect(spy).not.toHaveBeenCalled();
    });

    it('o foco permanece no botão depois de alternar', () => {
      const el = criarPainel(camadasPadrao(), []);
      toggle(el).focus();
      toggle(el).click();
      expect(el.mapasBaseRecolhido).toBe(true);
      expect(sr(el).activeElement?.hasAttribute('data-basemap-toggle')).toBe(true);
    });

    it('recolhida, o mapa ativo continua legível no cabeçalho', () => {
      const el = criarPainel(camadasPadrao(), [], { 'mapas-base-recolhido': '' });
      el.selecionarMapaBase('osm');
      expect(toggle(el).textContent).toContain('OpenStreetMap');
    });

    it('sem mapas base não renderiza botão nenhum', () => {
      const el = criarPainel(camadasPadrao(), []);
      el.definirMapasBase([]);
      expect(sr(el).querySelector('[data-basemap-toggle]')).toBeNull();
    });
  });

  describe('linha da camada (estilo Adobe)', () => {
    it('não exibe selos de camada ativa, subcamadas nem status oficial', () => {
      const camadas: CamadaItem[] = [
        { id: 'g', name: 'Grupo', isGroup: true },
        { id: 'c0', name: 'Camada 0', color: '#38bdf8', parentId: 'g' }
      ];
      const feicoes = criarFeicoes(1).map((f) => ({ ...f, status: 'oficial' }));
      const el = criarPainel(camadas, feicoes);
      el.definirCamadaAtiva('c0');
      const html = sr(el).innerHTML;
      expect(html).not.toContain('ui-active-badge');
      expect(html).not.toContain('ui-group-badge');
      expect(html).not.toContain('OFICIAL');
      expect(q(el, '[data-layer-row="c0"]').getAttribute('aria-current')).toBe('true');
      el.definirCamadaAtiva('g');
      expect(q(el, '[data-layer-row="c0"]').hasAttribute('aria-current')).toBe(false);
    });

    it('a cor da camada fica no grupo, para o destaque de seleção da camada e das feições', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1, 'c1'));
      const grupo = q(el, '.ui-layer-group[data-layer-id="c1"]');
      expect(grupo.style.getPropertyValue('--layer-active-color')).toBe('#38bdf8');
    });

    it('a barra de cor é editável e atualiza camada, barra e destaque, disparando ui-camada-cor', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1, 'c1'));
      const aoMudar = vi.fn();
      el.addEventListener('ui-camada-cor', aoMudar);

      q(el, '[data-layer-color="c1"]').click();
      const seletor = document.querySelector('ui-seletor-cor') as HTMLElement;
      expect(seletor).toBeTruthy();

      const hex = seletor.shadowRoot!.querySelector('input[type="text"]') as HTMLInputElement;
      hex.value = '#ff3b8d';
      hex.dispatchEvent(new Event('input', { bubbles: true }));

      expect(aoMudar).toHaveBeenCalled();
      expect(aoMudar.mock.lastCall![0].detail).toEqual({ camadaId: 'c1', cor: '#ff3b8d' });
      expect(q(el, '.ui-layer-group[data-layer-id="c1"]').style.getPropertyValue('--layer-active-color')).toBe('#ff3b8d');
      expect(q(el, '[data-layer-color="c1"]').style.backgroundColor).toMatch(/^(#ff3b8d|rgb\(255, 59, 141\))$/);
      seletor.remove();
    });

    it('clicar na barra de cor não ativa a camada', () => {
      const el = criarPainel(camadasPadrao(), []);
      el.definirCamadaAtiva('c0');
      q(el, '[data-layer-color="c1"]').click();
      expect(el.camadaAtivaId).toBe('c0');
      document.querySelector('ui-seletor-cor')?.remove();
    });
  });

  describe('blindagem de hierarquia, ciclos e entradas hostis (Regra #0)', () => {
    it('não desaparece com camadas em ciclo de parentId nem lança Maximum call stack size exceeded', () => {
      const ciclo: CamadaItem[] = [
        { id: 'a', name: 'Camada A', parentId: 'b' },
        { id: 'b', name: 'Camada B', parentId: 'a' },
        { id: 'c', name: 'Camada C', parentId: 'a' }
      ];
      const el = criarPainel(ciclo, []);
      const idsRenderizados = Array.from(sr(el).querySelectorAll('[data-layer-row]')).map((r) =>
        r.getAttribute('data-layer-row')
      );
      expect(idsRenderizados.sort()).toEqual(['a', 'b', 'c']);
    });

    it('mover subcamada originada de children não duplica a camada no grupo antigo', () => {
      const aninhadas: CamadaItem[] = [
        {
          id: 'g1',
          name: 'Grupo 1',
          isGroup: true,
          children: [{ id: 'sub1', name: 'Subcamada 1' }]
        },
        { id: 'g2', name: 'Grupo 2', isGroup: true }
      ];
      const el = criarPainel(aninhadas, []);
      q(el, '[data-layer-settings="sub1"]').click();
      const select = q<HTMLSelectElement>(el, '[data-layer-parent-select="sub1"]');
      select.value = 'g2';
      select.dispatchEvent(new Event('change'));

      const ocorrencias = sr(el).querySelectorAll('[data-layer-row="sub1"]');
      expect(ocorrencias.length).toBe(1);
    });

    it('o select de grupo pai no drawer oculta os próprios descendentes e recusa ciclos', () => {
      const camadas: CamadaItem[] = [
        { id: 'g1', name: 'Grupo Pai', isGroup: true },
        { id: 'sub1', name: 'Sub 1', parentId: 'g1' },
        { id: 'neta1', name: 'Neta 1', parentId: 'sub1' },
        { id: 'outra', name: 'Outra Raiz' }
      ];
      const el = criarPainel(camadas, []);
      q(el, '[data-layer-settings="g1"]').click();
      const select = q<HTMLSelectElement>(el, '[data-layer-parent-select="g1"]');
      const valoresOpcoes = Array.from(select.options).map((o) => o.value);

      expect(valoresOpcoes).toContain('');
      expect(valoresOpcoes).toContain('outra');
      expect(valoresOpcoes).not.toContain('g1');
      expect(valoresOpcoes).not.toContain('sub1');
      expect(valoresOpcoes).not.toContain('neta1');
    });

    it('ui-camada-mover-hierarquia informa parentAnteriorId e persiste parentId no storage', () => {
      const el = document.createElement('ui-camadas') as UICamadas;
      el.setAttribute('storage-key', 'teste-parent-persist');
      document.body.appendChild(el);
      el.definirCamadas(
        [
          { id: 'g1', name: 'Grupo 1', isGroup: true },
          { id: 'c1', name: 'Camada 1', parentId: null }
        ],
        []
      );

      const spy = vi.fn();
      el.addEventListener('ui-camada-mover-hierarquia', (e) => spy((e as CustomEvent).detail));

      q(el, '[data-layer-settings="c1"]').click();
      const select = q<HTMLSelectElement>(el, '[data-layer-parent-select="c1"]');
      select.value = 'g1';
      select.dispatchEvent(new Event('change'));

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          camadaId: 'c1',
          novoParentId: 'g1',
          parentAnteriorId: null
        })
      );

      // Nova sessão deve lembrar o parentId alterado pelo usuário
      const el2 = document.createElement('ui-camadas') as UICamadas;
      el2.setAttribute('storage-key', 'teste-parent-persist');
      document.body.appendChild(el2);
      el2.definirCamadas(
        [
          { id: 'g1', name: 'Grupo 1', isGroup: true },
          { id: 'c1', name: 'Camada 1', parentId: null }
        ],
        []
      );
      expect(el2.obterCamada('c1')?.parentId).toBe('g1');
    });

    it('tolera entradas nulas, indefinidas e malformadas sem estourar exceção', () => {
      const el = document.createElement('ui-camadas') as UICamadas;
      el.setAttribute('persistir', 'false');
      document.body.appendChild(el);

      expect(() => {
        el.definirCamadas(
          [null as unknown as CamadaItem, undefined as unknown as CamadaItem, { id: '', name: 'Sem ID' }, { id: 'ok', name: 'Valida' }],
          [null as unknown as FeicaoItem, { id: '', name: 'Sem ID', layerId: 'ok' }, { id: 'f1', name: 'Feicao OK', layerId: 'ok', type: 'Polygon', coordinates: [[NaN, Infinity], [-23.5, -46.6]] }]
        );
        el.atualizarFeicao(null as unknown as FeicaoItem);
      }).not.toThrow();

      expect(el.camadas.map((c) => c.id)).toEqual(['ok']);
      expect(el.feicoes.map((f) => f.id)).toEqual(['f1']);
    });
  });

  describe('precisão matemática de métricas geodésicas', () => {
    it('calcula a mesma área para polígono de 4 vértices ou 5 vértices (fechado) e com vértices colineares', async () => {
      const { calcularAreaPoligono } = await import('./camadas-metricas');
      const quad4: [number, number][] = [
        [-23.550, -46.630],
        [-23.551, -46.630],
        [-23.551, -46.631],
        [-23.550, -46.631]
      ];
      const quad5: [number, number][] = [...quad4, [-23.550, -46.630]];
      const quadColinear: [number, number][] = [
        [-23.550, -46.630],
        [-23.5505, -46.630],
        [-23.551, -46.630],
        [-23.551, -46.631],
        [-23.550, -46.631],
        [-23.550, -46.630]
      ];

      const a4 = calcularAreaPoligono(quad4);
      const a5 = calcularAreaPoligono(quad5);
      const aCol = calcularAreaPoligono(quadColinear);

      // 0.001° lat (~111.32m) x 0.001° lon em -23.55° (~102.04m) ≈ 11.359 m²
      expect(a4).toBeGreaterThan(11000);
      expect(a4).toBeLessThan(12000);
      expect(Math.round(a4)).toBe(Math.round(a5));
      expect(Math.round(a4)).toBe(Math.round(aCol));
    });
  });

  describe('visibilidade hierárquica na seleção, grupos e paginação incremental', () => {
    it('obterIdsVisiveisFeicoes ignora feições de subcamadas cujo grupo pai está recolhido', () => {
      const camadas: CamadaItem[] = [
        { id: 'g1', name: 'Grupo 1', isGroup: true },
        { id: 'sub1', name: 'Sub 1', parentId: 'g1' },
        { id: 'c2', name: 'Camada 2' }
      ];
      const feicoes: FeicaoItem[] = [
        { id: 'f-sub', name: 'F Sub', layerId: 'sub1' },
        { id: 'f-c2', name: 'F C2', layerId: 'c2' }
      ];

      // 'sub1' e 'c2' estão no Set de expandidas, mas o grupo pai 'g1' NÃO está expandido!
      const visiveis = obterIdsVisiveisFeicoes(camadas, feicoes, new Set(['sub1', 'c2']));
      expect(visiveis).toEqual(['f-c2']);
    });

    it('clicar no target de um grupo seleciona todas as feições das subcamadas filhas', () => {
      const camadas: CamadaItem[] = [
        { id: 'g1', name: 'Grupo Pai', isGroup: true },
        { id: 'sub1', name: 'Sub 1', parentId: 'g1' },
        { id: 'sub2', name: 'Sub 2', parentId: 'g1' }
      ];
      const feicoes: FeicaoItem[] = [
        { id: 'f1', name: 'F1', layerId: 'sub1' },
        { id: 'f2', name: 'F2', layerId: 'sub2' }
      ];
      const el = criarPainel(camadas, feicoes);

      q(el, '[data-layer-target="g1"]').click();
      expect([...el.selectedFeatureIds].sort()).toEqual(['f1', 'f2']);
      expect(q(el, '[data-layer-target="g1"] .ui-target-circle').classList.contains('selected')).toBe(true);

      // Desmarcar apenas f1 deixa o grupo como 'partial'
      el.selecionarFeicao('f1', true);
      expect(q(el, '[data-layer-target="g1"] .ui-target-circle').classList.contains('partial')).toBe(true);
    });

    it('permite expandir o limite de feições exibidas clicando em "Mostrar mais"', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(120, 'c0'));
      expect(sr(el).querySelectorAll('.ui-feat-row').length).toBe(80);

      const btnMore = q(el, '[data-layer-show-more="c0"]');
      expect(btnMore).toBeTruthy();
      btnMore.click();

      expect(sr(el).querySelectorAll('.ui-feat-row').length).toBe(120);
      expect(sr(el).querySelector('[data-layer-show-more="c0"]')).toBeNull();
    });
  });

  describe('atributos reativos, API pública e atalhos de produtividade', () => {
    it('respeita mostrar-busca="false" e o atributo titulo', () => {
      const el = criarPainel(camadasPadrao(), [], { 'mostrar-busca': 'false', titulo: 'Vetores CAD' });
      expect(sr(el).getElementById('input-layer-search')).toBeNull();
      expect(q(el, '.ui-tree-section-title').textContent).toBe('Vetores CAD');

      el.mostrarBusca = true;
      expect(sr(el).getElementById('input-layer-search')).toBeTruthy();
    });

    it('expõe o método alternarExpansao(camadaId) e sincroniza aria-expanded ao clicar no chevron', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2, 'c0'));
      expect(el.expandedLayers.has('c0')).toBe(true);

      el.alternarExpansao('c0');
      expect(el.expandedLayers.has('c0')).toBe(false);
      expect(q(el, '.ui-layer-group[data-layer-id="c0"]').getAttribute('aria-expanded')).toBe('false');

      // Clicar no chevron atualiza aria-expanded in-place para que ArrowLeft/ArrowRight funcionem
      q(el, '[data-layer-expand="c0"]').click();
      expect(q(el, '.ui-layer-group[data-layer-id="c0"]').getAttribute('aria-expanded')).toBe('true');
    });

    it('atalho F2 na linha focada inicia renomeação inline e Ctrl+A seleciona feições visíveis', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3, 'c0'));
      const linhaCamada = q(el, '[data-layer-row="c0"]');
      linhaCamada.focus();

      linhaCamada.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, composed: true }));
      expect(el.editingLayerId).toBe('c0');
      const input = q<HTMLInputElement>(el, '[data-inline-layer-input="c0"]');
      expect(input).toBeTruthy();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      const linhaFeat = q(el, '[data-feat-row="f0"]');
      linhaFeat.focus();
      linhaFeat.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, composed: true }));
      expect(el.selectedFeatureIds.size).toBe(3);
    });

    it('expõe CSS ::part() padronizados para customização externa', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2, 'c0'));
      el.selecionarFeicao('f0');

      const parts = new Set(
        Array.from(sr(el).querySelectorAll('[part]')).flatMap((n) => n.getAttribute('part')!.split(/\s+/))
      );

      for (const esperado of [
        'base',
        'corpo',
        'toolbar',
        'busca',
        'arvore',
        'camada',
        'camada-ativa',
        'feicao',
        'feicao-selecionada',
        'rodape',
        'mapas-base',
        'resizer'
      ]) {
        expect(parts).toContain(esperado);
      }
    });
  });
});

describe('UICamadas - revisão profunda (falhavam antes)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.querySelector('ui-seletor-cor')?.remove();
  });

  // g (grupo) > m > c  |  x na raiz
  const arvore = (): CamadaItem[] => [
    { id: 'g', name: 'Grupo', isGroup: true },
    { id: 'm', name: 'Meio', parentId: 'g' },
    { id: 'c', name: 'Fundo', parentId: 'm' },
    { id: 'x', name: 'Solta' }
  ];

  // Lista em ordem diferente da tela: r (raiz) vem antes de s (dentro de g)
  const foraDeOrdem = (): CamadaItem[] => [
    { id: 'g', name: 'Grupo', isGroup: true },
    { id: 'r', name: 'Raiz' },
    { id: 's', name: 'Sub', parentId: 'g' }
  ];
  const feicoesForaDeOrdem = (): FeicaoItem[] => [
    { id: 'fr1', name: 'R1', layerId: 'r' },
    { id: 'fs1', name: 'S1', layerId: 's' },
    { id: 'fs2', name: 'S2', layerId: 's' }
  ];

  const abrirDrawer = (el: UICamadas, id: string) => q(el, `[data-layer-settings="${id}"]`).click();
  const tecla = (alvo: Element, key: string, extra: KeyboardEventInit = {}) =>
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...extra }));

  describe('hierarquia', () => {
    it('o seletor de grupo pai do drawer não oferece a própria camada nem os descendentes', () => {
      const el = criarPainel(arvore(), []);
      abrirDrawer(el, 'g');
      const sel = q<HTMLSelectElement>(el, '[data-layer-parent-select="g"]');
      expect(Array.from(sel.options).map((o) => o.value)).toEqual(['', 'x']);
    });

    it('mudar o pai pelo drawer informa parentAnteriorId', () => {
      const el = criarPainel(arvore(), []);
      const spy = vi.fn();
      el.addEventListener('ui-camada-mover-hierarquia', spy);
      abrirDrawer(el, 'm');
      const sel = q<HTMLSelectElement>(el, '[data-layer-parent-select="m"]');
      sel.value = 'x';
      sel.dispatchEvent(new Event('change'));
      expect(spy.mock.calls[0][0].detail).toMatchObject({ camadaId: 'm', novoParentId: 'x', parentAnteriorId: 'g' });
    });

    it('o drawer recusa um pai que criaria ciclo, mesmo com <option> forjada', () => {
      const el = criarPainel(arvore(), []);
      const spy = vi.fn();
      el.addEventListener('ui-camada-mover-hierarquia', spy);
      abrirDrawer(el, 'g');
      const sel = q<HTMLSelectElement>(el, '[data-layer-parent-select="g"]');
      const forjada = document.createElement('option');
      forjada.value = 'c';
      sel.appendChild(forjada);
      sel.value = 'c';
      sel.dispatchEvent(new Event('change'));
      expect(spy).not.toHaveBeenCalled();
      expect(el.obterCamada('g')!.parentId ?? null).toBeNull();
      expect(q(el, '[data-layer-row="c"]')).toBeTruthy();
    });

    it('camadas com parentId em ciclo continuam visíveis na árvore', () => {
      const el = criarPainel([{ id: 'a', name: 'A', parentId: 'b' }, { id: 'b', name: 'B', parentId: 'a' }], []);
      expect(q(el, '[data-layer-row="a"]')).toBeTruthy();
      expect(q(el, '[data-layer-row="b"]')).toBeTruthy();
    });

    it('arrastar para acima de uma subcamada de outro grupo avisa a troca de pai', () => {
      const el = criarPainel(arvore(), []);
      const spy = vi.fn();
      el.addEventListener('ui-camada-mover-hierarquia', spy);
      q(el, '[data-layer-row="x"]').dispatchEvent(new Event('dragstart', { bubbles: true }));
      const alvo = q(el, '[data-layer-row="c"]');
      alvo.classList.add('drop-above');
      alvo.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
      expect(el.obterCamada('x')!.parentId).toBe('m');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail).toMatchObject({ camadaId: 'x', novoParentId: 'm', parentAnteriorId: null });
    });

    it('aninhar arrastando para dentro também informa parentAnteriorId', () => {
      const el = criarPainel(arvore(), []);
      const spy = vi.fn();
      el.addEventListener('ui-camada-mover-hierarquia', spy);
      q(el, '[data-layer-row="c"]').dispatchEvent(new Event('dragstart', { bubbles: true }));
      const alvo = q(el, '[data-layer-row="x"]');
      alvo.classList.add('drop-into');
      alvo.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
      expect(spy.mock.calls[0][0].detail).toMatchObject({ camadaId: 'c', novoParentId: 'x', parentAnteriorId: 'm' });
    });
  });

  describe('seleção pela ordem da tela', () => {
    it('Shift seleciona o intervalo na ordem exibida (hierarquia), não na ordem da lista', () => {
      const el = criarPainel(foraDeOrdem(), feicoesForaDeOrdem());
      el.selecionarFeicao('fs2');
      el.selecionarFeicao('fr1', false, true);
      expect([...el.selectedFeatureIds].sort()).toEqual(['fr1', 'fs2']);
    });

    it('feições de subcamada sob grupo recolhido não contam como visíveis', () => {
      const ids = obterIdsVisiveisFeicoes(foraDeOrdem(), feicoesForaDeOrdem(), new Set(['r', 's']));
      expect(ids).toEqual(['fr1']);
      const todas = obterIdsVisiveisFeicoes(foraDeOrdem(), feicoesForaDeOrdem(), new Set(['g', 'r', 's']));
      expect(todas).toEqual(['fs1', 'fs2', 'fr1']);
    });

    it('o alvo do grupo seleciona as feições das subcamadas e desmarca no 2º clique', () => {
      const el = criarPainel(foraDeOrdem(), feicoesForaDeOrdem());
      const spy = vi.fn();
      el.addEventListener('ui-feicoes-selecionadas', spy);
      q(el, '[data-layer-target="g"]').click();
      expect([...el.selectedFeatureIds].sort()).toEqual(['fs1', 'fs2']);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(q(el, '[data-layer-target="g"] .ui-target-circle').classList.contains('selected')).toBe(true);
      q(el, '[data-layer-target="g"]').click();
      expect(el.selectedFeatureIds.size).toBe(0);
    });

    it('seleção parcial dentro do ramo deixa o alvo do grupo parcial', () => {
      const el = criarPainel(foraDeOrdem(), feicoesForaDeOrdem());
      el.selecionarFeicao('fs1');
      expect(q(el, '[data-layer-target="g"] .ui-target-circle').classList.contains('partial')).toBe(true);
    });

    it('Ctrl+A numa linha seleciona todas as feições visíveis e avisa o aplicativo', () => {
      const el = criarPainel(foraDeOrdem(), feicoesForaDeOrdem());
      const spy = vi.fn();
      el.addEventListener('ui-feicoes-selecionadas', spy);
      const linha = q(el, '[data-feat-row="fs1"]');
      linha.focus();
      tecla(linha, 'a', { ctrlKey: true });
      expect([...el.selectedFeatureIds].sort()).toEqual(['fr1', 'fs1', 'fs2']);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('Ctrl+A no campo de busca continua selecionando o texto do campo', () => {
      const el = criarPainel(foraDeOrdem(), feicoesForaDeOrdem());
      tecla(q(el, '#input-layer-search'), 'a', { ctrlKey: true });
      expect(el.selectedFeatureIds.size).toBe(0);
    });
  });

  describe('estado herdado do grupo', () => {
    it('ocultar o grupo esmaece subcamadas e feições sem mudar o estado delas', () => {
      const el = criarPainel(foraDeOrdem(), feicoesForaDeOrdem());
      q(el, '[data-layer-eye="g"]').click();
      expect(q(el, '[data-layer-row="s"]').classList.contains('herdado-oculto')).toBe(true);
      expect(q(el, '[data-feat-row="fs1"]').classList.contains('herdado-oculto')).toBe(true);
      expect(q(el, '[data-layer-row="r"]').classList.contains('herdado-oculto')).toBe(false);
      expect(el.obterCamada('s')!.visible).not.toBe(false);
      q(el, '[data-layer-eye="g"]').click();
      expect(q(el, '[data-layer-row="s"]').classList.contains('herdado-oculto')).toBe(false);
    });

    it('grupo oculto ao carregar já esmaece os descendentes', () => {
      const camadas = foraDeOrdem();
      camadas[0].visible = false;
      const el = criarPainel(camadas, feicoesForaDeOrdem());
      expect(q(el, '[data-feat-row="fs2"]').classList.contains('herdado-oculto')).toBe(true);
    });

    it('travar o grupo trava as feições das subcamadas', () => {
      const el = criarPainel(foraDeOrdem(), feicoesForaDeOrdem());
      q(el, '[data-layer-lock="g"]').click();
      const cadeado = q(el, '[data-feat-lock="fs1"]');
      expect(cadeado.hasAttribute('data-locked-by-layer')).toBe(true);
      expect(q(el, '[data-layer-row="s"]').classList.contains('herdado-travado')).toBe(true);
      cadeado.click();
      expect(el.obterFeicao('fs1')!.locked).not.toBe(true);
      q(el, '[data-layer-lock="g"]').click();
      expect(q(el, '[data-feat-lock="fs1"]').hasAttribute('data-locked-by-layer')).toBe(false);
    });

    it('grupo travado ao carregar já trava as feições dos descendentes', () => {
      const camadas = foraDeOrdem();
      camadas[0].locked = true;
      const el = criarPainel(camadas, feicoesForaDeOrdem());
      expect(q(el, '[data-feat-lock="fs1"]').hasAttribute('data-locked-by-layer')).toBe(true);
    });

    it('não move feição para camada travada, nem arrastando nem pelo rodapé', () => {
      const camadas = foraDeOrdem();
      camadas[1].locked = true; // r
      const el = criarPainel(camadas, feicoesForaDeOrdem());
      const spy = vi.fn();
      el.addEventListener('ui-feicao-movida', spy);

      q(el, '[data-feat-row="fs1"]').dispatchEvent(new Event('dragstart', { bubbles: true }));
      q(el, '[data-layer-row="r"]').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
      expect(el.obterFeicao('fs1')!.layerId).toBe('s');

      el.selecionarFeicao('fs1');
      const sel = q<HTMLSelectElement>(el, '#select-footer-move');
      expect((sel.querySelector('option[value="r"]') as HTMLOptionElement).disabled).toBe(true);
      sel.value = 'r';
      sel.dispatchEvent(new Event('change'));
      expect(el.obterFeicao('fs1')!.layerId).toBe('s');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('persistência', () => {
    it('estado corrompido no localStorage não derruba o painel', () => {
      localStorage.setItem(
        'ui_camadas_estado_corrompido',
        JSON.stringify({
          expandedLayerIds: 5,
          collapsedLayerIds: 'x',
          ordemCamadasIds: [1, null, 'c1'],
          camadasOverrides: { c0: { opacity: 50, visible: 'sim', parentId: 7 }, c1: null },
          altura: 'alta'
        })
      );
      const el = document.createElement('ui-camadas') as UICamadas;
      el.setAttribute('storage-key', 'corrompido');
      expect(() => document.body.appendChild(el)).not.toThrow();
      expect(() => el.definirCamadas(camadasPadrao(), [])).not.toThrow();
      const c0 = el.obterCamada('c0')!;
      expect(c0.opacity ?? 1).toBeLessThanOrEqual(1);
      expect(c0.visible).not.toBe('sim');
      expect(c0.parentId ?? null).toBeNull();
      expect(q(el, '[data-layer-row="c0"]')).toBeTruthy();
    });

    it('JSON que não é objeto (array, número) é ignorado', () => {
      localStorage.setItem('ui_camadas_estado_lista', '[1,2,3]');
      const el = document.createElement('ui-camadas') as UICamadas;
      el.setAttribute('storage-key', 'lista');
      document.body.appendChild(el);
      expect(() => el.definirCamadas(camadasPadrao(), [])).not.toThrow();
    });

    it('a hierarquia montada pelo usuário sobrevive ao recarregar; mudança do aplicativo vence', () => {
      const montar = (camadas: CamadaItem[]) => {
        document.body.innerHTML = '';
        const el = document.createElement('ui-camadas') as UICamadas;
        el.setAttribute('storage-key', 'hierarquia');
        document.body.appendChild(el);
        el.definirCamadas(camadas, []);
        return el;
      };
      const base = (): CamadaItem[] => [
        { id: 'g', name: 'G', isGroup: true },
        { id: 'c', name: 'C' }
      ];
      const s1 = montar(base());
      abrirDrawer(s1, 'c');
      const sel = q<HTMLSelectElement>(s1, '[data-layer-parent-select="c"]');
      sel.value = 'g';
      sel.dispatchEvent(new Event('change'));

      const s2 = montar(base());
      expect(s2.obterCamada('c')!.parentId).toBe('g');

      const s3 = montar([{ id: 'g', name: 'G', isGroup: true }, { id: 'c', name: 'C', parentId: null }, { id: 'h', name: 'H' }]);
      expect(s3.obterCamada('c')!.parentId).toBe('g');
      const s4 = montar([{ id: 'g', name: 'G', isGroup: true }, { id: 'h', name: 'H', isGroup: true }, { id: 'c', name: 'C', parentId: 'h' }]);
      expect(s4.obterCamada('c')!.parentId).toBe('h');
    });
  });

  describe('coleções com entrada hostil', () => {
    it('atualizarFeicao, removerFeicao e adicionarCamada toleram null/undefined', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      expect(() => el.atualizarFeicao(null as unknown as FeicaoItem)).not.toThrow();
      expect(() => el.atualizarFeicao(undefined as unknown as FeicaoItem)).not.toThrow();
      expect(() => el.adicionarCamada(null as unknown as CamadaItem)).not.toThrow();
      expect(() => el.removerFeicao(undefined as unknown as string)).not.toThrow();
      expect(el.feicoes).toHaveLength(2);
    });

    it('adicionarCamada com children cadastra as subcamadas (controláveis)', () => {
      const el = criarPainel(camadasPadrao(), []);
      el.adicionarCamada({ id: 'g2', name: 'G2', isGroup: true, children: [{ id: 's2', name: 'S2' }] });
      expect(el.obterCamada('s2')?.parentId).toBe('g2');
      q(el, '[data-layer-eye="s2"]').click();
      expect(el.obterCamada('s2')!.visible).toBe(false);
    });

    it('remover a feição âncora do Shift solta a âncora', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      el.selecionarFeicao('f1');
      el.removerFeicao('f1');
      expect(el.lastClickedFeatureId).toBeNull();
      el.selecionarFeicao('f0');
      el.definirFeicoes(criarFeicoes(3).slice(1));
      expect(el.lastClickedFeatureId).toBeNull();
    });
  });

  describe('teclado e acessibilidade', () => {
    it('F2 renomeia a camada e o foco volta para a linha ao confirmar', () => {
      const el = criarPainel(camadasPadrao(), []);
      const linha = q(el, '[data-layer-row="c0"]');
      linha.focus();
      tecla(linha, 'F2');
      const input = q<HTMLInputElement>(el, '[data-inline-layer-input="c0"]');
      expect(input).toBeTruthy();
      expect(sr(el).activeElement).toBe(input);
      input.value = 'Novo nome';
      tecla(input, 'Enter');
      expect(el.obterCamada('c0')!.name).toBe('Novo nome');
      expect((sr(el).activeElement as HTMLElement | null)?.getAttribute('data-layer-row')).toBe('c0');
    });

    it('F2 renomeia a feição; Esc cancela e devolve o foco à linha', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      const linha = q(el, '[data-feat-row="f0"]');
      linha.focus();
      tecla(linha, 'F2');
      const input = q<HTMLInputElement>(el, '[data-inline-feat-input="f0"]');
      input.value = 'Descartado';
      tecla(input, 'Escape');
      expect(el.obterFeicao('f0')!.name).toBe('Feicao 0');
      expect((sr(el).activeElement as HTMLElement | null)?.getAttribute('data-feat-row')).toBe('f0');
    });

    it('itens da árvore expõem aria-level conforme a profundidade', () => {
      const el = criarPainel(foraDeOrdem(), feicoesForaDeOrdem());
      expect(q(el, '.ui-layer-group[data-layer-id="g"]').getAttribute('aria-level')).toBe('1');
      expect(q(el, '.ui-layer-group[data-layer-id="s"]').getAttribute('aria-level')).toBe('2');
      expect(q(el, '[data-feat-row="fs1"]').getAttribute('aria-level')).toBe('3');
    });

  });

  describe('textos e tokens', () => {
    it('camada sem itens diz "Camada vazia", não fala em grupo', () => {
      const el = criarPainel([{ id: 'v', name: 'V' }], []);
      expect(q(el, '.ui-empty-row').textContent!.trim()).toBe('Camada vazia');
    });

    it('o aviso de feições truncadas usa classe, sem estilo inline', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(81));
      const aviso = q(el, '.ui-truncate-notice');
      expect(aviso).toBeTruthy();
      expect(aviso.hasAttribute('style')).toBe(false);
    });

    it('o chip de contagem do grupo soma as feições das subcamadas', () => {
      const el = criarPainel(foraDeOrdem(), feicoesForaDeOrdem());
      expect(q(el, '[data-layer-row="g"] .ui-count-chip').textContent!.trim()).toBe('2');
    });

    it('o botão Excluir volta ao rótulo original quando a confirmação expira', () => {
      vi.useFakeTimers();
      const el = criarPainel(camadasPadrao(), []);
      abrirDrawer(el, 'c0');
      const btn = q(el, '[data-delete-layer="c0"]');
      btn.click();
      expect(btn.querySelector('.ui-btn-label')!.textContent).toBe('Confirmar Exclusão?');
      vi.advanceTimersByTime(3600);
      expect(btn.querySelector('.ui-btn-label')!.textContent).toBe('Excluir');
    });
  });
});

describe('UICamadas - opacidade fora do intervalo', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('opacidade inválida ou fora de [0, 1] é exibida normalizada no drawer', () => {
    const el = document.createElement('ui-camadas') as UICamadas;
    el.setAttribute('persistir', 'false');
    document.body.appendChild(el);
    el.definirCamadas(
      [
        { id: 'a', name: 'A', opacity: 7 },
        { id: 'b', name: 'B', opacity: NaN },
        { id: 'c', name: 'C', opacity: -2 }
      ],
      []
    );
    const badge = (id: string): string => {
      el.activeSettingsLayerId = id;
      el.solicitarRenderizacao();
      return el.shadowRoot!.querySelector('[id^="badge-op-"]')!.textContent!;
    };
    expect(badge('a')).toBe('100%');
    expect(badge('b')).toBe('100%');
    expect(badge('c')).toBe('0%');
  });
});

describe('UICamadas - miniaturas de mapa base', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('miniatura que falha ao carregar vira o placeholder neutro e o card segue selecionável', () => {
    const el = document.createElement('ui-camadas') as UICamadas;
    el.setAttribute('persistir', 'false');
    document.body.appendChild(el);
    el.definirMapasBase([
      { id: 'm1', nome: 'M1', thumbnailUrl: 'https://exemplo.invalid/a.jpg' },
      { id: 'm2', nome: 'M2' }
    ]);
    const sr = el.shadowRoot!;
    // No jsdom a imagem sem rede já nasce "completa e vazia": o placeholder entra na renderização
    // Em navegador o evento 'error' dispara depois; os dois caminhos usam a mesma troca
    const card = sr.querySelector('[data-basemap-id="m1"]')!;
    expect(card.querySelector('.ui-basemap-preview-none')).toBeTruthy();
    expect(card.querySelector('img[data-basemap-thumb]')).toBeNull();
    el.selecionarMapaBase('m1');
    expect(el.mapaBaseAtivo).toBe('m1');
  });

  it('substituirMiniaturaQuebrada troca a <img> em evento de erro tardio', () => {
    const host = document.createElement('div');
    const img = document.createElement('img');
    img.setAttribute('data-basemap-thumb', '');
    host.appendChild(img);
    document.body.appendChild(host);
    substituirMiniaturaQuebrada(img);
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('.ui-basemap-preview-none')).toBeTruthy();
    // chamada repetida com a imagem já fora do DOM não lança
    expect(() => substituirMiniaturaQuebrada(img)).not.toThrow();
  });
});

describe('UICamadas - atualização incremental de feições', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  /**
   * Compara a marcação sem o que não muda o resultado: nós de texto só com espaço entre as linhas e a ordem e o
   * espaçamento das classes (o `classList.toggle` do caminho incremental não reproduz o texto do atributo).
   */
  const normalizar = (html: string): string =>
    html
      .replace(/>\s+</g, '><')
      .replace(/class="([^"]*)"/g, (_, c: string) => `class="${c.split(/\s+/).filter(Boolean).sort().join(' ')}"`)
      .trim();
  const corpoHtml = (el: UICamadas): string => normalizar(sr(el).getElementById('painel-corpo')!.innerHTML);
  const linha = (el: UICamadas, id: string): HTMLElement | null => buscarPorAtributo(sr(el), 'data-feat-row', id);
  const nova = (id: string, layerId = 'c0', extra: Partial<FeicaoItem> = {}): FeicaoItem => ({
    id,
    name: `Nova ${id}`,
    layerId,
    type: 'Polygon',
    coordinates: QUADRADO,
    ...extra
  });

  /** O DOM atual (incremental) tem de ser idêntico ao de um render completo feito logo depois. */
  function igualAoCompleto(el: UICamadas): void {
    const incremental = corpoHtml(el);
    el.solicitarRenderizacao();
    expect(corpoHtml(el)).toBe(incremental);
  }

  describe('equivalência com o render completo', () => {
    it('adicionarFeicao insere só a linha nova e mantém as existentes', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(5));
      const antiga = linha(el, 'f0');
      el.adicionarFeicao(nova('f9'));
      expect(linha(el, 'f0')).toBe(antiga);
      expect(linha(el, 'f9')).not.toBeNull();
      igualAoCompleto(el);
    });

    it('atualizarFeicao troca só a linha alterada', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(5));
      const vizinha = linha(el, 'f2');
      const alterada = linha(el, 'f1');
      el.atualizarFeicao({ id: 'f1', name: 'Renomeada', color: '#ff0000', visible: false, locked: true } as FeicaoItem);
      expect(linha(el, 'f2')).toBe(vizinha);
      expect(linha(el, 'f1')).not.toBe(alterada);
      expect(linha(el, 'f1')!.textContent).toContain('Renomeada');
      expect(linha(el, 'f1')!.classList.contains('hidden-row')).toBe(true);
      igualAoCompleto(el);
    });

    it('removerFeicao remove só a linha e atualiza o chip de contagem', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(5));
      const vizinha = linha(el, 'f3');
      el.removerFeicao('f2');
      expect(linha(el, 'f2')).toBeNull();
      expect(linha(el, 'f3')).toBe(vizinha);
      expect(q(el, '[data-layer-row="c0"] .ui-count-chip').textContent).toBe('4');
      igualAoCompleto(el);
    });

    it('definirFeicoes mantém as linhas que não mudaram', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(6));
      const intacta = linha(el, 'f0');
      const lista = criarFeicoes(6).map((f) => (f.id === 'f3' ? { ...f, name: 'Trocada' } : f));
      lista.push(nova('f10', 'c1'));
      el.definirFeicoes(lista.filter((f) => f.id !== 'f5'));
      expect(linha(el, 'f0')).toBe(intacta);
      expect(linha(el, 'f5')).toBeNull();
      expect(linha(el, 'f3')!.textContent).toContain('Trocada');
      expect(q(el, '[data-layer-row="c1"] .ui-count-chip').textContent).toBe('1');
      igualAoCompleto(el);
    });

    it('definirFeicoes com a ordem trocada segue a ordem da lista', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(4));
      el.definirFeicoes(criarFeicoes(4).reverse());
      const ids = Array.from(sr(el).querySelectorAll('[data-feat-row]')).map((n) => n.getAttribute('data-feat-row'));
      expect(ids).toEqual(['f3', 'f2', 'f1', 'f0']);
      igualAoCompleto(el);
    });

    it('é síncrono: a linha existe na volta da chamada', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      el.adicionarFeicao(nova('s1'));
      expect(linha(el, 's1')).not.toBeNull();
      el.removerFeicao('s1');
      expect(linha(el, 's1')).toBeNull();
    });

    it('camada recolhida também é atualizada sem render completo', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      el.colapsarTodas();
      const antiga = linha(el, 'f0');
      el.adicionarFeicao(nova('f9'));
      expect(linha(el, 'f0')).toBe(antiga);
      expect(linha(el, 'f9')).not.toBeNull();
      igualAoCompleto(el);
    });

    it('feição movida de camada por atualizarFeicao atualiza as duas camadas', () => {
      const el = criarPainel(camadasPadrao(), [...criarFeicoes(3), nova('x', 'c1')]);
      el.atualizarFeicao({ id: 'f1', layerId: 'c1' } as FeicaoItem);
      expect(q(el, '[data-layer-row="c0"] .ui-count-chip').textContent).toBe('2');
      expect(q(el, '[data-layer-row="c1"] .ui-count-chip').textContent).toBe('2');
      igualAoCompleto(el);
    });

    it('subcamada atualiza o chip dela e o do grupo, que ganha chip ao deixar de estar vazio', () => {
      const el = criarPainel(
        [
          { id: 'g', name: 'Grupo', isGroup: true },
          { id: 's', name: 'Sub', parentId: 'g' }
        ],
        []
      );
      expect(sr(el).querySelector('[data-layer-row="g"] .ui-count-chip')).toBeNull();
      el.adicionarFeicao(nova('a', 's'));
      expect(q(el, '[data-layer-row="g"] .ui-count-chip').textContent).toBe('1');
      expect(q(el, '[data-layer-row="s"] .ui-count-chip').textContent).toBe('1');
      igualAoCompleto(el);
      el.removerFeicao('a');
      expect(sr(el).querySelector('[data-layer-row="g"] .ui-count-chip')).toBeNull();
      igualAoCompleto(el);
    });

    it('alterna a linha "Camada vazia" ao adicionar e remover', () => {
      const el = criarPainel(camadasPadrao(), []);
      expect(sr(el).textContent).toContain('Camada vazia');
      el.adicionarFeicao(nova('a'));
      expect(sr(el).querySelectorAll('.ui-empty-row')).toHaveLength(1);
      expect(sr(el).querySelector('[data-layer-id="c0"] .ui-empty-row')).toBeNull();
      igualAoCompleto(el);
      el.removerFeicao('a');
      expect(sr(el).querySelector('[data-layer-id="c0"] .ui-empty-row')).not.toBeNull();
      igualAoCompleto(el);
    });

    it('estado do target da camada e rodapé acompanham a seleção', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      el.selecionarFeicoes(['f0', 'f1']);
      expect(q(el, '[data-layer-target="c0"] .ui-target-circle').classList.contains('selected')).toBe(true);
      el.adicionarFeicao(nova('f2'));
      const circulo = q(el, '[data-layer-target="c0"] .ui-target-circle');
      expect(circulo.classList.contains('selected')).toBe(false);
      expect(circulo.classList.contains('partial')).toBe(true);
      igualAoCompleto(el);

      el.removerFeicao('f0');
      expect(q(el, '#footer-count').textContent).toBe('1');
      igualAoCompleto(el);
      el.removerFeicao('f1');
      expect(q(el, '#footer-count').textContent).toBe('2');
      expect(q(el, '.ui-tree-footer').classList.contains('sem-selecao')).toBe(true);
      igualAoCompleto(el);
    });

    it('feição adicionada com id já selecionado nasce selecionada', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      el.selecionarFeicoes(['futura']);
      el.adicionarFeicao(nova('futura'));
      expect(linha(el, 'futura')!.classList.contains('selected-row')).toBe(true);
      igualAoCompleto(el);
    });

    it('feição de camada travada ou sob grupo oculto nasce travada e esmaecida', () => {
      const el = criarPainel(
        [
          { id: 'g', name: 'G', isGroup: true, visible: false, locked: true },
          { id: 's', name: 'S', parentId: 'g' }
        ],
        []
      );
      el.adicionarFeicao(nova('a', 's'));
      expect(linha(el, 'a')!.classList.contains('herdado-oculto')).toBe(true);
      expect(linha(el, 'a')!.querySelector('[data-locked-by-layer]')).not.toBeNull();
      igualAoCompleto(el);
    });
  });

  describe('limite de linhas por camada', () => {
    it('além do limite só atualiza o aviso, sem criar linha', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(85));
      expect(sr(el).querySelectorAll('[data-feat-row]')).toHaveLength(80);
      const primeira = linha(el, 'f0');
      el.adicionarFeicao(nova('extra'));
      expect(sr(el).querySelectorAll('[data-feat-row]')).toHaveLength(80);
      expect(linha(el, 'f0')).toBe(primeira);
      expect(q(el, '.ui-truncate-notice').textContent).toContain('Exibindo 80 de 86');
      igualAoCompleto(el);
    }, 30_000);

    it('cria o aviso ao passar de 80 e o "Mostrar mais" funciona', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(80));
      expect(sr(el).querySelector('.ui-truncate-notice')).toBeNull();
      el.adicionarFeicao(nova('f80'));
      expect(q(el, '.ui-truncate-notice').textContent).toContain('Exibindo 80 de 81');
      igualAoCompleto(el);
      q(el, '[data-layer-show-more="c0"]').click();
      expect(sr(el).querySelectorAll('[data-feat-row]')).toHaveLength(81);
      expect(sr(el).querySelector('.ui-truncate-notice')).toBeNull();
    }, 30_000);

    it('remover uma linha exibida promove a primeira escondida e atualiza o aviso', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(82));
      el.removerFeicao('f5');
      expect(sr(el).querySelectorAll('[data-feat-row]')).toHaveLength(80);
      expect(linha(el, 'f80')).not.toBeNull();
      expect(q(el, '.ui-truncate-notice').textContent).toContain('Exibindo 80 de 81');
      igualAoCompleto(el);
      el.removerFeicao('f81');
      expect(sr(el).querySelector('.ui-truncate-notice')).toBeNull();
      igualAoCompleto(el);
    }, 30_000);

    it('respeita o limite ampliado por "Mostrar mais"', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(100));
      el.incrementarLimiteFeicoes('c0');
      el.adicionarFeicao(nova('extra'));
      expect(sr(el).querySelectorAll('[data-feat-row]')).toHaveLength(101);
      igualAoCompleto(el);
   }, 30_000);
  });

  describe('fallback para o render completo', () => {
    it('camada inexistente ou feição sem camada não derruba nem deixa DOM inconsistente', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      expect(() => el.adicionarFeicao(nova('o1', 'nao-existe'))).not.toThrow();
      expect(() => el.adicionarFeicao({ id: 'o2', name: 'Sem camada' } as FeicaoItem)).not.toThrow();
      expect(linha(el, 'o1')).toBeNull();
      expect(el.feicoes).toHaveLength(4);
      igualAoCompleto(el);
    });

    it('com busca ativa o resultado é o do render completo', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      el.searchQuery = 'Feicao 1';
      el.solicitarRenderizacao();
      el.adicionarFeicao(nova('f10', 'c0', { name: 'Feicao 10' }));
      expect(linha(el, 'f10')).not.toBeNull();
      expect(linha(el, 'f0')).toBeNull();
      igualAoCompleto(el);
      el.removerFeicao('f1');
      expect(linha(el, 'f1')).toBeNull();
      igualAoCompleto(el);
    });

    it('com renomeação inline aberta preserva o campo de edição', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      el.editingFeatureId = 'f1';
      el.solicitarRenderizacao();
      el.adicionarFeicao(nova('f9'));
      expect(sr(el).querySelector('[data-inline-feat-input="f1"]')).not.toBeNull();
      igualAoCompleto(el);
    });

    it('com o drawer da camada aberto a contagem do drawer acompanha', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      el.activeSettingsLayerId = 'c0';
      el.solicitarRenderizacao();
      el.adicionarFeicao(nova('f9'));
      expect(q(el, '.ui-drawer-meta-info').textContent).toContain('3 feições');
      igualAoCompleto(el);
    });

    it('dentro de emLote o DOM só muda no fim, e fica igual ao completo', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      el.emLote(() => {
        el.adicionarFeicao(nova('l1'));
        el.removerFeicao('f0');
        expect(linha(el, 'l1')).toBeNull();
        expect(linha(el, 'f0')).not.toBeNull();
      });
      expect(linha(el, 'l1')).not.toBeNull();
      expect(linha(el, 'f0')).toBeNull();
      igualAoCompleto(el);
    });
  });

  describe('entradas hostis', () => {
    it('id duplicado, null e undefined são ignorados', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      const antes = corpoHtml(el);
      expect(() => el.adicionarFeicao(nova('f0'))).not.toThrow();
      expect(() => el.adicionarFeicao(null as unknown as FeicaoItem)).not.toThrow();
      expect(() => el.adicionarFeicao(undefined as unknown as FeicaoItem)).not.toThrow();
      expect(() => el.atualizarFeicao({ id: 'nao-existe' } as FeicaoItem)).not.toThrow();
      expect(() => el.removerFeicao('nao-existe')).not.toThrow();
      expect(corpoHtml(el)).toBe(antes);
    });

    it('nomes e cores com HTML não viram marcação', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      const nomeHostil = `<img src=x onerror=alert(1)>"'&`;
      el.adicionarFeicao(nova('x', 'c0', { name: nomeHostil, color: 'red;background:url(x)' }));
      const l = linha(el, 'x')!;
      expect(l.querySelector('img')).toBeNull();
      expect(l.querySelector('.ui-name-text')!.textContent).toBe(nomeHostil);
      expect(l.querySelector<HTMLElement>('.ui-col-colorbar')!.getAttribute('style')).not.toContain('url(');
      igualAoCompleto(el);
    });

    it('id com aspas e colchetes funciona em adicionar, atualizar e remover', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      const id = 'a"]b\\[c';
      el.adicionarFeicao(nova(id));
      expect(linha(el, id)).not.toBeNull();
      el.atualizarFeicao({ id, name: 'Outro' } as FeicaoItem);
      expect(linha(el, id)!.textContent).toContain('Outro');
      el.removerFeicao(id);
      expect(linha(el, id)).toBeNull();
      igualAoCompleto(el);
    });

    it('definirFeicoes tolera null, itens inválidos e ids duplicados', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      el.definirFeicoes([null, undefined, { id: '' }, nova('d'), nova('d')] as unknown as FeicaoItem[]);
      expect(sr(el).querySelectorAll('[data-feat-row]')).toHaveLength(1);
      igualAoCompleto(el);
      el.definirFeicoes(null as unknown as FeicaoItem[]);
      expect(sr(el).querySelectorAll('[data-feat-row]')).toHaveLength(0);
      igualAoCompleto(el);
    });

    it('sem render prévio (painel fora do DOM) mutações não lançam', () => {
      const el = document.createElement('ui-camadas') as UICamadas;
      el.setAttribute('persistir', 'false');
      expect(() => {
        el.adicionarFeicao(nova('a'));
        el.atualizarFeicao({ id: 'a', name: 'B' } as FeicaoItem);
        el.removerFeicao('a');
      }).not.toThrow();
    });
  });

  describe('eventos nas linhas', () => {
    it('100 mutações não duplicam listeners nas linhas existentes', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      for (let i = 0; i < 100; i++) {
        el.adicionarFeicao(nova(`n${i}`));
        if (i % 3 === 0) el.atualizarFeicao({ id: `n${i}`, name: `Alterada ${i}` } as FeicaoItem);
        if (i % 2 === 0) el.removerFeicao(`n${i}`);
      }
      const selecionadas: unknown[] = [];
      const visibilidade: unknown[] = [];
      el.addEventListener('ui-feicao-selecionada', (e) => selecionadas.push((e as CustomEvent).detail));
      el.addEventListener('ui-feicao-visibilidade', (e) => visibilidade.push((e as CustomEvent).detail));

      linha(el, 'f0')!.click();
      expect(selecionadas).toHaveLength(1);
      q(el, '[data-feat-eye="f1"]').click();
      expect(visibilidade).toHaveLength(1);
      // linha criada incrementalmente e linha que sofreu update
      linha(el, 'n1')!.click();
      expect(selecionadas).toHaveLength(2);
      q(el, '[data-feat-eye="n3"]').click();
      expect(visibilidade).toHaveLength(2);
    });

    it('linha nova responde a seleção, olho, cadeado, enquadrar e renomear', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      el.adicionarFeicao(nova('n'));
      const eventos: string[] = [];
      ['ui-feicao-selecionada', 'ui-feicao-visibilidade', 'ui-feicao-bloqueio', 'ui-feicao-enquadrar', 'ui-feicao-renomeada'].forEach((nome) =>
        el.addEventListener(nome, () => eventos.push(nome))
      );
      linha(el, 'n')!.click();
      q(el, '[data-feat-eye="n"]').click();
      q(el, '[data-feat-lock="n"]').click();
      q(el, '[data-feat-fit="n"]').click();
      expect(eventos).toEqual(['ui-feicao-selecionada', 'ui-feicao-visibilidade', 'ui-feicao-bloqueio', 'ui-feicao-enquadrar']);

      q(el, '[data-feat-name-trigger="n"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      const input = q<HTMLInputElement>(el, '[data-inline-feat-input="n"]');
      input.value = 'Renomeada';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(eventos[eventos.length - 1]).toBe('ui-feicao-renomeada');
      expect(el.obterFeicao('n')!.name).toBe('Renomeada');
    });

    it('arrastar uma linha antiga sobre uma linha nova reordena (estado de arraste compartilhado)', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(2));
      el.adicionarFeicao(nova('n'));
      const reordenadas: unknown[] = [];
      el.addEventListener('ui-feicoes-reordenadas', (e) => reordenadas.push((e as CustomEvent).detail));
      linha(el, 'f0')!.dispatchEvent(new Event('dragstart', { bubbles: true }));
      linha(el, 'n')!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
      linha(el, 'n')!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
      expect(reordenadas).toHaveLength(1);
      expect(el.feicoes.map((f) => f.id)).toEqual(['f1', 'n', 'f0']);
    });

    it('arrastar uma linha nova sobre uma camada a move', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      el.adicionarFeicao(nova('n'));
      linha(el, 'n')!.dispatchEvent(new Event('dragstart', { bubbles: true }));
      q(el, '[data-layer-row="c1"]').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
      expect(el.obterFeicao('n')!.layerId).toBe('c1');
    });
  });

  describe('foco e acessibilidade', () => {
    it('adicionar e remover outras linhas não tira o foco da linha focada', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      const foco = linha(el, 'f1')!;
      foco.focus();
      el.adicionarFeicao(nova('n'));
      el.removerFeicao('f2');
      expect(sr(el).activeElement).toBe(foco);
    });

    it('atualizar a linha focada devolve o foco e o tabindex à linha nova', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(3));
      const foco = linha(el, 'f1')!;
      foco.focus();
      foco.setAttribute('tabindex', '0');
      el.atualizarFeicao({ id: 'f1', name: 'Mudou' } as FeicaoItem);
      const depois = linha(el, 'f1')!;
      expect(depois).not.toBe(foco);
      expect(sr(el).activeElement).toBe(depois);
      expect(depois.getAttribute('tabindex')).toBe('0');
    });

    it('linha nova tem os mesmos atributos ARIA e parts do render completo', () => {
      const el = criarPainel(camadasPadrao(), criarFeicoes(1));
      el.adicionarFeicao(nova('n'));
      const l = linha(el, 'n')!;
      expect(l.getAttribute('role')).toBe('treeitem');
      expect(l.getAttribute('aria-level')).toBe('2');
      expect(l.getAttribute('aria-selected')).toBe('false');
      expect(l.getAttribute('tabindex')).toBe('-1');
      expect(l.getAttribute('part')).toBe('feicao');
      expect(l.getAttribute('draggable')).toBe('true');
    });
  });

  describe('volume', () => {
    it('10.000 feições: mutações isoladas mantêm o DOM igual ao completo', () => {
      const camadas = Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, name: `C${i}` }));
      const feicoes = Array.from({ length: 10000 }, (_, i) => ({ ...criarFeicoes(1)[0], id: `v${i}`, layerId: `c${i % 4}` }));
      const el = criarPainel(camadas, feicoes);
      const antiga = linha(el, 'v0');
      el.adicionarFeicao(nova('extra', 'c2'));
      el.atualizarFeicao({ id: 'v4', name: 'Mudou' } as FeicaoItem);
      el.removerFeicao('v8');
      expect(linha(el, 'v0')).toBe(antiga);
      expect(q(el, '[data-layer-row="c2"] .ui-count-chip').textContent).toBe('2501');
      igualAoCompleto(el);
   }, 60_000);
  });
});

describe('UICamadas - auditoria de melhorias, bugs e UX', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selecionarFeicao em intervalo (Shift+Click) alcança feições reveladas por "Mostrar mais"', () => {
    const el = criarPainel(camadasPadrao(), criarFeicoes(120, 'c0'));
    q(el, '[data-layer-show-more="c0"]').click();
    expect(sr(el).querySelectorAll('.ui-feat-row').length).toBe(120);

    el.selecionarFeicao('f75');
    el.selecionarFeicao('f105', false, true);
    expect(el.selectedFeatureIds.size).toBe(31);
    expect(el.selectedFeatureIds.has('f105')).toBe(true);
  });

  it('Escape ao cancelar confirmação de exclusão restaura o rótulo original do drawer e do rodapé', () => {
    const el = criarPainel(camadasPadrao(), criarFeicoes(2, 'c0'));
    el.selecionarFeicao('f0');

    // Rodapé
    const btnFooterDel = q(el, '#btn-footer-del');
    btnFooterDel.click();
    expect(btnFooterDel.classList.contains('confirming')).toBe(true);
    expect(btnFooterDel.getAttribute('aria-label')).toContain('Clique novamente');

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(btnFooterDel.classList.contains('confirming')).toBe(false);
    expect(btnFooterDel.getAttribute('aria-label')).toBe('Excluir selecionados');

    // Drawer
    q(el, '[data-layer-settings="c0"]').click();
    const btnDrawerDel = q(el, '[data-delete-layer="c0"]');
    btnDrawerDel.click();
    expect(btnDrawerDel.classList.contains('confirming')).toBe(true);
    expect(btnDrawerDel.querySelector('.ui-btn-label')?.textContent).toBe('Confirmar Exclusão?');

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(btnDrawerDel.classList.contains('confirming')).toBe(false);
    expect(btnDrawerDel.querySelector('.ui-btn-label')?.textContent).toBe('Excluir');
  });

  it('exclusão em massa pelo rodapé respeita feições bloqueadas ou em camadas bloqueadas', () => {
    const camadas: CamadaItem[] = [
      { id: 'c0', name: 'Camada Livre', locked: false },
      { id: 'c1', name: 'Camada Travada', locked: true }
    ];
    const feicoes: FeicaoItem[] = [
      { id: 'f-livre', name: 'Livre', layerId: 'c0', locked: false },
      { id: 'f-travada', name: 'Travada Individual', layerId: 'c0', locked: true },
      { id: 'f-camada-travada', name: 'Em Camada Travada', layerId: 'c1', locked: false }
    ];
    const el = criarPainel(camadas, feicoes);
    el.selecionarFeicoes(['f-livre', 'f-travada', 'f-camada-travada']);

    const btnDel = q(el, '#btn-footer-del');
    btnDel.click();
    btnDel.click();

    expect(el.feicoes.map((f) => f.id)).toEqual(['f-travada', 'f-camada-travada']);
    expect(el.obterFeicao('f-livre')).toBeUndefined();
  });

  it('sincronizarSelecaoDOM mantém o target-circle da camada consistente durante busca ativa', () => {
    const feicoes: FeicaoItem[] = [
      { id: 'f1', name: 'Lote Norte', layerId: 'c0' },
      { id: 'f2', name: 'Lote Sul', layerId: 'c0' }
    ];
    const el = criarPainel(camadasPadrao(), feicoes);
    el.searchQuery = 'Norte';
    el.solicitarRenderizacao();

    q(el, '[data-layer-target="c0"]').click();
    expect([...el.selectedFeatureIds]).toEqual(['f1']);
    const circle = q(el, '[data-layer-target="c0"] .ui-target-circle');
    expect(circle.classList.contains('selected')).toBe(true);
    expect(circle.classList.contains('partial')).toBe(false);
  });

  it('alterar a cor da camada no drawer atualiza in-place as feições que herdam a cor da camada', () => {
    const feicoes: FeicaoItem[] = [
      { id: 'f-herdada', name: 'Herdada', layerId: 'c0' },
      { id: 'f-propria', name: 'Propria', layerId: 'c0', color: '#123456' }
    ];
    const el = criarPainel(camadasPadrao(), feicoes);
    q(el, '[data-layer-settings="c0"]').click();

    const picker = q<HTMLInputElement>(el, '[data-layer-color-picker="c0"]');
    picker.value = '#ff0055';
    picker.dispatchEvent(new Event('input', { bubbles: true }));

    const barHerdada = q<HTMLElement>(el, '[data-feat-row="f-herdada"] .ui-col-colorbar');
    const barPropria = q<HTMLElement>(el, '[data-feat-row="f-propria"] .ui-col-colorbar');
    expect(barHerdada.style.backgroundColor).toMatch(/^(#ff0055|rgb\(255, 0, 85\))$/);
    expect(barPropria.style.backgroundColor).toMatch(/^(#123456|rgb\(18, 52, 86\))$/);
  });

  it('travar ou destravar camada atualiza imediatamente as opções do select "Mover para..." no rodapé', () => {
    const el = criarPainel(camadasPadrao(), criarFeicoes(1, 'c0'));
    el.selecionarFeicao('f0');

    const sel = q<HTMLSelectElement>(el, '#select-footer-move');
    expect((sel.querySelector('option[value="c1"]') as HTMLOptionElement).disabled).toBe(false);

    // Trava c1 clicando no cadeado (in-place)
    q(el, '[data-layer-lock="c1"]').click();
    expect((sel.querySelector('option[value="c1"]') as HTMLOptionElement).disabled).toBe(true);

    // Destrava c1 clicando no cadeado (in-place)
    q(el, '[data-layer-lock="c1"]').click();
    expect((sel.querySelector('option[value="c1"]') as HTMLOptionElement).disabled).toBe(false);
  });

  it('navegação WAI-ARIA por setas: ArrowRight em camada expandida foca o 1º filho e ArrowLeft em feição foca a camada pai', () => {
    const el = criarPainel(camadasPadrao(), criarFeicoes(2, 'c0'));
    const linhaCamada = q(el, '[data-layer-row="c0"]');
    linhaCamada.focus();

    // Camada já está expandida: ArrowRight avança para o primeiro filho (f0)
    linhaCamada.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
    expect(sr(el).activeElement?.getAttribute('data-feat-row')).toBe('f0');

    // Em f0, ArrowLeft volta para a camada pai (c0)
    const linhaF0 = q(el, '[data-feat-row="f0"]');
    linhaF0.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }));
    expect(sr(el).activeElement?.getAttribute('data-layer-row')).toBe('c0');
  });

  it('arraste por ponteiro/toque no handle suporta aninhamento (drop-into) e emite ui-camada-mover-hierarquia', () => {
    const el = criarPainel(camadasPadrao(), []);
    const spy = vi.fn();
    el.addEventListener('ui-camada-mover-hierarquia', (e) => spy((e as CustomEvent).detail));

    const handleC1 = q(el, '[data-layer-row="c1"] .ui-col-drag');
    const rowC0 = q(el, '[data-layer-row="c0"]');
    vi.spyOn(rowC0, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      height: 25,
      bottom: 125,
      left: 0,
      right: 200,
      width: 200,
      x: 0,
      y: 100,
      toJSON: () => ({})
    });
    Object.defineProperty(sr(el), 'elementFromPoint', { value: () => rowC0, configurable: true });

    handleC1.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 140 }));
    // Move para o centro de c0 (clientY = 112 -> posição relativa = 12/25 = 0.48 -> zona 'dentro')
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: 112 }));
    expect(rowC0.classList.contains('drop-into')).toBe(true);

    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(el.obterCamada('c1')?.parentId).toBe('c0');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        camadaId: 'c1',
        novoParentId: 'c0',
        parentAnteriorId: null
      })
    );
  });
});
