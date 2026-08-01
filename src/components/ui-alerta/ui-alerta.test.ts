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
});
