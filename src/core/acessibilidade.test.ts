import { describe, it, expect, beforeEach } from 'vitest';
import '../components/ui-campo-texto';
import '../components/ui-lista-flutuante';
import '../components/ui-switch';
import { gerarIdUnico } from './acessibilidade';

describe('Acessibilidade nativa: associação label ↔ controle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('gerarIdUnico deve produzir IDs distintos a cada chamada', () => {
    const ids = new Set(Array.from({ length: 200 }, () => gerarIdUnico('t')));
    expect(ids.size).toBe(200);
  });

  describe('<ui-input> / <ui-campo-texto>', () => {
    it('deve registrar <ui-input> como alias do campo de texto', () => {
      const el = document.createElement('ui-input');
      document.body.appendChild(el);
      expect(el.shadowRoot?.querySelector('input')).toBeTruthy();
    });

    it('deve associar o label visível ao input nativo com ID único gerado internamente', () => {
      document.body.innerHTML = `
        <ui-input label="Nome"></ui-input>
        <ui-input label="Email"></ui-input>
      `;
      const [a, b] = Array.from(document.querySelectorAll('ui-input'));
      const inputA = a.shadowRoot!.querySelector('input')!;
      const labelA = a.shadowRoot!.querySelector('label')!;
      const inputB = b.shadowRoot!.querySelector('input')!;

      expect(inputA.id).toBeTruthy();
      expect(labelA.htmlFor).toBe(inputA.id);
      expect(inputA.id).not.toBe(inputB.id);
      expect(inputA.hasAttribute('aria-label')).toBe(false);
    });

    it('sem atributo label, deve herdar o nome de um <label> externo envolvente ou aria-label', () => {
      document.body.innerHTML = `
        <label>Telefone <ui-input id="tel"></ui-input></label>
        <ui-input id="cep" aria-label="CEP"></ui-input>
      `;
      const tel = document.getElementById('tel')!.shadowRoot!.querySelector('input')!;
      const cep = document.getElementById('cep')!.shadowRoot!.querySelector('input')!;
      expect(tel.getAttribute('aria-label')).toBe('Telefone');
      expect(cep.getAttribute('aria-label')).toBe('CEP');
    });
  });

  describe('<ui-select>', () => {
    it('deve associar o label visível ao botão nativo via aria-labelledby (rótulo + valor)', () => {
      document.body.innerHTML = `
        <ui-select label="Cidade" value="cwb">
          <option value="cwb">Curitiba</option>
          <option value="sp">São Paulo</option>
        </ui-select>
      `;
      const shadow = document.querySelector('ui-select')!.shadowRoot!;
      const label = shadow.querySelector('label')!;
      const botao = shadow.querySelector('button.ui-lista-flutuante__gatilho')!;
      const texto = shadow.querySelector('.ui-lista-flutuante__texto')!;
      const lista = shadow.querySelector('[role="listbox"]')!;

      expect(label.id).toBeTruthy();
      expect(botao.getAttribute('aria-labelledby')).toBe(`${label.id} ${texto.id}`);
      expect(lista.getAttribute('aria-labelledby')).toBe(label.id);
      expect(botao.getAttribute('aria-controls')).toBe(lista.id);
    });

    it('deve focar o botão (sem abrir a lista) ao clicar no label', () => {
      document.body.innerHTML = `<ui-select label="Cidade"><option value="a">A</option></ui-select>`;
      const select = document.querySelector('ui-select')!;
      const shadow = select.shadowRoot!;
      (shadow.querySelector('label') as HTMLElement).click();
      expect(shadow.activeElement).toBe(shadow.querySelector('button.ui-lista-flutuante__gatilho'));
      expect(select.hasAttribute('aberta')).toBe(false);
    });

    it('sem atributo label, deve usar o <label> externo sem incluir o texto das opções', () => {
      document.body.innerHTML = `
        <label>Estado <ui-select id="uf"><option value="pr">Paraná</option></ui-select></label>
      `;
      const botao = document.getElementById('uf')!.shadowRoot!.querySelector('button.ui-lista-flutuante__gatilho')!;
      expect(botao.getAttribute('aria-label')).toBe('Estado');
    });
  });

  describe('<ui-switch>', () => {
    it('deve associar o label visível ao controle role="switch" via ID interno', () => {
      document.body.innerHTML = `
        <ui-switch label="Modo escuro"></ui-switch>
        <ui-switch label="Notificações"></ui-switch>
      `;
      const [a, b] = Array.from(document.querySelectorAll('ui-switch'));
      const controleA = a.shadowRoot!.querySelector('[role="switch"]')!;
      const labelA = a.shadowRoot!.querySelector('.ui-switch__label')!;
      const labelB = b.shadowRoot!.querySelector('.ui-switch__label')!;

      expect(labelA.id).toBeTruthy();
      expect(controleA.getAttribute('aria-labelledby')).toBe(labelA.id);
      expect(labelA.id).not.toBe(labelB.id);
    });

    it('sem atributo label, deve herdar aria-label do host', () => {
      document.body.innerHTML = `<ui-switch aria-label="Camada visível"></ui-switch>`;
      const controle = document.querySelector('ui-switch')!.shadowRoot!.querySelector('[role="switch"]')!;
      expect(controle.getAttribute('aria-label')).toBe('Camada visível');
      expect(controle.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('deve alternar quando o clique vem de um <label> externo (ativação no host)', () => {
      document.body.innerHTML = `<ui-switch label="Wi-Fi"></ui-switch>`;
      const sw = document.querySelector('ui-switch') as HTMLElement & { ativo: boolean };
      sw.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      expect(sw.ativo).toBe(true);

      // Clique interno (retargeted para o host) não deve alternar duas vezes
      (sw.shadowRoot!.querySelector('[role="switch"]') as HTMLElement).click();
      expect(sw.ativo).toBe(false);
    });
  });
});
