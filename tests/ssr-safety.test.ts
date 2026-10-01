// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isBrowser, SafeHTMLElement, definirCustomElement } from '../src/core/ssr-safe';
import { UIBus } from '../src/core/ui-bus';

describe('SSR Safety (Node.js runtime sem DOM)', () => {
  it('deve identificar ambiente como não-navegador', () => {
    expect(isBrowser).toBe(false);
  });

  it('SafeHTMLElement deve prover uma classe fallback válida sem lançar ReferenceError', () => {
    expect(SafeHTMLElement).toBeDefined();
    class MeuComponenteSSR extends SafeHTMLElement {
      constructor() {
        super();
      }
    }
    const instancia = new MeuComponenteSSR();
    expect(instancia).toBeInstanceOf(SafeHTMLElement);
  });

  it('definirCustomElement deve ser no-op silencioso quando customElements não existir', () => {
    expect(() => {
      definirCustomElement('ui-teste-ssr', class extends SafeHTMLElement {});
    }).not.toThrow();
  });

  it('UIBus não deve quebrar em ambiente SSR ao emitir ou escutar eventos', () => {
    let chamado = false;
    const unsub = UIBus.on('tema:alterado', () => {
      chamado = true;
    });

    expect(() => {
      UIBus.abrirModal('meu-modal');
      UIBus.fecharModal('meu-modal');
      UIBus.abrirDrawer('meu-drawer');
      UIBus.fecharDrawer('meu-drawer');
      UIBus.copiar('texto');
      UIBus.definirTema();
      UIBus.definirDensidade('compacta');
      UIBus.emit('tema:alterado', { tema: 'escuro' });
    }).not.toThrow();

    expect(chamado).toBe(true);
    unsub();
  });

  it('importação dos entrypoints e componentes não deve lançar ReferenceError em ambiente de servidor', async () => {
    // Importações simulando Server-Side Rendering (Next.js App Router / Nuxt / SvelteKit)
    const core = await import('../src/core/index');
    expect(core).toBeDefined();
    expect(core.SafeHTMLElement).toBeDefined();
    expect(core.definirCustomElement).toBeDefined();

    const botao = await import('../src/botao');
    expect(botao.UIBotao).toBeDefined();

    const forms = await import('../src/forms');
    expect(forms.UICampoTexto).toBeDefined();
    expect(forms.UICheckbox).toBeDefined();
    expect(forms.UIRadio).toBeDefined();
    expect(forms.UISwitch).toBeDefined();
    expect(forms.UIListaFlutuante).toBeDefined();

    const feedback = await import('../src/feedback');
    expect(feedback.UIModal).toBeDefined();
    expect(feedback.UIDrawer).toBeDefined();
    expect(feedback.UIAlerta).toBeDefined();
    expect(feedback.UIToast).toBeDefined();
    expect(feedback.UITooltip).toBeDefined();
    expect(feedback.UISkeleton).toBeDefined();

    const data = await import('../src/data');
    expect(data.UITabela).toBeDefined();
    expect(data.UIStat).toBeDefined();
    expect(data.UITabelaPropriedades).toBeDefined();

    const tools = await import('../src/tools');
    expect(tools.UIRibbon).toBeDefined();
    expect(tools.UIPaletaFerramentas).toBeDefined();

    const index = await import('../src/index');
    expect(index).toBeDefined();

    const register = await import('../src/register');
    expect(register.registrarTodosComponentes).toBeDefined();
    expect(() => register.registrarTodosComponentes()).not.toThrow();
  }, 20000);
});
