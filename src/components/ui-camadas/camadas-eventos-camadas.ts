/* ====================================================
   UI Camadas - Eventos das Linhas de Camada
   Seleção, expansão, visibilidade, trava, drawer de
   configurações (cor, opacidade, exclusão) e target
   ==================================================== */

import { CamadasHostCompleto } from './camadas-host';
import { ICONES } from './camadas-icones';
import { sanitizarCorCss, buscarPorAtributo, definirRotuloControle } from './camadas-utils';
import { filtrarFeicoesPorBusca } from './camadas-selecao';
import { abrirSeletorCor } from '../ui-cores/ui-seletor-cor';

export function conectarEventosCamadas(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  // 5. Linhas de Camadas
  shadow.querySelectorAll('[data-layer-row]').forEach((row) => {
    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          '[data-layer-eye], [data-layer-lock], [data-layer-expand], [data-layer-target], [data-layer-fit], [data-layer-settings], [data-layer-color], input, button'
        )
      ) {
        return;
      }
      const layerId = row.getAttribute('data-layer-row');
      if (layerId) {
        host.definirCamadaAtiva(layerId, true);
      }
    });
  });

  // Expandir individual da camada (in-place sem redesenhar o DOM)
  shadow.querySelectorAll('[data-layer-expand]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const layerId = btn.getAttribute('data-layer-expand');
      if (!layerId) return;

      if (host.expandedLayers.has(layerId)) {
        host.expandedLayers.delete(layerId);
      } else {
        host.expandedLayers.add(layerId);
      }

      const group = btn.closest('.ui-layer-group');
      const chevron = btn.querySelector('.ui-chevron-icon');
      const isExp = host.expandedLayers.has(layerId);
      if (chevron) chevron.classList.toggle('open', isExp);
      if (group) {
        const children = group.querySelector('.ui-children-container') as HTMLElement | null;
        if (children) children.style.display = isExp ? 'block' : 'none';
      }

      host.salvarLembrancaEstado();
    });
  });

  // Olho (visibilidade) da camada (cirúrgico in-place 0ms)
  shadow.querySelectorAll('[data-layer-eye]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const layerId = btn.getAttribute('data-layer-eye');
      const layer = host.camadas.find((l) => l.id === layerId);
      if (layer) {
        layer.visible = layer.visible === false;
        const isVis = layer.visible !== false;
        btn.innerHTML = isVis ? ICONES.olhoAberto : ICONES.olhoFechado;
        definirRotuloControle(btn, isVis ? 'Ocultar Camada' : 'Exibir Camada');
        const row = btn.closest('.ui-layer-row');
        if (row) row.classList.toggle('hidden-layer', !isVis);
        atualizarIconeVisibilidadeGlobal(host, shadow);

        host.salvarLembrancaEstado();
        host.dispararEvento('ui-camada-visibilidade', {
          camadaId: layer.id,
          visivel: isVis
        });
      }
    });
  });

  // Bloqueio (trava) da camada
  shadow.querySelectorAll('[data-layer-lock]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const layerId = btn.getAttribute('data-layer-lock');
      const layer = host.camadas.find((l) => l.id === layerId);
      if (layer) {
        layer.locked = !layer.locked;
        btn.innerHTML = layer.locked ? ICONES.cadeadoTrancado : ICONES.cadeadoAberto;
        btn.classList.toggle('ui-lock-open', !layer.locked);
        definirRotuloControle(btn, layer.locked ? 'Desbloquear Camada' : 'Bloquear Camada');
        propagarBloqueioParaFeicoes(host, shadow, layer.id, layer.locked === true);
        host.salvarLembrancaEstado();
        host.dispararEvento('ui-camada-bloqueio', {
          camadaId: layer.id,
          bloqueado: layer.locked
        });
      }
    });
  });

  // Enquadrar (fit) camada
  shadow.querySelectorAll('[data-layer-fit]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const layerId = btn.getAttribute('data-layer-fit');
      if (layerId) {
        host.dispararEvento('ui-camada-enquadrar', { camadaId: layerId });
      }
    });
  });

  // Drawer de configurações da camada: Alternar abertura/fechamento
  shadow.querySelectorAll('[data-layer-settings]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const layerId = btn.getAttribute('data-layer-settings');
      host.activeSettingsLayerId = host.activeSettingsLayerId === layerId ? null : layerId;
      host.solicitarRenderizacao();
    });
  });

  // Fechar drawer de configurações pelo botão X
  shadow.querySelectorAll('[data-layer-settings-close]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      host.activeSettingsLayerId = null;
      host.solicitarRenderizacao();
    });
  });

  // Seletor de cor no drawer da camada (atualização cirúrgica em tempo real)
  const atualizarCorCamadaNoDOM = (layerId: string, novaCor: string, persistirAgora: boolean) => {
    const layer = host.camadas.find((l) => l.id === layerId);
    if (!layer) return;
    const corSegura = sanitizarCorCss(novaCor, layer.color || '#00E08A');
    layer.color = corSegura;

    const sample = shadow.getElementById(`sample-color-${layerId}`);
    if (sample) sample.style.backgroundColor = corSegura;

    const hexEl = shadow.getElementById(`hex-color-${layerId}`);
    if (hexEl) hexEl.textContent = corSegura.toUpperCase();

    const drawer = shadow.getElementById(`settings-drawer-${layerId}`);
    if (drawer) drawer.style.setProperty('--drawer-cor-camada', corSegura);

    const row = buscarPorAtributo(shadow, 'data-layer-row', layerId);
    if (row) {
      // A variável fica no grupo: a linha da camada e as suas feições herdam o destaque de seleção
      row.closest<HTMLElement>('.ui-layer-group')?.style.setProperty('--layer-active-color', corSegura);
      const bar = row.querySelector('.ui-col-colorbar') as HTMLElement;
      if (bar) bar.style.backgroundColor = corSegura;
    }

    if (persistirAgora) host.salvarLembrancaEstado();
    else host.agendarSalvarLembranca();
    host.dispararEvento('ui-camada-cor', { camadaId: layer.id, cor: corSegura });
  };

  shadow.querySelectorAll('[data-layer-color-picker]').forEach((picker) => {
    const p = picker as HTMLInputElement;
    const onColorChange = (persistirAgora: boolean) => (e: Event) => {
      const layerId = p.getAttribute('data-layer-color-picker');
      if (!layerId) return;
      const color = (e.target as HTMLInputElement).value;
      atualizarCorCamadaNoDOM(layerId, color, persistirAgora);
    };
    // 'input' dispara a cada movimento do seletor (grava com debounce); 'change' é o valor final
    p.addEventListener('input', onColorChange(false));
    p.addEventListener('change', onColorChange(true));
  });

  // Barra de cor da linha: abre o seletor de cor ao lado (prévia ao vivo; Cancelar restaura)
  shadow.querySelectorAll('[data-layer-color]').forEach((bar) => {
    const abrir = (e: Event) => {
      e.stopPropagation();
      const layerId = bar.getAttribute('data-layer-color');
      const layer = host.camadas.find((l) => l.id === layerId);
      if (!layerId || !layer) return;
      abrirSeletorCor({
        ancora: bar,
        titulo: `Cor · ${layer.name || 'Camada'}`,
        modo: 'simples',
        cor: sanitizarCorCss(layer.color, '#00E08A'),
        mostrarOpacidade: false,
        aoAlterar: (d) => atualizarCorCamadaNoDOM(layerId, d.cor, false),
        aoConfirmar: (d) => atualizarCorCamadaNoDOM(layerId, d.cor, true),
        aoCancelar: (d) => atualizarCorCamadaNoDOM(layerId, d.cor, true)
      });
    };
    bar.addEventListener('click', abrir);
    bar.addEventListener('keydown', (e) => {
      const k = (e as KeyboardEvent).key;
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        abrir(e);
      }
    });
  });

  // Slider de opacidade no drawer da camada (atualização cirúrgica em tempo real)
  const atualizarOpacidadeNoDOM = (layerId: string, val: number) => {
    const layer = host.camadas.find((l) => l.id === layerId);
    if (!layer) return;
    layer.opacity = val;

    const badge = shadow.getElementById(`badge-op-${layerId}`);
    if (badge) badge.textContent = `${Math.round(val * 100)}%`;

    const slider = buscarPorAtributo(shadow, 'data-layer-opacity-slider', layerId) as HTMLInputElement | null;
    if (slider && parseFloat(slider.value) !== val) slider.value = String(val);

    host.agendarSalvarLembranca();
    host.dispararEvento('ui-camada-opacidade', { camadaId: layer.id, opacidade: val });
  };

  shadow.querySelectorAll('[data-layer-opacity-slider]').forEach((slider) => {
    slider.addEventListener('input', (e) => {
      const layerId = slider.getAttribute('data-layer-opacity-slider');
      if (!layerId) return;
      const val = parseFloat((e.target as HTMLInputElement).value);
      atualizarOpacidadeNoDOM(layerId, val);
    });
  });

  // Botão excluir camada no drawer (com salvaguarda de confirmação em 2 passos)
  shadow.querySelectorAll('[data-delete-layer]').forEach((btn) => {
    let confirmTimeout: ReturnType<typeof setTimeout> | null = null;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const layerId = btn.getAttribute('data-delete-layer');
      if (!layerId) return;

      const isConfirming = btn.classList.contains('confirming');
      if (!isConfirming) {
        btn.classList.add('confirming');
        const label = btn.querySelector('.ui-btn-label');
        if (label) label.textContent = 'Confirmar Exclusão?';

        confirmTimeout = setTimeout(() => {
          btn.classList.remove('confirming');
          if (label) label.textContent = 'Excluir Camada';
        }, 3500);
      } else {
        if (confirmTimeout) clearTimeout(confirmTimeout);
        host.dispararEvento('ui-camada-excluida', { camadaId: layerId });
        const selecionadasAntes = host.selectedFeatureIds.size;
        // Promover subcamadas para raiz para evitar perda acidental de dados
        host.camadas.forEach((c) => {
          if (c.parentId === layerId) c.parentId = null;
        });
        host.removerCamada(layerId);
        if (host.selectedFeatureIds.size !== selecionadasAntes) host.notificarMudancaSelecao();
      }
    });
  });

  // Mudar grupo pai da camada no drawer de configurações
  shadow.querySelectorAll('[data-layer-parent-select]').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const selectEl = e.target as HTMLSelectElement;
      const layerId = selectEl.getAttribute('data-layer-parent-select');
      const novoParentId = selectEl.value || null;
      const layer = host.camadas.find((l) => l.id === layerId);
      if (layer) {
        layer.parentId = novoParentId;
        host.salvarLembrancaEstado();
        host.dispararEvento('ui-camada-mover-hierarquia', {
          camadaId: layer.id,
          novoParentId,
          camada: layer
        });
        host.solicitarRenderizacao();
      }
    });
  });

  // Adicionar subcamada dentro de uma camada
  shadow.querySelectorAll('[data-add-sublayer]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parentId = btn.getAttribute('data-add-sublayer');
      host.dispararEvento('ui-camada-adicionar', { parentId });
    });
  });

  // Target circle da camada (seleção em lote das feições da camada)
  shadow.querySelectorAll('[data-layer-target]').forEach((target) => {
    target.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const me = e as MouseEvent;
      const layerId = target.getAttribute('data-layer-target');
      const layerFeats = filtrarFeicoesPorBusca(
        host.feicoes.filter((f) => f.layerId === layerId),
        host.searchQuery
      );
      if (layerFeats.length === 0) return;

      const allSelected = layerFeats.every((f) => host.selectedFeatureIds.has(f.id));
      if (allSelected) {
        layerFeats.forEach((f) => host.selectedFeatureIds.delete(f.id));
      } else {
        if (!me.ctrlKey && !me.metaKey) host.selectedFeatureIds.clear();
        layerFeats.forEach((f) => host.selectedFeatureIds.add(f.id));
      }
      host.lastClickedFeatureId = layerFeats[layerFeats.length - 1].id;
      host.sincronizarSelecaoDOM();
      host.notificarMudancaSelecao();
    });
  });
}

/** Mantém o ícone do botão "ocultar/exibir todas" coerente com o estado individual das camadas */
function atualizarIconeVisibilidadeGlobal(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  const btn = shadow.getElementById('btn-toggle-all-vis');
  if (!btn) return;
  const todasVisiveis = host.camadas.every((l) => l.visible !== false);
  btn.innerHTML = todasVisiveis ? ICONES.olhoAberto : ICONES.olhoFechado;
  definirRotuloControle(btn, todasVisiveis ? 'Ocultar Todas as Camadas' : 'Exibir Todas as Camadas');
}

/** Reflete no DOM das feições o bloqueio herdado da camada (sem redesenhar a árvore) */
function propagarBloqueioParaFeicoes(
  host: CamadasHostCompleto,
  shadow: ShadowRoot,
  layerId: string,
  camadaTravada: boolean
): void {
  host.feicoes
    .filter((f) => f.layerId === layerId)
    .forEach((f) => {
      const el = buscarPorAtributo(shadow, 'data-feat-lock', f.id);
      if (!el) return;
      const travada = f.locked === true || camadaTravada;
      el.innerHTML = travada ? ICONES.cadeadoTrancado : ICONES.cadeadoAberto;
      el.classList.toggle('ui-lock-open', !travada);
      if (camadaTravada) el.setAttribute('data-locked-by-layer', 'true');
      else el.removeAttribute('data-locked-by-layer');
      definirRotuloControle(
        el,
        camadaTravada ? 'Bloqueada pela camada' : travada ? 'Desbloquear Feição' : 'Bloquear Feição'
      );
    });
}
