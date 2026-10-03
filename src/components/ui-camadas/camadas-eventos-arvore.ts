/* ====================================================
   UI Camadas - Eventos da Árvore
   Conecta os handlers de toolbar, busca, camadas, feições
   e mapas base ao DOM renderizado pelo painel
   ==================================================== */

import { CamadasHostCompleto } from './camadas-host';
import { ICONES } from './camadas-icones';
import { debounce } from './camadas-utils';
import { conectarEventosCamadas } from './camadas-eventos-camadas';
import { conectarEventosRodape } from './camadas-eventos-rodape';

function conectarToolbarEBusca(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  // 1. Visibilidade de todas as camadas
  const btnToggleAllVis = shadow.getElementById('btn-toggle-all-vis');
  if (btnToggleAllVis) {
    btnToggleAllVis.addEventListener('click', () => host.alternarVisibilidadeTodas());
  }

  // 2. Expandir/recolher todas
  const btnToggleAllExp = shadow.getElementById('btn-toggle-all-expand');
  if (btnToggleAllExp) {
    btnToggleAllExp.addEventListener('click', (e) => {
      e.stopPropagation();
      const allExp =
        host.camadas.length > 0 && host.camadas.every((l) => host.expandedLayers.has(l.id));
      if (allExp) {
        host.colapsarTodas();
      } else {
        host.expandirTodas();
      }
    });
  }

  // 3. Botão + Camada
  const btnAddLayer = shadow.getElementById('btn-add-layer');
  if (btnAddLayer) {
    btnAddLayer.addEventListener('click', () => {
      host.dispararEvento('ui-camada-adicionar', {});
    });
  }

  // 4. Busca rápida
  const inputSearch = shadow.getElementById('input-layer-search') as HTMLInputElement | null;
  const btnClearSearch = shadow.getElementById('btn-clear-layer-search');

  if (inputSearch) {
    const executarBuscaDebounced = debounce((q: string) => {
      host.aplicarFiltroBuscaDOM(q);
    }, 75);

    inputSearch.addEventListener('input', (e) => {
      host.searchQuery = (e.target as HTMLInputElement).value;
      executarBuscaDebounced(host.searchQuery);
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      host.searchQuery = '';
      if (inputSearch) inputSearch.value = '';
      host.aplicarFiltroBuscaDOM('');
      if (inputSearch) inputSearch.focus();
    });
  }
}

function conectarEventosFeicoes(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  // 6. Linhas de Feições
  shadow.querySelectorAll('[data-feat-select]').forEach((node) => {
    node.addEventListener('click', (e: Event) => {
      if (host.editingFeatureId) return;
      const me = e as MouseEvent;
      const target = me.target as HTMLElement;
      if (
        target.closest(
          '[data-feat-eye], [data-feat-lock], [data-feat-fit], [data-feat-target], input, button'
        )
      ) {
        return;
      }
      const featId = node.getAttribute('data-feat-select');
      if (!featId) return;

      host.selecionarFeicao(featId, me.ctrlKey || me.metaKey, me.shiftKey);
    });
  });

  // Target circle da feição
  shadow.querySelectorAll('[data-feat-target]').forEach((target) => {
    target.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const me = e as MouseEvent;
      const featId = target.getAttribute('data-feat-target');
      if (featId) {
        host.selecionarFeicao(featId, me.ctrlKey || me.metaKey, me.shiftKey);
      }
    });
  });

  // Olho (visibilidade) da feição (cirúrgico in-place 0ms)
  shadow.querySelectorAll('[data-feat-eye]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const featId = btn.getAttribute('data-feat-eye');
      const feat = host.feicoes.find((f) => f.id === featId);
      if (feat) {
        feat.visible = feat.visible === false;
        const isVis = feat.visible !== false;
        btn.innerHTML = isVis ? ICONES.olhoAberto : ICONES.olhoFechado;
        btn.setAttribute('title', isVis ? 'Ocultar Feição' : 'Exibir Feição');
        const row = btn.closest('.ui-feat-row');
        if (row) row.classList.toggle('hidden-row', !isVis);

        host.dispararEvento('ui-feicao-visibilidade', {
          feicaoId: feat.id,
          visivel: isVis
        });
      }
    });
  });

  // Bloqueio da feição
  shadow.querySelectorAll('[data-feat-lock]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const featId = btn.getAttribute('data-feat-lock');
      const feat = host.feicoes.find((f) => f.id === featId);
      if (feat) {
        feat.locked = !feat.locked;
        btn.innerHTML = feat.locked ? ICONES.cadeadoTrancado : '';
        btn.setAttribute('title', feat.locked ? 'Desbloquear Feição' : 'Bloquear Feição');
        host.dispararEvento('ui-feicao-bloqueio', {
          feicaoId: feat.id,
          bloqueado: feat.locked
        });
      }
    });
  });

  // Enquadrar feição
  shadow.querySelectorAll('[data-feat-fit]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const featId = btn.getAttribute('data-feat-fit');
      if (featId) {
        host.dispararEvento('ui-feicao-enquadrar', { feicaoId: featId });
      }
    });
  });
}

function conectarEventosMapasBase(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  shadow.querySelectorAll('[data-basemap-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const basemapId = card.getAttribute('data-basemap-id');
      if (basemapId) host.selecionarMapaBase(basemapId);
    });
  });
}

export function conectarEventosArvore(host: CamadasHostCompleto, shadow: ShadowRoot): void {
  conectarToolbarEBusca(host, shadow);
  conectarEventosCamadas(host, shadow);
  conectarEventosFeicoes(host, shadow);
  conectarEventosMapasBase(host, shadow);
  conectarEventosRodape(host, shadow);
}
