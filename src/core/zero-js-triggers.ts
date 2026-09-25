/* ====================================================
   Zero-JS Triggers - Ações Declarativas Inteligentes
   Permite acionar modais, toasts, cópia e ações
   diretamente por atributos HTML sem código script.
   ==================================================== */

import { UIBus } from './ui-bus';

let _inicializado = false;

export function initZeroJSTriggers(): void {
  if (_inicializado || typeof document === 'undefined') return;
  _inicializado = true;

  document.addEventListener('click', (evento: MouseEvent) => {
    const path = evento.composedPath ? evento.composedPath() : [evento.target];
    const triggerSelector = '[target-modal], [modal-alvo], [dismiss-modal], [fechar-modal], [target-drawer], [drawer-alvo], [dismiss-drawer], [fechar-drawer], [toast-sucesso], [toast-erro], [toast-alerta], [toast-info], [copiar-texto], [alternar-tema], [definir-densidade], [limpar-form]';

    let elementoGatilho: HTMLElement | null = null;
    for (const target of path) {
      if (target instanceof HTMLElement && target.matches(triggerSelector)) {
        elementoGatilho = target;
        break;
      }
    }

    if (!elementoGatilho) return;

    // 1. Abrir Modal Declarativo
    const targetModal = elementoGatilho.getAttribute('target-modal') || elementoGatilho.getAttribute('modal-alvo');
    if (targetModal) {
      UIBus.abrirModal(targetModal);
    }

    // 2. Fechar Modal Declarativo
    if (elementoGatilho.hasAttribute('dismiss-modal') || elementoGatilho.hasAttribute('fechar-modal')) {
      const modalAlvoEspecifico = elementoGatilho.getAttribute('dismiss-modal') || elementoGatilho.getAttribute('fechar-modal');
      if (modalAlvoEspecifico && modalAlvoEspecifico !== '') {
        UIBus.fecharModal(modalAlvoEspecifico);
      } else {
        // Encontra o modal pai mais próximo no caminho de composição
        let modalPai: any = null;
        for (const node of path) {
          if (node instanceof HTMLElement && (node.matches('ui-modal, ui-dialog') || node.tagName === 'UI-MODAL' || node.tagName === 'UI-DIALOG')) {
            modalPai = node;
            break;
          }
        }
        if (modalPai) {
          if (typeof modalPai.fechar === 'function') {
            modalPai.fechar();
          } else {
            modalPai.removeAttribute('aberto');
            modalPai.removeAttribute('open');
          }
        }
      }
    }

    // 3. Abrir Drawer Declarativo
    const targetDrawer = elementoGatilho.getAttribute('target-drawer') || elementoGatilho.getAttribute('drawer-alvo');
    if (targetDrawer) {
      UIBus.abrirDrawer(targetDrawer);
    }

    // 4. Fechar Drawer Declarativo
    if (elementoGatilho.hasAttribute('dismiss-drawer') || elementoGatilho.hasAttribute('fechar-drawer')) {
      const drawerAlvoEspecifico = elementoGatilho.getAttribute('dismiss-drawer') || elementoGatilho.getAttribute('fechar-drawer');
      if (drawerAlvoEspecifico && drawerAlvoEspecifico !== '') {
        UIBus.fecharDrawer(drawerAlvoEspecifico);
      } else {
        let drawerPai: any = null;
        for (const node of path) {
          if (node instanceof HTMLElement && (node.matches('ui-drawer, ui-sheet, ui-painel-lateral, ui-gaveta') || node.tagName.startsWith('UI-DRAWER') || node.tagName.startsWith('UI-SHEET'))) {
            drawerPai = node;
            break;
          }
        }
        if (drawerPai) {
          if (typeof drawerPai.fechar === 'function') {
            drawerPai.fechar();
          } else {
            drawerPai.removeAttribute('aberto');
            drawerPai.removeAttribute('open');
          }
        }
      }
    }

    // 3. Notificações Toast Declarativas
    const toastSucesso = elementoGatilho.getAttribute('toast-sucesso');
    if (toastSucesso) {
      UIBus.notificar({ tipo: 'sucesso', mensagem: toastSucesso });
    }

    const toastErro = elementoGatilho.getAttribute('toast-erro');
    if (toastErro) {
      UIBus.notificar({ tipo: 'erro', mensagem: toastErro });
    }

    const toastAlerta = elementoGatilho.getAttribute('toast-alerta');
    if (toastAlerta) {
      UIBus.notificar({ tipo: 'alerta', mensagem: toastAlerta });
    }

    const toastInfo = elementoGatilho.getAttribute('toast-info');
    if (toastInfo) {
      UIBus.notificar({ tipo: 'info', mensagem: toastInfo });
    }

    // 4. Copiar Texto para Área de Transferência
    const copiarTexto = elementoGatilho.getAttribute('copiar-texto');
    if (copiarTexto !== null) {
      let textoParaCopiar = copiarTexto;
      // Tenta buscar por seletor se começar com id (#) ou classe (.), ou buscar por ID direto
      if (copiarTexto.startsWith('#') || copiarTexto.startsWith('.') || copiarTexto.match(/^[a-zA-Z0-9_-]+$/)) {
        try {
          let elementoOrigem: any = null;
          if (copiarTexto.startsWith('#') || copiarTexto.startsWith('.')) {
            elementoOrigem = document.querySelector(copiarTexto);
          } else {
            elementoOrigem = document.getElementById(copiarTexto) || document.querySelector(`#${copiarTexto}`);
          }

          if (elementoOrigem) {
            textoParaCopiar = elementoOrigem.value !== undefined && elementoOrigem.value !== null
              ? elementoOrigem.value
              : (elementoOrigem.textContent || '');
          }
        } catch (_err) {
          // Seletor CSS inválido - se falhar no querySelector, mantém o texto literal original
        }
      }
      const msgFeedback = elementoGatilho.getAttribute('copiar-mensagem') || 'Copiado com sucesso!';
      UIBus.copiar(textoParaCopiar, msgFeedback);
    }

    // 5. Alternar Tema
    if (elementoGatilho.hasAttribute('alternar-tema')) {
      UIBus.definirTema();
    }

    // 6. Definir Densidade
    const densidade = elementoGatilho.getAttribute('definir-densidade');
    if (densidade) {
      UIBus.definirDensidade(densidade as any);
    }

    // 7. Limpar Formulário
    const formId = elementoGatilho.getAttribute('limpar-form');
    if (formId) {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (form && typeof form.reset === 'function') {
        form.reset();
        UIBus.notificar({ tipo: 'info', mensagem: 'Formulário limpo.' });
      }
    }
  });
}
