import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initZeroJSTriggers } from './zero-js-triggers';
import { UIBus } from './ui-bus';

describe('Zero-JS Triggers - Ações Declarativas', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    initZeroJSTriggers();
  });

  it('deve disparar abertura de modal ao clicar em elemento com [target-modal]', () => {
    const abrirModalSpy = vi.spyOn(UIBus, 'abrirModal').mockReturnValue(true);

    const btn = document.createElement('button');
    btn.setAttribute('target-modal', 'modal-edicao');
    document.body.appendChild(btn);

    btn.click();
    expect(abrirModalSpy).toHaveBeenCalledWith('modal-edicao');
  });

  it('deve disparar fechamento de modal específico ao clicar em [dismiss-modal="id"]', () => {
    const fecharModalSpy = vi.spyOn(UIBus, 'fecharModal').mockReturnValue(true);

    const btn = document.createElement('button');
    btn.setAttribute('dismiss-modal', 'modal-edicao');
    document.body.appendChild(btn);

    btn.click();
    expect(fecharModalSpy).toHaveBeenCalledWith('modal-edicao');
  });

  it('deve disparar notificação toast ao clicar em elemento com [toast-sucesso]', () => {
    const notificarSpy = vi.spyOn(UIBus, 'notificar');

    const btn = document.createElement('button');
    btn.setAttribute('toast-sucesso', 'Salvo com sucesso!');
    document.body.appendChild(btn);

    btn.click();
    expect(notificarSpy).toHaveBeenCalledWith({ tipo: 'sucesso', mensagem: 'Salvo com sucesso!' });
  });

  it('deve disparar cópia de texto ao clicar em elemento com [copiar-texto]', () => {
    const copiarSpy = vi.spyOn(UIBus, 'copiar').mockResolvedValue(true);

    const btn = document.createElement('button');
    btn.setAttribute('copiar-texto', 'Chave-Pix-123');
    btn.setAttribute('copiar-mensagem', 'Pix copiado!');
    document.body.appendChild(btn);

    btn.click();
    expect(copiarSpy).toHaveBeenCalledWith('Chave-Pix-123', 'Pix copiado!');
  });

  it('deve alternar tema ao clicar em [alternar-tema]', () => {
    const temaSpy = vi.spyOn(UIBus, 'definirTema');

    const btn = document.createElement('button');
    btn.setAttribute('alternar-tema', '');
    document.body.appendChild(btn);

    btn.click();
    expect(temaSpy).toHaveBeenCalled();
  });

  it('deve definir densidade ao clicar em [definir-densidade]', () => {
    const densidadeSpy = vi.spyOn(UIBus, 'definirDensidade');

    const btn = document.createElement('button');
    btn.setAttribute('definir-densidade', 'compacta');
    document.body.appendChild(btn);

    btn.click();
    expect(densidadeSpy).toHaveBeenCalledWith('compacta');
  });

  it('deve limpar formulário ao clicar em [limpar-form]', () => {
    const form = document.createElement('form');
    form.id = 'meu-form';
    const resetSpy = vi.fn();
    form.reset = resetSpy;
    document.body.appendChild(form);

    const btn = document.createElement('button');
    btn.setAttribute('limpar-form', 'meu-form');
    document.body.appendChild(btn);

    btn.click();
    expect(resetSpy).toHaveBeenCalled();
  });

  it('deve disparar abertura de drawer ao clicar em elemento com [target-drawer]', () => {
    const abrirDrawerSpy = vi.spyOn(UIBus, 'abrirDrawer').mockReturnValue(true);

    const btn = document.createElement('button');
    btn.setAttribute('target-drawer', 'drawer-filtros');
    document.body.appendChild(btn);

    btn.click();
    expect(abrirDrawerSpy).toHaveBeenCalledWith('drawer-filtros');
  });

  it('deve disparar fechamento de drawer ao clicar em elemento com [dismiss-drawer="id"]', () => {
    const fecharDrawerSpy = vi.spyOn(UIBus, 'fecharDrawer').mockReturnValue(true);

    const btn = document.createElement('button');
    btn.setAttribute('dismiss-drawer', 'drawer-filtros');
    document.body.appendChild(btn);

    btn.click();
    expect(fecharDrawerSpy).toHaveBeenCalledWith('drawer-filtros');
  });

  it('não deve quebrar com DOMException caso [copiar-texto] aponte para seletor CSS inválido', () => {
    const copiarSpy = vi.spyOn(UIBus, 'copiar').mockResolvedValue(true);

    const btn = document.createElement('button');
    btn.setAttribute('copiar-texto', '#123-seletor-invalido');
    document.body.appendChild(btn);

    expect(() => btn.click()).not.toThrow();
    expect(copiarSpy).toHaveBeenCalledWith('#123-seletor-invalido', 'Copiado com sucesso!');
  });
});

