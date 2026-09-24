import { describe, it, expect, beforeEach } from 'vitest';
import './ui-alerta';
import { UIToast } from './ui-alerta';

describe('Web Component: <ui-alerta> & <ui-toast>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve disparar notificação toast de forma imperativa', () => {
    const toast = UIToast.notificar({
      tipo: 'sucesso',
      titulo: 'Sucesso',
      mensagem: 'Operação concluída',
      duracao: 0
    });

    expect(toast).toBeInstanceOf(HTMLElement);
    expect(toast.getAttribute('tipo')).toBe('sucesso');
    expect(toast.getAttribute('titulo')).toBe('Sucesso');
  });

  it('deve preservar o elemento slot mesmo quando o atributo mensagem for definido ou alterado', () => {
    const alerta = document.createElement('ui-alerta');
    const childSpan = document.createElement('span');
    childSpan.textContent = 'Conteúdo do Slot';
    alerta.appendChild(childSpan);

    alerta.setAttribute('mensagem', 'Texto da mensagem');
    document.body.appendChild(alerta);

    const slot = alerta.shadowRoot?.querySelector('slot');
    expect(slot).not.toBeNull();

    const msgSpan = alerta.shadowRoot?.querySelector('.ui-alerta__mensagem-texto') as HTMLElement;
    expect(msgSpan.textContent).toBe('Texto da mensagem');
    expect(msgSpan.style.display).toBe('inline');

    // Remove mensagem
    alerta.removeAttribute('mensagem');
    expect(msgSpan.style.display).toBe('none');
    expect(alerta.shadowRoot?.querySelector('slot')).not.toBeNull();
  });

  it('deve exibir botão de ação no toast e executar callback ao ser clicado', () => {
    let acaoExecutada = false;
    let eventoDisparado = false;

    document.addEventListener('ui-toast-acao', () => {
      eventoDisparado = true;
    }, { once: true });

    const toast = UIToast.notificar({
      tipo: 'sucesso',
      titulo: 'Exclusão',
      mensagem: 'Item removido',
      duracao: 5000,
      acao: {
        rotulo: 'Desfazer',
        onClick: () => {
          acaoExecutada = true;
        }
      }
    });

    const acoesContainer = toast.shadowRoot?.querySelector('.ui-alerta__acoes') as HTMLElement;
    const btnAcao = toast.shadowRoot?.querySelector('.ui-alerta__botao-acao') as HTMLButtonElement;
    const progressoContainer = toast.shadowRoot?.querySelector('.ui-toast__progresso') as HTMLElement;

    expect(acoesContainer.style.display).toBe('flex');
    expect(btnAcao.textContent).toBe('Desfazer');
    expect(progressoContainer.style.display).toBe('block');

    // Clica no botão de ação
    btnAcao.click();

    expect(acaoExecutada).toBe(true);
    expect(eventoDisparado).toBe(true);
  });

  it('deve ocultar barra de progresso quando a duração for zero', () => {
    const toast = UIToast.notificar({
      tipo: 'info',
      mensagem: 'Toast persistente',
      duracao: 0
    });

    const progressoContainer = toast.shadowRoot?.querySelector('.ui-toast__progresso') as HTMLElement;
    expect(progressoContainer.style.display).toBe('none');
  });

  it('deve remover o container de toasts do DOM após fechar o último toast', () => {
    const toast = UIToast.notificar({
      tipo: 'alerta',
      mensagem: 'Teste de limpeza',
      duracao: 0,
      posicao: 'top-right'
    });

    const containerId = 'ui-toast-container-top-right';
    expect(document.getElementById(containerId)).not.toBeNull();

    // Fecha o toast
    toast.fechar();

    // O container deve ter sido removido do DOM
    expect(document.getElementById(containerId)).toBeNull();
  });
});
