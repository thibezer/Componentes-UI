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

  it('deve selecionar feição e atualizar contadores no rodapé', () => {
    painel.definirCamadas(mockCamadas, mockFeicoes);
    const spy = vi.fn();
    painel.addEventListener('ui-feicao-selecionada', spy);

    painel.selecionarFeicao('feat-1');

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
  });
});
