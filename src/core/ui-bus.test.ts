import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIBus } from './ui-bus';

describe('UIBus - Barramento Global de Eventos', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-tema');
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve registrar ouvinte com on() e receber dados emitidos com emit()', () => {
    const callback = vi.fn();
    const unsub = UIBus.on('teste:evento', callback);

    UIBus.emit('teste:evento', { foo: 'bar' });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ foo: 'bar' });

    unsub();
    UIBus.emit('teste:evento', { foo: 'bar2' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('deve disparar CustomEvent no window com prefixo uibus: no emit()', () => {
    const windowSpy = vi.fn();
    window.addEventListener('uibus:notificacao', windowSpy);

    UIBus.emit('notificacao', { id: 123 });
    expect(windowSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener('uibus:notificacao', windowSpy);
  });

  it('deve executar ouvinte registrado com once() apenas uma vez', () => {
    const callback = vi.fn();
    UIBus.once('teste:once', callback);

    UIBus.emit('teste:once', 1);
    UIBus.emit('teste:once', 2);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);
  });

  it('deve abrir modal existente via abrirModal()', () => {
    const modalEl = document.createElement('div');
    modalEl.id = 'modal-teste';
    const abrirMock = vi.fn();
    (modalEl as any).abrir = abrirMock;
    document.body.appendChild(modalEl);

    const busListener = vi.fn();
    UIBus.on('modal:aberto', busListener);

    const resultado = UIBus.abrirModal('modal-teste');
    expect(resultado).toBe(true);
    expect(abrirMock).toHaveBeenCalledTimes(1);
    expect(busListener).toHaveBeenCalledWith({ id: 'modal-teste' });
  });

  it('deve fechar modal existente via fecharModal()', () => {
    const modalEl = document.createElement('div');
    modalEl.id = 'modal-fechar';
    const fecharMock = vi.fn();
    (modalEl as any).fechar = fecharMock;
    document.body.appendChild(modalEl);

    const busListener = vi.fn();
    UIBus.on('modal:fechado', busListener);

    const resultado = UIBus.fecharModal('modal-fechar');
    expect(resultado).toBe(true);
    expect(fecharMock).toHaveBeenCalledTimes(1);
    expect(busListener).toHaveBeenCalledWith({ id: 'modal-fechar' });
  });

  it('deve definir densidade visual e variáveis CSS globais', () => {
    const listener = vi.fn();
    UIBus.on('densidade:alterada', listener);

    UIBus.definirDensidade('compacta');
    expect(document.documentElement.getAttribute('data-ui-densidade')).toBe('compacta');
    expect(document.documentElement.style.getPropertyValue('--ui-campo-altura')).toBe('15px');
    expect(listener).toHaveBeenCalledWith({ densidade: 'compacta', alturaPx: 15 });

    UIBus.definirDensidade('relaxada');
    expect(document.documentElement.style.getPropertyValue('--ui-campo-altura')).toBe('32px');

    UIBus.definirDensidade(25);
    expect(document.documentElement.style.getPropertyValue('--ui-campo-altura')).toBe('25px');
  });

  it('deve alternar tema visual global via definirTema()', () => {
    const listener = vi.fn();
    UIBus.on('tema:alterado', listener);

    const temaEscuro = UIBus.definirTema('escuro');
    expect(temaEscuro).toBe('escuro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('escuro');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(listener).toHaveBeenCalledWith({ tema: 'escuro' });

    const temaClaro = UIBus.definirTema('claro');
    expect(temaClaro).toBe('claro');
    expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('deve copiar texto para clipboard via copiar()', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock
      },
      configurable: true
    });

    const listener = vi.fn();
    UIBus.on('clipboard:copiado', listener);

    const copiou = await UIBus.copiar('texto teste');
    expect(copiou).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('texto teste');
    expect(listener).toHaveBeenCalledWith({ texto: 'texto teste' });
  });
});
