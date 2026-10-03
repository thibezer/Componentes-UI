/* ====================================================
   UI Camadas - Eventos das Linhas de Camada
   Seleção, expansão, visibilidade, trava, drawer de
   configurações (cor, opacidade, exclusão) e target
   ==================================================== */

import { CamadasHostCompleto } from './camadas-host';
import { ICONES } from './camadas-icones';
import { sanitizarCorCss } from './camadas-utils';

export function conectarEventosCamadas(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  // 5. Linhas de Camadas
  shadow.querySelectorAll('[data-layer-row]').forEach((row) => {
    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          '[data-layer-eye], [data-layer-lock], [data-layer-expand], [data-layer-target], [data-layer-fit], [data-layer-settings], input, button'
        )
      ) {
        return;
      }
      const layerId = row.getAttribute('data-layer-row');
      if (layerId) {
        host.definirCamadaAtiva(layerId);
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
        btn.setAttribute('title', isVis ? 'Ocultar Camada' : 'Exibir Camada');
        const row = btn.closest('.ui-layer-row');
        if (row) row.classList.toggle('hidden-layer', !isVis);

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
        btn.innerHTML = layer.locked ? ICONES.cadeadoTrancado : '';
        btn.setAttribute('title', layer.locked ? 'Desbloquear Camada' : 'Bloquear Camada');
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
  const atualizarCorCamadaNoDOM = (layerId: string, novaCor: string) => {
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

    const row = shadow.querySelector(`[data-layer-row="${layerId}"]`) as HTMLElement;
    if (row) {
      row.style.setProperty('--layer-active-color', corSegura);
      const bar = row.querySelector('.ui-col-colorbar') as HTMLElement;
      if (bar) bar.style.backgroundColor = corSegura;
    }

    host.salvarLembrancaEstado();
    host.dispararEvento('ui-camada-cor', { camadaId: layer.id, cor: corSegura });
  };

  shadow.querySelectorAll('[data-layer-color-picker]').forEach((picker) => {
    const p = picker as HTMLInputElement;
    const onColorChange = (e: Event) => {
      const layerId = p.getAttribute('data-layer-color-picker');
      if (!layerId) return;
      const color = (e.target as HTMLInputElement).value;
      atualizarCorCamadaNoDOM(layerId, color);
    };
    p.addEventListener('input', onColorChange);
    p.addEventListener('change', onColorChange);
  });

  // Slider de opacidade no drawer da camada (atualização cirúrgica em tempo real)
  const atualizarOpacidadeNoDOM = (layerId: string, val: number) => {
    const layer = host.camadas.find((l) => l.id === layerId);
    if (!layer) return;
    layer.opacity = val;

    const badge = shadow.getElementById(`badge-op-${layerId}`);
    if (badge) badge.textContent = `${Math.round(val * 100)}%`;

    const slider = shadow.querySelector(`[data-layer-opacity-slider="${layerId}"]`) as HTMLInputElement;
    if (slider && parseFloat(slider.value) !== val) slider.value = String(val);

    host.salvarLembrancaEstado();
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
        host.removerCamada(layerId);
      }
    });
  });

  // Target circle da camada (seleção em lote das feições da camada)
  shadow.querySelectorAll('[data-layer-target]').forEach((target) => {
    target.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const me = e as MouseEvent;
      const layerId = target.getAttribute('data-layer-target');
      const layerFeats = host.feicoes.filter((f) => f.layerId === layerId);
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
