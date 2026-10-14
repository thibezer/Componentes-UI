import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-camadas';
import type { UICamadas } from './ui-camadas';
import type { CamadaItem, FeicaoItem } from './tipos';
import { calcularComprimentoLinha, calcularAreaPoligono, formatarMetricaFeicoes } from './camadas-metricas';
import { escapeHtml, sanitizarCorCss } from './camadas-utils';

describe('UICamadas - Painel de Camadas GIS/CAD', () => {
  let painel: UICamadas;

  let mockCamadas: CamadaItem[];
  let mockFeicoes: FeicaoItem[];

  function criarMockDados() {
    mockCamadas = [
      { id: 'camada-1', name: 'Lotes Urbanos', color: '#00E08A', visible: true, locked: false },
      { id: 'camada-2', name: 'Rede Viária', color: '#38bdf8', visible: true, locked: false }
    ];

    mockFeicoes = [
      {
        id: 'feat-1',
        name: 'Lote 01 Quadra A',
        layerId: 'camada-1',
        type: 'Polygon',
        visible: true,
        locked: false,
        color: '#00E08A',
        coordinates: [
          [-23.55052, -46.633308],
          [-23.55152, -46.633308],
          [-23.55152, -46.634308],
          [-23.55052, -46.634308],
          [-23.55052, -46.633308]
        ]
      },
      {
        id: 'feat-2',
        name: 'Lote 02 Quadra A',
        layerId: 'camada-1',
        type: 'Polygon',
        visible: true,
        locked: false,
        color: '#00E08A',
        coordinates: [
          [-23.55252, -46.633308],
          [-23.55352, -46.633308],
          [-23.55352, -46.634308],
          [-23.55252, -46.634308],
          [-23.55252, -46.633308]
        ]
      },
      {
        id: 'feat-3',
        name: 'Avenida Principal',
        layerId: 'camada-2',
        type: 'LineString',
        visible: true,
        locked: false,
        color: '#38bdf8',
        coordinates: [
          [-23.5500, -46.6300],
          [-23.5550, -46.6350]
        ]
      }
    ];
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    criarMockDados();
    painel = document.createElement('ui-camadas') as UICamadas;
    document.body.appendChild(painel);
  });

  it('deve inicializar com Shadow DOM e estrutura base', () => {
    const shadow = painel.shadowRoot;
    expect(shadow).toBeTruthy();
    expect(shadow?.getElementById('panel-container')).toBeTruthy();
    expect(shadow?.getElementById('painel-corpo')).toBeTruthy();
  });

  it('deve renderizar camadas e feições passadas via definirCamadas', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);

    const shadow = painel.shadowRoot!;
    const grupos = shadow.querySelectorAll('.ui-layer-group');
    expect(grupos.length).toBe(2);

    const feicoesRenderizadas = shadow.querySelectorAll('.ui-feat-row');
    expect(feicoesRenderizadas.length).toBe(3);

    const lote1 = shadow.querySelector('[data-feat-row="feat-1"]');
    expect(lote1).toBeTruthy();
    expect(lote1?.textContent).toContain('Lote 01 Quadra A');
  });

  it('deve alternar visibilidade de camada e emitir evento ui-camada-visibilidade', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    const spy = vi.fn();
    painel.addEventListener('ui-camada-visibilidade', spy);

    const shadow = painel.shadowRoot!;
    const btnOlho = shadow.querySelector('[data-layer-eye="camada-1"]') as HTMLElement;
    expect(btnOlho).toBeTruthy();

    btnOlho.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail).toEqual({
      camadaId: 'camada-1',
      visivel: false
    });
  });

  it('deve selecionar camada ativa ao clicar na linha da camada', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    const spy = vi.fn();
    painel.addEventListener('ui-camada-selecionada', spy);

    const shadow = painel.shadowRoot!;
    const linhaCamada2 = shadow.querySelector('[data-layer-row="camada-2"]') as HTMLElement;
    expect(linhaCamada2).toBeTruthy();

    linhaCamada2.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.camadaId).toBe('camada-2');
    expect(painel.camadaAtivaId).toBe('camada-2');
  });

  it('deve selecionar feição ao clicar na linha e emitir ui-feicao-selecionada', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    const spy = vi.fn();
    painel.addEventListener('ui-feicao-selecionada', spy);

    const linha = painel.shadowRoot!.querySelector('[data-feat-select="feat-1"]') as HTMLElement;
    expect(linha).toBeTruthy();
    linha.click();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.feicaoId).toBe('feat-1');
    expect(painel.selectedFeatureIds.has('feat-1')).toBe(true);
  });

  it('deve selecionar todas as feições de uma camada pelo target circle', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);

    const shadow = painel.shadowRoot!;
    const targetCamada1 = shadow.querySelector('[data-layer-target="camada-1"]') as HTMLElement;
    expect(targetCamada1).toBeTruthy();

    targetCamada1.click();
    expect(painel.selectedFeatureIds.has('feat-1')).toBe(true);
    expect(painel.selectedFeatureIds.has('feat-2')).toBe(true);
    expect(painel.selectedFeatureIds.has('feat-3')).toBe(false);
  });

  it('deve calcular métricas geodésicas corretamente', () => {
    const coordsLinha = [
      [-23.5500, -46.6300],
      [-23.5550, -46.6350]
    ];
    const len = calcularComprimentoLinha(coordsLinha);
    expect(len).toBeGreaterThan(500);

    const coordsPoligono = [
      [-23.55052, -46.633308],
      [-23.55152, -46.633308],
      [-23.55152, -46.634308],
      [-23.55052, -46.634308],
      [-23.55052, -46.633308]
    ];
    const area = calcularAreaPoligono(coordsPoligono);
    expect(area).toBeGreaterThan(1000);

    const formatado = formatarMetricaFeicoes([mockFeicoes[0]]);
    expect(formatado).toBeTruthy();
  });

  it('deve alternar e configurar propriedades da camada pelo drawer', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    const shadow = painel.shadowRoot!;

    // Abre configurações da camada 1
    const btnSettings = shadow.querySelector('[data-layer-settings="camada-1"]') as HTMLElement;
    expect(btnSettings).toBeTruthy();
    btnSettings.click();

    expect(painel.activeSettingsLayerId).toBe('camada-1');
    const drawer = shadow.getElementById('settings-drawer-camada-1');
    expect(drawer).toBeTruthy();
    expect(drawer?.querySelector('[data-layer-color-picker="camada-1"]')).toBeTruthy();
    expect(drawer?.querySelector('[data-layer-opacity-slider="camada-1"]')).toBeTruthy();
  });

  it('deve colapsar e expandir através dos métodos e atributos', () => {
    const spy = vi.fn();
    painel.addEventListener('ui-colapso-alterado', spy);

    painel.colapsar();
    expect(painel.colapsado).toBe(true);
    expect(painel.hasAttribute('colapsado')).toBe(true);

    painel.expandir();
    expect(painel.colapsado).toBe(false);
    expect(painel.hasAttribute('colapsado')).toBe(false);

    painel.setAttribute('colapsado', '');
    expect(spy).not.toHaveBeenCalled();
  });

  it('deve emitir ui-colapso-alterado apenas quando o usuário clica no botão de expandir', () => {
    painel.colapsar();
    const spy = vi.fn();
    painel.addEventListener('ui-colapso-alterado', spy);

    (painel.shadowRoot!.getElementById('btn-expandir-flutuante') as HTMLElement).click();
    expect(painel.colapsado).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail).toEqual({ colapsado: false });
  });

  describe('Mutação programática vs. interação do usuário', () => {
    const eventosPainel = [
      'ui-camada-selecionada',
      'ui-camada-visibilidade',
      'ui-feicoes-selecionadas',
      'ui-feicao-selecionada',
      'ui-mapa-base-alterado',
      'ui-colapso-alterado',
      'ui-redimensionar-altura'
    ];

    beforeEach(() => {
      // Isola do estado persistido por testes anteriores
      localStorage.clear();
      document.body.innerHTML = '';
      painel = document.createElement('ui-camadas') as UICamadas;
      painel.setAttribute('persistir', 'false');
      document.body.appendChild(painel);
    });

    function espionarTodos() {
      const spy = vi.fn();
      eventosPainel.forEach((nome) => painel.addEventListener(nome, spy));
      return spy;
    }

    it('não deve disparar eventos quando o consumidor altera propriedades, atributos ou métodos públicos', () => {
      const spy = espionarTodos();

      painel.layers = mockCamadas;
      painel.features = mockFeicoes;
      painel.definirCamadaAtiva('camada-2');
      painel.camadaAtivaId = 'camada-1';
      painel.setAttribute('camada-ativa', 'camada-2');
      painel.selecionarFeicao('feat-1');
      painel.selecionarFeicoes(['feat-1', 'feat-2']);
      painel.removerFeicao('feat-2');
      painel.limparSelecao();
      painel.alternarVisibilidadeTodas();
      painel.selecionarMapaBase('ruas');
      painel.setAttribute('mapa-base-ativo', 'satelite');
      painel.colapsado = true;
      painel.alternarColapso();
      painel.definirAltura(360);
      painel.altura = 420;

      expect(spy).not.toHaveBeenCalled();
      expect(painel.camadaAtivaId).toBe('camada-2');
      expect(painel.layers.map((c) => c.id)).toEqual(['camada-1', 'camada-2']);
    });

    it('deve refletir element.layers = [...] no DOM sem reemitir eventos (sem loop de sincronização)', () => {
      painel.layers = mockCamadas;
      let reatribuicoes = 0;
      painel.addEventListener('ui-camada-visibilidade', (e) => {
        const { camadaId, visivel } = (e as CustomEvent).detail;
        reatribuicoes++;
        // Padrão de app reativo: o estado externo é atualizado e reatribuído ao componente
        painel.layers = painel.layers.map((c) => (c.id === camadaId ? { ...c, visible: visivel } : c));
      });

      (painel.shadowRoot!.querySelector('[data-layer-eye="camada-1"]') as HTMLElement).click();

      expect(reatribuicoes).toBe(1);
      const linha = painel.shadowRoot!.querySelector('[data-layer-row="camada-1"]');
      expect(linha?.classList.contains('hidden-layer')).toBe(true);
    });

    it('deve emitir eventos quando o usuário interage com o mapa base e a limpeza por teclado', () => {
      painel.definirCamadas(mockCamadas, mockFeicoes);
      const spyMapa = vi.fn();
      const spySelecao = vi.fn();
      painel.addEventListener('ui-mapa-base-alterado', spyMapa);
      painel.addEventListener('ui-feicoes-selecionadas', spySelecao);

      const card = painel.shadowRoot!.querySelector('[data-basemap-id]:not(.active)') as HTMLElement;
      expect(card).toBeTruthy();
      card.click();
      expect(spyMapa).toHaveBeenCalledTimes(1);

      painel.selecionarFeicoes(['feat-1']);
      painel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(spySelecao).toHaveBeenCalledTimes(1);
      expect(spySelecao.mock.calls[0][0].detail.feicoesIds).toEqual([]);
    });

    it('deve permitir optar explicitamente pela emissão via parâmetro emitirEvento', () => {
      painel.definirCamadas(mockCamadas, mockFeicoes);
      const spy = vi.fn();
      painel.addEventListener('ui-camada-selecionada', spy);

      painel.definirCamadaAtiva('camada-2', true);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  it('deve executar ações em massa através dos botões do rodapé', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    painel.selecionarFeicoes(['feat-1', 'feat-2']);

    const spy = vi.fn();
    painel.addEventListener('ui-acao-massa', spy);

    const shadow = painel.shadowRoot!;
    const btnFooterVis = shadow.getElementById('btn-footer-vis') as HTMLButtonElement;
    expect(btnFooterVis).toBeTruthy();
    expect(btnFooterVis.disabled).toBe(false);

    btnFooterVis.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.acao).toBe('visibilidade');
  });

  it('deve sanitizar cores CSS e escapar strings HTML com segurança', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(sanitizarCorCss('#00E08A')).toBe('#00E08A');
    expect(sanitizarCorCss('rgba(0, 224, 138, 0.5)')).toBe('rgba(0, 224, 138, 0.5)');
    expect(sanitizarCorCss('red; background-image: url(malicious.jpg)', '#00E08A')).toBe('#00E08A');
    expect(sanitizarCorCss('', '#38bdf8')).toBe('#38bdf8');
  });

  it('deve exigir confirmação em 2 passos para exclusão de camada', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    const shadow = painel.shadowRoot!;

    // Abre configurações da camada 1
    const btnSettings = shadow.querySelector('[data-layer-settings="camada-1"]') as HTMLElement;
    btnSettings.click();

    const btnDelete = shadow.querySelector('[data-delete-layer="camada-1"]') as HTMLElement;
    expect(btnDelete).toBeTruthy();

    const spyExclusao = vi.fn();
    painel.addEventListener('ui-camada-excluida', spyExclusao);

    // 1º Clique: entra no estado de confirmação
    btnDelete.click();
    expect(btnDelete.classList.contains('confirming')).toBe(true);
    expect(btnDelete.textContent).toContain('Confirmar Exclusão?');
    expect(spyExclusao).not.toHaveBeenCalled();

    // 2º Clique: confirma e remove a camada
    btnDelete.click();
    expect(spyExclusao).toHaveBeenCalledTimes(1);
    expect(spyExclusao.mock.calls[0][0].detail.camadaId).toBe('camada-1');
    expect(painel.camadas.some((l) => l.id === 'camada-1')).toBe(false);
  });

  it('deve permitir renomear camada via inline double-click e tecla Enter', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    const shadow = painel.shadowRoot!;
    const spy = vi.fn();
    painel.addEventListener('ui-camada-renomeada', spy);

    const trigger = shadow.querySelector('[data-layer-name-trigger="camada-1"]') as HTMLElement;
    expect(trigger).toBeTruthy();

    // Dispara duplo-clique
    trigger.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    const input = shadow.querySelector('[data-inline-layer-input="camada-1"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = 'Lotes Comerciais Alterado';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.novoNome).toBe('Lotes Comerciais Alterado');
    expect(painel.camadas.find((l) => l.id === 'camada-1')?.name).toBe('Lotes Comerciais Alterado');
  });

  describe('Persistência e Lembrança de Estado (LocalStorage)', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('deve salvar e restaurar o estado de expansão/recolhimento das camadas (lembrança)', () => {
      painel.id = 'painel-gis-lembranca';
      painel.definirCamadas(mockCamadas, mockFeicoes);

      // Ambas expandidas no início
      expect(painel.expandedLayers.has('camada-1')).toBe(true);
      expect(painel.expandedLayers.has('camada-2')).toBe(true);

      // Usuário recolhe a camada-1 clicando no botão de expandir
      const shadow = painel.shadowRoot!;
      const btnExpandCamada1 = shadow.querySelector('[data-layer-expand="camada-1"]') as HTMLElement;
      expect(btnExpandCamada1).toBeTruthy();
      btnExpandCamada1.click();

      // Verifica que agora está recolhida
      expect(painel.expandedLayers.has('camada-1')).toBe(false);

      // Simula uma nova sessão / retorno à página
      const painelRetorno = document.createElement('ui-camadas') as UICamadas;
      painelRetorno.id = 'painel-gis-lembranca';
      document.body.appendChild(painelRetorno);

      painelRetorno.definirCamadas(mockCamadas, mockFeicoes);

      // O painel deve lembrar que camada-1 estava recolhida e camada-2 expandida!
      expect(painelRetorno.expandedLayers.has('camada-1')).toBe(false);
      expect(painelRetorno.expandedLayers.has('camada-2')).toBe(true);
    });

    it('deve lembrar alterações visuais da camada como visibilidade, bloqueio e cor', () => {
      painel.id = 'painel-gis-props';
      painel.definirCamadas(mockCamadas, mockFeicoes);

      const shadow = painel.shadowRoot!;

      // 1. Oculta camada-1
      const btnOlho = shadow.querySelector('[data-layer-eye="camada-1"]') as HTMLElement;
      btnOlho.click();

      // 2. Trava camada-1
      const btnLock = shadow.querySelector('[data-layer-lock="camada-1"]') as HTMLElement;
      btnLock.click();

      // Simula retorno
      const painelRetorno = document.createElement('ui-camadas') as UICamadas;
      painelRetorno.id = 'painel-gis-props';
      document.body.appendChild(painelRetorno);

      painelRetorno.definirCamadas(mockCamadas, mockFeicoes);

      const camada1Retornada = painelRetorno.camadas.find((l) => l.id === 'camada-1');
      expect(camada1Retornada?.visible).toBe(false);
      expect(camada1Retornada?.locked).toBe(true);
    });

    it('deve lembrar o estado colapsado do painel e camada ativa', () => {
      painel.id = 'painel-colapso';
      painel.colapsar();
      painel.definirCamadas(mockCamadas, mockFeicoes);
      painel.definirCamadaAtiva('camada-2');

      expect(painel.colapsado).toBe(true);
      expect(painel.camadaAtivaId).toBe('camada-2');

      // Simula nova inicialização
      const painelRetorno = document.createElement('ui-camadas') as UICamadas;
      painelRetorno.id = 'painel-colapso';
      document.body.appendChild(painelRetorno);

      expect(painelRetorno.colapsado).toBe(true);
      expect(painelRetorno.camadaAtivaId).toBe('camada-2');
    });

    it('deve respeitar persistir="false" desativando o salvamento no storage', () => {
      painel.id = 'painel-sem-storage';
      painel.persistir = false;
      painel.definirCamadas(mockCamadas, mockFeicoes);

      const shadow = painel.shadowRoot!;
      const btnExpandCamada1 = shadow.querySelector('[data-layer-expand="camada-1"]') as HTMLElement;
      btnExpandCamada1.click();

      // localStorage não deve conter a chave
      const chave = painel.obterChaveStorageAtual();
      expect(localStorage.getItem(chave)).toBeNull();
    });

    it('deve limpar dados salvos ao chamar limparLembranca()', () => {
      painel.id = 'painel-limpar';
      painel.definirCamadas(mockCamadas, mockFeicoes);

      const chave = painel.obterChaveStorageAtual();
      expect(localStorage.getItem(chave)).toBeTruthy();

      painel.limparLembranca();
      expect(localStorage.getItem(chave)).toBeNull();
    });

    it('deve persistir e restaurar altura configurada pelo programador ou usuário', () => {
      painel.id = 'painel-altura-persistencia';
      painel.definirAltura(480);
      expect(painel.style.height).toBe('480px');

      // Novo painel com mesmo ID deve restaurar a altura
      const outroPainel = document.createElement('ui-camadas') as UICamadas;
      outroPainel.id = 'painel-altura-persistencia';
      document.body.appendChild(outroPainel);

      expect(outroPainel.style.height).toBe('480px');
      expect(outroPainel.style.getPropertyValue('--ui-camadas-altura')).toBe('480px');
    });
  });

  describe('Redimensionamento Vertical e Estabilidade de Altura', () => {
    it('deve conter o resizer de altura na estrutura do Shadow DOM', () => {
      const shadow = painel.shadowRoot!;
      const resizer = shadow.getElementById('resizer-altura');
      expect(resizer).toBeTruthy();
      expect(painel.redimensionavel).toBe(false);

      painel.redimensionavel = true;
      expect(painel.hasAttribute('redimensionavel')).toBe(true);
      expect(painel.redimensionavel).toBe(true);
    });

    it('deve permitir definir altura via método sem disparar evento (mutação programática)', () => {
      const spy = vi.fn();
      painel.addEventListener('ui-redimensionar-altura', spy);

      painel.definirAltura(380);
      expect(painel.style.height).toBe('380px');
      expect(painel.style.getPropertyValue('--ui-camadas-altura')).toBe('380px');
      expect(spy).not.toHaveBeenCalled();
    });

    it('deve resetar altura ao receber duplo clique no resizer', () => {
      const shadow = painel.shadowRoot!;
      const resizer = shadow.getElementById('resizer-altura')!;
      painel.definirAltura(450);
      expect(painel.style.height).toBe('450px');

      const spy = vi.fn();
      painel.addEventListener('ui-redimensionar-altura', spy);
      resizer.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ detail: { altura: null } }));
      expect(painel.style.height).toBe('');
      expect(painel.style.getPropertyValue('--ui-camadas-altura')).toBe('');
    });

    it('deve manter a estabilidade da altura mesmo com apenas 1 camada ou vazia', () => {
      painel.definirAltura(500);
      painel.definirCamadas([{ id: 'c1', name: 'Única Camada', color: '#00E08A', visible: true, locked: false }]);

      // O container e o host devem manter a altura definida sem colapsar
      expect(painel.style.height).toBe('500px');
      const container = painel.shadowRoot!.getElementById('panel-container');
      expect(container).toBeTruthy();
    });
  });

  it('mantém o foco no botão de configurações ao abri-lo pelo teclado (re-render)', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    document.body.appendChild(painel);
    const shadow = painel.shadowRoot!;
    const btn = shadow.querySelector('[data-layer-settings="camada-1"]') as HTMLElement;
    btn.focus();
    btn.click();
    expect(shadow.getElementById('settings-drawer-camada-1')).not.toBeNull();
    const ativo = shadow.activeElement as HTMLElement | null;
    expect(ativo?.getAttribute('data-layer-settings')).toBe('camada-1');
    expect(ativo?.isConnected).toBe(true);
  });

  it('emLote agrupa várias mutações em uma única renderização', () => {
    painel.definirCamadas(mockCamadas, []);
    const render = vi.spyOn(painel as unknown as { render: () => void }, 'render');
    painel.emLote(() => {
      for (let i = 0; i < 20; i++) painel.adicionarFeicao({ id: `n-${i}`, name: `N ${i}`, layerId: 'camada-1', type: 'Point' } as FeicaoItem);
    });
    expect(render).toHaveBeenCalledTimes(1);
    expect(painel.feicoes).toHaveLength(20);
    painel.adicionarFeicao({ id: 'solta', name: 'S', layerId: 'camada-1', type: 'Point' } as FeicaoItem);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('definirCamadas troca a camada ativa que deixou de existir', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    painel.definirCamadaAtiva('camada-2');
    painel.definirCamadas([{ id: 'nova', name: 'Nova', color: '#fff', visible: true, locked: false }], []);
    expect(painel.camadaAtivaId).toBe('nova');
  });

  it('selecionarFeicao seleciona feição de camada recolhida', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    painel.colapsarTodas();
    painel.selecionarFeicao('feat-1');
    expect(painel.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['feat-1']);
    painel.selecionarFeicao('inexistente');
    expect(painel.obterFeicoesSelecionadas().map((f) => f.id)).toEqual(['feat-1']);
  });

  it('a ordem da aplicação vence a do usuário quando ela mudou; senão vale a do usuário', async () => {
    const { reidratarCamadasComOverrides } = await import('./camadas-persistencia');
    const c = (id: string) => ({ id, name: id, color: '#fff' }) as CamadaItem;
    const estado = { versao: 1, expandedLayerIds: [], collapsedLayerIds: [], ordemCamadasIds: ['c', 'b', 'a'], ordemOrigemIds: ['a', 'b', 'c'] };
    const igual = [c('a'), c('b'), c('c')];
    reidratarCamadasComOverrides(igual, estado, new Set());
    expect(igual.map((x) => x.id)).toEqual(['c', 'b', 'a']);
    const reordenada = [c('b'), c('a'), c('c')];
    reidratarCamadasComOverrides(reordenada, estado, new Set());
    expect(reordenada.map((x) => x.id)).toEqual(['b', 'a', 'c']);
    const comNova = [c('a'), c('b'), c('c'), c('d')];
    reidratarCamadasComOverrides(comNova, estado, new Set());
    expect(comNova.map((x) => x.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('excluir uma camada apaga o override guardado dela', async () => {
    const { carregarEstadoPersistido } = await import('./camadas-persistencia');
    painel.setAttribute('storage-key', 'teste-removidas');
    painel.definirCamadas(mockCamadas, mockFeicoes);
    painel.alternarVisibilidadeTodas();
    expect(Object.keys(carregarEstadoPersistido(painel.obterChaveStorageAtual())!.camadasOverrides!)).toContain('camada-2');
    painel.removerCamada('camada-2');
    expect(Object.keys(carregarEstadoPersistido(painel.obterChaveStorageAtual())!.camadasOverrides!)).not.toContain('camada-2');
    painel.limparLembranca();
  });

  it('avisa quando dois painéis dividem a chave de persistência padrão', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const a = document.createElement('ui-camadas');
    const b = document.createElement('ui-camadas');
    const antes = aviso.mock.calls.length;
    document.body.append(a, b);
    expect(aviso.mock.calls.slice(antes).some((c) => String(c[0]).includes('storage-key'))).toBe(true);
    aviso.mockRestore();
  });

  describe('Métricas Geodésicas e Cálculo de Área com Furos', () => {
    it('deve calcular área de anel simples e polígono sem furos', () => {
      // Quadrado de ~0.001 graus em latitude/longitude (~111m x ~102m em SP)
      const anelExterior = [
        [-23.550, -46.630],
        [-23.551, -46.630],
        [-23.551, -46.631],
        [-23.550, -46.631],
        [-23.550, -46.630]
      ];
      const areaSimples = calcularAreaPoligono(anelExterior);
      expect(areaSimples).toBeGreaterThan(10000); // Mais de 10.000 m²

      const areaPolygonUnico = calcularAreaPoligono([anelExterior]);
      expect(Math.round(areaPolygonUnico)).toBe(Math.round(areaSimples));
    });

    it('deve abater a área de furos interiores (donut/holes)', () => {
      const anelExterior = [
        [-23.550, -46.630],
        [-23.552, -46.630],
        [-23.552, -46.632],
        [-23.550, -46.632],
        [-23.550, -46.630]
      ];
      const anelFuro = [
        [-23.5505, -46.6305],
        [-23.5515, -46.6305],
        [-23.5515, -46.6315],
        [-23.5505, -46.6315],
        [-23.5505, -46.6305]
      ];

      const areaSemFuro = calcularAreaPoligono([anelExterior]);
      const areaComFuro = calcularAreaPoligono([anelExterior, anelFuro]);
      const areaApenasFuro = calcularAreaPoligono([anelFuro]);

      expect(areaSemFuro).toBeGreaterThan(areaComFuro);
      expect(Math.round(areaComFuro)).toBe(Math.round(areaSemFuro - areaApenasFuro));
    });

    it('deve calcular corretamente a área somada de um MultiPolygon', () => {
      const poly1 = [
        [
          [-23.550, -46.630],
          [-23.551, -46.630],
          [-23.551, -46.631],
          [-23.550, -46.631],
          [-23.550, -46.630]
        ]
      ];
      const poly2 = [
        [
          [-23.560, -46.640],
          [-23.561, -46.640],
          [-23.561, -46.641],
          [-23.560, -46.641],
          [-23.560, -46.640]
        ]
      ];

      const areaP1 = calcularAreaPoligono(poly1);
      const areaP2 = calcularAreaPoligono(poly2);
      const areaMulti = calcularAreaPoligono([poly1, poly2]);

      expect(Math.round(areaMulti)).toBe(Math.round(areaP1 + areaP2));
    });
  });

  describe('Adaptadores de Compatibilidade (Canvas CAD <-> UI Camadas)', () => {
    it('deve converter CanvasLayerDef para CamadaItem com mapeamento fiel', async () => {
      const { converterCanvasLayerParaCamadaItem, converterCamadaItemParaCanvasLayer } = await import('./camadas-adapters');
      const canvasLayer = {
        id: 'layer-sigef',
        nome: 'Acervo Fundiário SIGEF',
        categoria: 'wms' as const,
        tipo: 'wms' as const,
        visivel: true,
        opacidade: 0.85,
        zIndex: 390,
        interativo: true,
        bloqueada: false,
        estilo: { corPrimaria: '#f59e0b' }
      };

      const camadaItem = converterCanvasLayerParaCamadaItem(canvasLayer);
      expect(camadaItem.id).toBe('layer-sigef');
      expect(camadaItem.name).toBe('Acervo Fundiário SIGEF');
      expect(camadaItem.color).toBe('#f59e0b');
      expect(camadaItem.visible).toBe(true);
      expect(camadaItem.locked).toBe(false);
      expect(camadaItem.opacity).toBe(0.85);

      const voltaCanvas = converterCamadaItemParaCanvasLayer(camadaItem);
      expect(voltaCanvas.id).toBe('layer-sigef');
      expect(voltaCanvas.nome).toBe('Acervo Fundiário SIGEF');
      expect(voltaCanvas.visivel).toBe(true);
      expect(voltaCanvas.bloqueada).toBe(false);
      expect(voltaCanvas.opacidade).toBe(0.85);
    });

    it('deve converter feição genérica do Canvas para FeicaoItem', async () => {
      const { converterFeicaoParaItem } = await import('./camadas-adapters');
      const feicaoCanvas = {
        id: 'poly-1',
        nome: 'Lote 01 Quadra A',
        camadaId: 'lotes',
        tipo: 'Polygon',
        cor: '#00E08A',
        visivel: true,
        bloqueada: false,
        status: 'oficial',
        coordenadas: [
          [-23.55, -46.63],
          [-23.551, -46.63]
        ]
      };

      const item = converterFeicaoParaItem(feicaoCanvas);
      expect(item.id).toBe('poly-1');
      expect(item.name).toBe('Lote 01 Quadra A');
      expect(item.layerId).toBe('lotes');
      expect(item.type).toBe('Polygon');
      expect(item.color).toBe('#00E08A');
      expect(item.status).toBe('oficial');
    });
  });

  describe('Rodapé Aprimorado e Prevenção de Conflitos Visuais', () => {
    it('deve exibir modo resumo com botões gerais e ocultar ações em massa quando não há seleção', () => {
      painel.definirCamadas(mockCamadas, mockFeicoes);
      const shadow = painel.shadowRoot!;

      const footer = shadow.querySelector('.ui-tree-footer');
      expect(footer).toBeTruthy();
      expect(footer?.classList.contains('sem-selecao')).toBe(true);

      const count = shadow.getElementById('footer-count');
      const label = shadow.getElementById('footer-label');
      expect(count?.textContent).toBe('2');
      expect(label?.textContent).toBe('camadas');

      // Botões gerais presentes
      const btnNewGroup = shadow.getElementById('btn-footer-new-group');
      const btnNewLayer = shadow.getElementById('btn-footer-new-layer');
      expect(btnNewGroup).toBeTruthy();
      expect(btnNewLayer).toBeTruthy();

      // Contêiner de ações gerais visível e de ações em massa oculto
      const actionsGerais = shadow.querySelector('.ui-footer-actions-gerais') as HTMLElement;
      const bulkActions = shadow.querySelector('.ui-footer-bulk-actions') as HTMLElement;
      expect(actionsGerais.style.display).not.toBe('none');
      expect(bulkActions.style.display).toBe('none');
    });

    it('deve transicionar para modo ações em massa com preview de cor e seletor hierárquico ao selecionar feições', () => {
      painel.definirCamadas(mockCamadas, mockFeicoes);
      const shadow = painel.shadowRoot!;

      painel.selecionarFeicoes(['feat-1']);

      const footer = shadow.querySelector('.ui-tree-footer');
      expect(footer?.classList.contains('tem-selecao')).toBe(true);

      const count = shadow.getElementById('footer-count');
      const label = shadow.getElementById('footer-label');
      expect(count?.textContent).toBe('1');
      expect(label?.textContent).toBe('selecionado');

      const actionsGerais = shadow.querySelector('.ui-footer-actions-gerais') as HTMLElement;
      const bulkActions = shadow.querySelector('.ui-footer-bulk-actions') as HTMLElement;
      expect(actionsGerais.style.display).toBe('none');
      expect(bulkActions.style.display).toBe('flex');

      const previewColor = shadow.getElementById('preview-footer-color');
      expect(previewColor).toBeTruthy();

      const clearBtn = shadow.getElementById('btn-footer-clear');
      expect(clearBtn).toBeTruthy();
    });

    it('deve disparar evento ui-camada-grupo-adicionar ao clicar no botão de novo grupo', () => {
      painel.definirCamadas(mockCamadas, mockFeicoes);
      const shadow = painel.shadowRoot!;

      const spy = vi.fn();
      painel.addEventListener('ui-camada-grupo-adicionar', spy);

      const btnNewGroup = shadow.getElementById('btn-footer-new-group') as HTMLElement;
      expect(btnNewGroup).toBeTruthy();
      btnNewGroup.click();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail.isGroup).toBe(true);
    });
  });

  describe('Hierarquia de Camadas (Camadas dentro de outras Camadas)', () => {
    it('deve renderizar subcamadas aninhadas dentro do container da camada pai', () => {
      const camadasHierarquicas: CamadaItem[] = [
        { id: 'grupo-1', name: 'Grupo Urbanismo', isGroup: true, visible: true },
        { id: 'sub-1', name: 'Loteamento', parentId: 'grupo-1', visible: true },
        { id: 'sub-2', name: 'Arruamento', parentId: 'grupo-1', visible: true },
        { id: 'camada-raiz', name: 'Topografia Isolada', visible: true }
      ];

      painel.definirCamadas(camadasHierarquicas, []);
      const shadow = painel.shadowRoot!;

      const grupoEl = shadow.querySelector('.ui-layer-group[data-layer-id="grupo-1"]') as HTMLElement;
      expect(grupoEl).toBeTruthy();

      // As subcamadas devem estar DENTRO do ui-children-container do grupo
      const childrenContainer = grupoEl.querySelector('.ui-children-container');
      expect(childrenContainer).toBeTruthy();

      const sub1El = childrenContainer?.querySelector('.ui-layer-group[data-layer-id="sub-1"]');
      const sub2El = childrenContainer?.querySelector('.ui-layer-group[data-layer-id="sub-2"]');
      expect(sub1El).toBeTruthy();
      expect(sub2El).toBeTruthy();

      // Subcamada tem classe is-sublayer
      const sub1Row = sub1El?.querySelector('.ui-layer-row');
      expect(sub1Row?.classList.contains('is-sublayer')).toBe(true);

      // Camada raiz está fora do grupo
      const raizEl = shadow.querySelector('.ui-layer-group[data-layer-id="camada-raiz"]');
      expect(raizEl).toBeTruthy();
      expect(grupoEl.contains(raizEl!)).toBe(false);
    });

    it('deve colapsar subcamadas quando a camada pai é recolhida', () => {
      const camadasHierarquicas: CamadaItem[] = [
        { id: 'grupo-1', name: 'Grupo Urbanismo', isGroup: true, visible: true },
        { id: 'sub-1', name: 'Loteamento', parentId: 'grupo-1', visible: true }
      ];

      painel.definirCamadas(camadasHierarquicas, []);
      const shadow = painel.shadowRoot!;

      const grupoEl = shadow.querySelector('.ui-layer-group[data-layer-id="grupo-1"]') as HTMLElement;
      const expandBtn = grupoEl.querySelector('[data-layer-expand="grupo-1"]') as HTMLElement;
      const children = grupoEl.querySelector('.ui-children-container') as HTMLElement;

      expect(children.style.display).not.toBe('none');

      // Clica para recolher o grupo
      expandBtn.click();
      expect(children.style.display).toBe('none');
    });

    it('deve emitir ui-camada-mover-hierarquia ao alterar grupo pai pelo drawer', () => {
      const camadas: CamadaItem[] = [
        { id: 'grupo-1', name: 'Grupo A', isGroup: true },
        { id: 'camada-1', name: 'Camada 1' }
      ];

      painel.definirCamadas(camadas, []);
      const shadow = painel.shadowRoot!;

      // Abre drawer da camada 1
      const btnSettings = shadow.querySelector('[data-layer-settings="camada-1"]') as HTMLElement;
      btnSettings.click();

      const spy = vi.fn();
      painel.addEventListener('ui-camada-mover-hierarquia', spy);

      const parentSelect = shadow.querySelector('[data-layer-parent-select="camada-1"]') as HTMLSelectElement;
      expect(parentSelect).toBeTruthy();

      parentSelect.value = 'grupo-1';
      parentSelect.dispatchEvent(new Event('change'));

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail.camadaId).toBe('camada-1');
      expect(spy.mock.calls[0][0].detail.novoParentId).toBe('grupo-1');

      const camadaAtualizada = painel.camadas.find((c) => c.id === 'camada-1');
      expect(camadaAtualizada?.parentId).toBe('grupo-1');
    });

    it('deve promover subcamadas para o nível raiz ao excluir uma camada pai', () => {
      const camadas: CamadaItem[] = [
        { id: 'grupo-pai', name: 'Grupo Pai', isGroup: true },
        { id: 'sub-filha', name: 'Sub Filha', parentId: 'grupo-pai' }
      ];

      painel.definirCamadas(camadas, []);
      painel.removerCamada('grupo-pai');

      expect(painel.camadas.some((c) => c.id === 'grupo-pai')).toBe(false);
      const subFilha = painel.camadas.find((c) => c.id === 'sub-filha');
      expect(subFilha).toBeTruthy();
      expect(subFilha?.parentId).toBeNull();
    });
  });
});


