/* ====================================================
   UI Camadas - Teclado e Acessibilidade
   Escape, ativação por Enter/Espaço dos controles-ícone e
   navegação por setas entre as linhas da árvore (roving tabindex)
   ==================================================== */

import { ListenerBag } from '../../core/listener-bag';
import { focoEmCampoDeTexto } from '../../core/alvo-digitavel';
import { CamadasHostCompleto } from './camadas-host';
import { buscarPorAtributo } from './camadas-utils';
import { obterIdsVisiveisFeicoes } from './camadas-selecao';

const SEL_CONTROLES = '[role="button"][tabindex]';
const SEL_LINHAS = '[data-layer-row], [data-feat-row]';
const TIPOS_INPUT_NAO_TEXTUAIS = ['color', 'range', 'checkbox', 'radio', 'button'];

/**
 * Campos onde o usuário digita: Esc e as demais teclas pertencem ao campo, não ao painel.
 * Usa composedPath porque, ouvindo no host, `event.target` é reapontado para o próprio host.
 */
function ehCampoDeTexto(el: EventTarget | undefined): boolean {
  if (!el || !(el instanceof Element)) return false;
  if (el instanceof HTMLInputElement && TIPOS_INPUT_NAO_TEXTUAIS.includes(el.type)) return false;
  return focoEmCampoDeTexto({ composedPath: () => [el] } as unknown as Event);
}

function linhasNavegaveis(corpo: HTMLElement): HTMLElement[] {
  return Array.from(corpo.querySelectorAll<HTMLElement>(SEL_LINHAS)).filter((linha) => {
    const filhos = linha.closest<HTMLElement>('.ui-children-container');
    return !(filhos && filhos.style.display === 'none') && !linha.classList.contains('ui-search-hidden');
  });
}

function focarLinha(corpo: HTMLElement, alvo: HTMLElement | undefined): void {
  if (!alvo) return;
  corpo.querySelectorAll<HTMLElement>(SEL_LINHAS).forEach((l) => l.setAttribute('tabindex', '-1'));
  alvo.setAttribute('tabindex', '0');
  alvo.focus();
}

function ativarLinha(linha: HTMLElement, e: KeyboardEvent): void {
  linha.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      ctrlKey: e.ctrlKey || e.metaKey,
      shiftKey: e.shiftKey
    })
  );
}

function aoPressionarEscape(host: CamadasHostCompleto, shadow: ShadowRoot, e: KeyboardEvent): void {
  if (ehCampoDeTexto(e.composedPath()[0])) return;

  // Cancela confirmação pendente de exclusão do rodapé ou drawer
  const delBtn = shadow.querySelector('.confirming') as HTMLElement | null;
  if (delBtn) {
    e.preventDefault();
    delBtn.classList.remove('confirming');
    return;
  }

  if (host.activeSettingsLayerId) {
    e.preventDefault();
    const layerId = host.activeSettingsLayerId;
    host.activeSettingsLayerId = null;
    host.solicitarRenderizacao();
    // Devolve o foco ao botão de configurações que abriu o drawer
    buscarPorAtributo(shadow, 'data-layer-settings', layerId)?.focus();
    return;
  }

  if (host.selectedFeatureIds.size > 0) {
    e.preventDefault();
    host.limparSelecao(true);
  }
}

function aoPressionarTeclaNoCorpo(
  host: CamadasHostCompleto,
  corpo: HTMLElement,
  shadow: ShadowRoot,
  e: KeyboardEvent
): void {
  const alvo = e.composedPath()[0];
  if (!(alvo instanceof HTMLElement) || ehCampoDeTexto(alvo)) return;

  // Controles-ícone (olho, cadeado, chevron, target, cards de mapa base) ativam com Enter/Espaço
  if ((e.key === 'Enter' || e.key === ' ') && alvo.matches(SEL_CONTROLES)) {
    e.preventDefault();
    alvo.click();
    return;
  }

  if (!alvo.matches(SEL_LINHAS)) return;
  const linhas = linhasNavegaveis(corpo);
  const idx = linhas.indexOf(alvo);

  // Atalho F2: renomeação inline na linha focada
  if (e.key === 'F2') {
    e.preventDefault();
    const layerId = alvo.getAttribute('data-layer-row');
    const featId = alvo.getAttribute('data-feat-row');
    const trigger = layerId
      ? buscarPorAtributo(alvo, 'data-layer-name-trigger', layerId)
      : featId
      ? buscarPorAtributo(alvo, 'data-feat-name-trigger', featId)
      : null;
    if (trigger) {
      trigger.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }
    return;
  }

  // Atalho Ctrl+A / Cmd+A: seleciona todas as feições visíveis
  if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
    e.preventDefault();
    const visiveis = obterIdsVisiveisFeicoes(
      host.camadas,
      host.feicoes,
      host.expandedLayers,
      host.searchQuery,
      undefined,
      host.expandedFeatureLimits
    );
    if (visiveis.length > 0) {
      host.selecionarFeicoes(visiveis, true);
    }
    return;
  }

  // Atalho Delete: aciona exclusão coletiva se houver feições selecionadas
  if (e.key === 'Delete') {
    const btnDel = shadow.getElementById('btn-footer-del');
    if (btnDel && !btnDel.hasAttribute('disabled') && host.selectedFeatureIds.size > 0) {
      e.preventDefault();
      btnDel.click();
      return;
    }
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      focarLinha(corpo, linhas[Math.min(linhas.length - 1, idx + 1)]);
      break;
    case 'ArrowUp':
      e.preventDefault();
      focarLinha(corpo, linhas[Math.max(0, idx - 1)]);
      break;
    case 'Home':
      e.preventDefault();
      focarLinha(corpo, linhas[0]);
      break;
    case 'End':
      e.preventDefault();
      focarLinha(corpo, linhas[linhas.length - 1]);
      break;
    case 'ArrowRight':
    case 'ArrowLeft': {
      const layerId = alvo.getAttribute('data-layer-row');
      if (!layerId) return;
      const grupo = alvo.closest('.ui-layer-group');
      const expandida = grupo?.getAttribute('aria-expanded') === 'true';
      if ((e.key === 'ArrowRight') !== expandida) {
        e.preventDefault();
        buscarPorAtributo(shadow, 'data-layer-expand', layerId)?.click();
      }
      break;
    }
    case 'Enter':
    case ' ':
      e.preventDefault();
      ativarLinha(alvo, e);
      break;
  }
}

export function conectarTecladoEAcessibilidade(
  host: CamadasHostCompleto,
  hostElement: HTMLElement,
  shadow: ShadowRoot,
  corpo: HTMLElement,
  listeners: ListenerBag
): void {
  listeners.add(hostElement, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') aoPressionarEscape(host, shadow, e);
  });

  listeners.add(corpo, 'keydown', (e: KeyboardEvent) => aoPressionarTeclaNoCorpo(host, corpo, shadow, e));

  // Mantém exatamente uma linha na ordem de Tab: a que recebeu o foco por último
  listeners.add(corpo, 'focusin', (e: FocusEvent) => {
    const alvo = e.composedPath()[0];
    if (alvo instanceof HTMLElement && alvo.matches(SEL_LINHAS)) {
      corpo.querySelectorAll<HTMLElement>(SEL_LINHAS).forEach((l) => l.setAttribute('tabindex', '-1'));
      alvo.setAttribute('tabindex', '0');
    }
  });
}
