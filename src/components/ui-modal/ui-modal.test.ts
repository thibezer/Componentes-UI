import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-modal';
import { UIBus } from '../../core/ui-bus';
import fs from 'fs';
import path from 'path';

describe('UIModal', () => {
  let modal1: any;
  let modal2: any;

  beforeEach(() => {
    modal1 = document.createElement('ui-modal');
    modal2 = document.createElement('ui-modal');
    document.body.appendChild(modal1);
    document.body.appendChild(modal2);
  });

  afterEach(() => {
    if (document.body.contains(modal1)) document.body.removeChild(modal1);
    if (document.body.contains(modal2)) document.body.removeChild(modal2);
    document.body.style.overflow = '';
  });

  it('should prevent body scroll when open and restore when closed', () => {
    modal1.abrir();
    expect(document.body.style.overflow).toBe('hidden');

    modal1.fechar();
    expect(document.body.style.overflow).toBe('');
  });

  it('should restore body scroll if modal is destroyed while open', () => {
    modal1.abrir();
    expect(document.body.style.overflow).toBe('hidden');

    document.body.removeChild(modal1);
    expect(document.body.style.overflow).toBe('');
  });

  it('should restore focus to the trigger element when closed', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    expect(document.activeElement).toBe(button);

    modal1.abrir();

    // allow async focus logic to resolve
    await new Promise(r => setTimeout(r, 10));

    // After closing, focus should return to button
    modal1.fechar();
    expect(document.activeElement).toBe(button);

    document.body.removeChild(button);
  });

  it('should trap focus within the modal when Tab is pressed', async () => {
    modal1.innerHTML = `
      <button id="btn1">1</button>
      <button id="btn2">2</button>
    `;
    modal1.abrir();

    await new Promise(r => setTimeout(r, 10));

    const btn2 = modal1.querySelector('#btn2');

    // In unit testing, true focus cycling requires manual simulation
    // We'll test that the handler traps the tab key

    btn2.focus(); // Simulate reaching the end of the focusables

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    modal1.dispatchEvent(event);

    // Event was captured by handleKeyDown and default was prevented
    expect(event.defaultPrevented).toBe(true);

    // In Happy DOM we can't fully simulate the native Tab focus shift,
    // but we can check if it focused the first element as trapped
    expect(document.activeElement).toBe(modal1);

    // The first focable in our modal is the close button in the shadow DOM
    const closeBtn = modal1.shadowRoot.querySelector('.ui-modal__close');
    expect(modal1.shadowRoot.activeElement).toBe(closeBtn);
  });

  it('should close only the topmost modal when Escape is pressed', () => {
    modal1.abrir();
    modal2.abrir();

    expect(modal1.aberto).toBe(true);
    expect(modal2.aberto).toBe(true);

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    // Dispatch the event globally
    window.dispatchEvent(event);

    // With the _isTopMostModal logic, only modal2 (the last one appended and opened)
    // should process the Escape key. Modal1 will ignore it.

    expect(modal1.aberto).toBe(true); // Modal 1 stays open
    expect(modal2.aberto).toBe(false); // Modal 2 (topmost) closes
  });

  it('deve associar semanticamente o diálogo ao título via aria-labelledby e id único', () => {
    modal1.setAttribute('titulo', 'Confirmar Exclusão');
    const dialog = modal1.shadowRoot.querySelector('.ui-modal__dialog');
    const titulo = modal1.shadowRoot.querySelector('.ui-modal__titulo');

    expect(titulo.id).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(titulo.textContent).toBe('Confirmar Exclusão');
  });

  it('deve respeitar aria-label diretamente se fornecido', () => {
    modal1.setAttribute('aria-label', 'Janela de Ajuda Rápida');
    const dialog = modal1.shadowRoot.querySelector('.ui-modal__dialog');

    expect(dialog.getAttribute('aria-label')).toBe('Janela de Ajuda Rápida');
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('deve tornar o conteúdo atrás do modal inerte (inert) ao abrir e restaurar ao fechar', () => {
    const mainContent = document.createElement('main');
    mainContent.innerHTML = '<button id="btn-fundo">Clique-me</button>';
    document.body.appendChild(mainContent);

    expect(mainContent.hasAttribute('inert')).toBe(false);

    // Abre o modal
    modal1.abrir();
    expect(mainContent.hasAttribute('inert')).toBe(true);

    // Fecha o modal
    modal1.fechar();
    expect(mainContent.hasAttribute('inert')).toBe(false);

    document.body.removeChild(mainContent);
  });

  describe('abertura e fechamento pelo atributo', () => {
    it('deve emitir ui-abrir e ui-fechar uma única vez por transição, por método ou atributo', () => {
      const eventos: string[] = [];
      modal1.addEventListener('ui-abrir', () => eventos.push('abrir'));
      modal1.addEventListener('ui-fechar', () => eventos.push('fechar'));

      modal1.setAttribute('aberto', '');
      modal1.setAttribute('aberto', '');
      modal1.removeAttribute('aberto');
      modal1.abrir();
      modal1.fechar();
      modal1.fechar();

      expect(eventos).toEqual(['abrir', 'fechar', 'abrir', 'fechar']);
    });

    it('deve aplicar inert e bloqueio de rolagem quando aberto pelo atributo', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      modal1.setAttribute('open', '');
      expect(main.hasAttribute('inert')).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');

      modal1.removeAttribute('open');
      expect(main.hasAttribute('inert')).toBe(false);
      expect(document.body.style.overflow).toBe('');

      main.remove();
    });

    it('deve devolver o foco ao gatilho quando fechado pelo atributo', async () => {
      const gatilho = document.createElement('button');
      document.body.appendChild(gatilho);
      gatilho.focus();

      modal1.setAttribute('aberto', '');
      await new Promise(r => setTimeout(r, 10));
      modal1.removeAttribute('aberto');

      expect(document.activeElement).toBe(gatilho);
      gatilho.remove();
    });

    it('deve aplicar o estado aberto ao ser conectado já com o atributo', () => {
      const modal = document.createElement('ui-modal') as any;
      const aoAbrir = vi.fn();
      modal.addEventListener('ui-abrir', aoAbrir);
      modal.setAttribute('aberto', '');
      expect(aoAbrir).not.toHaveBeenCalled();

      document.body.appendChild(modal);
      expect(aoAbrir).toHaveBeenCalledTimes(1);
      expect(document.body.style.overflow).toBe('hidden');

      modal.remove();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('foco inicial', () => {
    it('deve focar o primeiro controle do conteúdo, e não o botão fechar', async () => {
      modal1.innerHTML = '<input id="nome"><button slot="rodape" id="ok">OK</button>';
      modal1.abrir();
      await new Promise(r => setTimeout(r, 10));

      expect(document.activeElement).toBe(modal1.querySelector('#nome'));
    });

    it('deve priorizar o elemento com [autofocus]', async () => {
      modal1.innerHTML = '<input id="nome"><button slot="rodape" id="ok" autofocus>OK</button>';
      modal1.abrir();
      await new Promise(r => setTimeout(r, 10));

      expect(document.activeElement).toBe(modal1.querySelector('#ok'));
    });

    it('sem controles no conteúdo, deve focar o próprio diálogo', async () => {
      modal1.innerHTML = '<p>Somente leitura</p>';
      modal1.abrir();
      await new Promise(r => setTimeout(r, 10));

      expect(modal1.shadowRoot.activeElement).toBe(modal1.shadowRoot.querySelector('.ui-modal__dialog'));
    });
  });

  describe('bloquear-fechamento', () => {
    it('deve manter o modal aberto, ocultar o botão fechar e não anunciar fechamento no UIBus', () => {
      modal1.id = 'modal-bloqueado';
      modal1.setAttribute('bloquear-fechamento', '');
      modal1.abrir();

      const ouvinte = vi.fn();
      const cancelar = UIBus.on('modal:fechado', ouvinte);

      expect(UIBus.fecharModal('modal-bloqueado')).toBe(false);
      expect(modal1.aberto).toBe(true);
      expect(ouvinte).not.toHaveBeenCalled();

      // O happy-dom não calcula estilos do Shadow DOM: verifica a regra no CSS
      const css = fs.readFileSync(path.resolve(__dirname, './ui-modal.css'), 'utf-8');
      expect(css).toMatch(/:host\(\[bloquear-fechamento\]\) \.ui-modal__close \{\s*display: none;/);

      cancelar();
      modal1.removeAttribute('bloquear-fechamento');
      expect(UIBus.fecharModal('modal-bloqueado')).toBe(true);
      expect(modal1.aberto).toBe(false);
    });
  });

  describe('modais empilhados', () => {
    it('o segundo modal aberto (irmão do primeiro) deve continuar interativo', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      modal1.abrir();
      expect(modal2.hasAttribute('inert')).toBe(true);

      modal2.abrir();
      expect(modal2.hasAttribute('inert')).toBe(false);
      expect(modal1.hasAttribute('inert')).toBe(true);
      expect(main.hasAttribute('inert')).toBe(true);

      modal2.fechar();
      expect(modal1.hasAttribute('inert')).toBe(false);
      expect(main.hasAttribute('inert')).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');

      modal1.fechar();
      expect(main.hasAttribute('inert')).toBe(false);
      expect(modal2.hasAttribute('inert')).toBe(false);
      expect(document.body.style.overflow).toBe('');

      main.remove();
    });

    it('Escape deve fechar o último modal aberto, independentemente da ordem no DOM', () => {
      modal2.abrir();
      modal1.abrir();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

      expect(modal1.aberto).toBe(false);
      expect(modal2.aberto).toBe(true);
      modal2.fechar();
    });
  });
});
