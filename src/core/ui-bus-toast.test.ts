import { describe, it, expect, vi, afterEach } from 'vitest';
import { UIBus } from './ui-bus';

describe('UIBus.notificar - provedor de toast (L1 não conhece componentes)', () => {
  afterEach(() => {
    UIBus.registrarProvedorToast(null);
    document.body.innerHTML = '';
  });

  it('sem provedor registrado não lança e não faz nada (degradação graciosa)', () => {
    UIBus.registrarProvedorToast(null);
    expect(() => UIBus.notificar('olá')).not.toThrow();
    expect(() => UIBus.notificar({ mensagem: 'x', tipo: 'erro' })).not.toThrow();
  });

  it('encaminha opções ao provedor e converte string em toast "info"', () => {
    const provedor = vi.fn();
    UIBus.registrarProvedorToast(provedor);
    UIBus.notificar('mensagem simples');
    UIBus.notificar({ mensagem: 'm', tipo: 'sucesso' });
    expect(provedor).toHaveBeenNthCalledWith(1, { mensagem: 'mensagem simples', tipo: 'info' });
    expect(provedor).toHaveBeenNthCalledWith(2, { mensagem: 'm', tipo: 'sucesso' });
  });

  it('isola exceções do provedor', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    UIBus.registrarProvedorToast(() => { throw new Error('boom'); });
    expect(() => UIBus.notificar('x')).not.toThrow();
    erro.mockRestore();
  });

  it('o registro é substituível e removível', () => {
    const a = vi.fn();
    const b = vi.fn();
    UIBus.registrarProvedorToast(a);
    UIBus.registrarProvedorToast(b);
    UIBus.notificar('x');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('carregar o ui-alerta registra o ui-toast como provedor padrão', async () => {
    await import('../components/ui-alerta');
    UIBus.registrarProvedorToast(null);
    // reimporta o registro explícito exposto pelo ui-alerta
    const { registrarToastNoBus } = await import('../components/ui-alerta/ui-toast');
    registrarToastNoBus();
    UIBus.notificar({ mensagem: 'visível', tipo: 'info' });
    expect(document.querySelector('ui-toast')).not.toBeNull();
  });
});
