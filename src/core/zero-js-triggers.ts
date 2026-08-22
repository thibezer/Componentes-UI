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
    const alvo = evento.target as HTMLElement | null;
    if (!alvo) return;

    // Procura o elemento com o atributo ou seu ancestral mais próximo
    const elementoGatilho = alvo.closest<HTMLElement>(
      '[target-modal], [modal-alvo], [dismiss-modal], [fechar-modal], [toast-sucesso], [toast-erro], [toast-alerta], [toast-info], [copiar-texto], [alternar-tema], [definir-densidade], [limpar-form]'
    );

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
        // Encontra o modal pai mais próximo
        const modalPai = elementoGatilho.closest('ui-modal, ui-dialog') as any;
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
      // Se começa com # ou ., tenta buscar o valor ou textContent do elemento referenciado
      if (copiarTexto.startsWith('#') || copiarTexto.startsWith('.')) {
        const elementoOrigem = document.querySelector(copiarTexto) as any;
        if (elementoOrigem) {
          textoParaCopiar = elementoOrigem.value !== undefined ? elementoOrigem.value : (elementoOrigem.textContent || '');
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
