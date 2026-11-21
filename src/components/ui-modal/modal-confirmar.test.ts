/**
 * confirmarAcao: substituto acessível de window.confirm (Camadas B/C do AGENTS.md).
 */
import { describe, it, expect, afterEach } from 'vitest';
import './ui-modal';
import { confirmarAcao, confirmarDescarteSeSujo } from './modal-confirmar';

const modal = () => document.querySelector('ui-modal') as any;
const botao = (papel: string) => document.querySelector<HTMLElement>(`ui-modal [data-confirmar="${papel}"]`)!;

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('confirmarAcao', () => {
  it('abre um modal com título, mensagem e verbos explícitos', async () => {
    const p = confirmarAcao({ titulo: 'Remover matrícula', mensagem: 'Remove o anexo de Ana.', rotuloConfirmar: 'Remover matrícula' });
    expect(modal().aberto).toBe(true);
    expect(modal().getAttribute('titulo')).toBe('Remover matrícula');
    expect(modal().textContent).toContain('Remove o anexo de Ana.');
    expect(botao('confirmar').textContent?.trim()).toBe('Remover matrícula');
    expect(botao('cancelar').textContent?.trim()).toBe('Cancelar');
    botao('cancelar').click();
    expect(await p).toBe(false);
  });

  it('resolve true ao confirmar e remove o modal do DOM', async () => {
    const p = confirmarAcao({ titulo: 'T', mensagem: 'M', rotuloConfirmar: 'Sim, remover' });
    botao('confirmar').click();
    expect(await p).toBe(true);
    await new Promise((r) => setTimeout(r, 5));
    expect(document.querySelector('ui-modal')).toBeNull();
  });

  it('Esc / fechar o modal resolve false', async () => {
    const p = confirmarAcao({ titulo: 'T', mensagem: 'M', rotuloConfirmar: 'OK' });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await p).toBe(false);
  });

  it('modo destrutivo usa a variante destrutiva no botão de confirmar', () => {
    confirmarAcao({ titulo: 'T', mensagem: 'M', rotuloConfirmar: 'Excluir', destrutivo: true });
    expect(botao('confirmar').getAttribute('variante')).toBe('destrutivo');
  });

  it('mensagem é inserida como texto (sem HTML)', () => {
    confirmarAcao({ titulo: '<b>x</b>', mensagem: '<img src=x onerror=alert(1)>', rotuloConfirmar: 'OK' });
    expect(modal().querySelector('img')).toBeNull();
  });

  it('cliques repetidos não resolvem duas vezes nem lançam', async () => {
    const p = confirmarAcao({ titulo: 'T', mensagem: 'M', rotuloConfirmar: 'OK' });
    const b = botao('confirmar');
    b.click();
    expect(() => b.click()).not.toThrow();
    expect(await p).toBe(true);
  });
});

describe('confirmarDescarteSeSujo', () => {
  it('não pergunta nada quando o rascunho está limpo', async () => {
    expect(await confirmarDescarteSeSujo({ avaliar: () => false })).toBe(true);
    expect(document.querySelector('ui-modal')).toBeNull();
  });

  it('pergunta quando há alterações e respeita a resposta', async () => {
    const p = confirmarDescarteSeSujo({ avaliar: () => true }, { rotuloConfirmar: 'Descartar alterações' });
    expect(modal()).not.toBeNull();
    botao('confirmar').click();
    expect(await p).toBe(true);
  });
});
