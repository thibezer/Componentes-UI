import { describe, it, expect, beforeEach } from 'vitest';
import '../src/components/ui-campo-texto';
import '../src/components/ui-checkbox';
import '../src/components/ui-radio';
import '../src/components/ui-switch';
import '../src/components/ui-lista-flutuante';
import '../src/components/ui-segmented';

import type { UICampoTexto } from '../src/components/ui-campo-texto';
import type { UICheckbox } from '../src/components/ui-checkbox';
import type { UIRadio } from '../src/components/ui-radio';
import type { UISwitch } from '../src/components/ui-switch';
import type { UIListaFlutuante } from '../src/components/ui-lista-flutuante';
import type { UISegmented } from '../src/components/ui-segmented';

describe('Form-Associated Custom Elements (W3C FACE)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('ui-campo-texto', () => {
    it('deve desabilitar input interno ao receber formDisabledCallback(true) (cenário fieldset disabled)', () => {
      const form = document.createElement('form');
      const fieldset = document.createElement('fieldset');
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      campo.setAttribute('name', 'nome');
      campo.setAttribute('value', 'Thiago');

      fieldset.appendChild(campo);
      form.appendChild(fieldset);
      document.body.appendChild(form);

      const inputInterno = campo.shadowRoot!.querySelector('input')!;
      expect(inputInterno.disabled).toBe(false);
      expect(campo.disabled).toBe(false);

      // Simula o navegador acionando o callback ao desabilitar o fieldset ancestral
      campo.formDisabledCallback(true);
      expect(campo.disabled).toBe(true);
      expect(inputInterno.disabled).toBe(true);

      // Reabilita
      campo.formDisabledCallback(false);
      expect(campo.disabled).toBe(false);
      expect(inputInterno.disabled).toBe(false);
    });

    it('deve restaurar valor padrão inicial ao executar formResetCallback()', () => {
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      campo.setAttribute('name', 'email');
      campo.setAttribute('value', 'padrao@teste.com');
      document.body.appendChild(campo);

      const inputInterno = campo.shadowRoot!.querySelector('input')!;
      expect(inputInterno.value).toBe('padrao@teste.com');

      // Usuário altera o valor
      campo.value = 'novo@teste.com';
      expect(inputInterno.value).toBe('novo@teste.com');

      // Form reset
      campo.formResetCallback();
      expect(campo.value).toBe('padrao@teste.com');
      expect(inputInterno.value).toBe('padrao@teste.com');
    });

    it('deve expor propriedades W3C padrão de formulário (form, name, type, validity)', () => {
      const form = document.createElement('form');
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      campo.setAttribute('name', 'usuario');
      campo.setAttribute('tipo', 'text');
      form.appendChild(campo);
      document.body.appendChild(form);

      expect(campo.form).toBeTruthy();
      expect(campo.form?.tagName).toBe('FORM');
      expect(campo.name).toBe('usuario');
      expect(campo.type).toBe('text');
      expect(typeof campo.checkValidity).toBe('function');
      expect(campo.checkValidity()).toBe(true);
    });
  });

  describe('ui-checkbox', () => {
    it('deve desabilitar container e acessibilidade ao receber formDisabledCallback(true)', () => {
      const checkbox = document.createElement('ui-checkbox') as UICheckbox;
      checkbox.setAttribute('name', 'termos');
      document.body.appendChild(checkbox);

      const container = checkbox.shadowRoot!.querySelector('.ui-checkbox')!;
      expect(checkbox.disabled).toBe(false);
      expect(container.getAttribute('tabindex')).toBe('0');

      checkbox.formDisabledCallback(true);
      expect(checkbox.disabled).toBe(true);
      expect(container.getAttribute('tabindex')).toBe('-1');
      expect(container.classList.contains('ui-checkbox--disabled')).toBe(true);

      // Não deve alternar se desabilitado
      checkbox.alternar();
      expect(checkbox.marcado).toBe(false);

      checkbox.formDisabledCallback(false);
      expect(checkbox.disabled).toBe(false);
      expect(container.getAttribute('tabindex')).toBe('0');
    });

    it('deve restaurar estado inicial no formResetCallback()', () => {
      const checkbox = document.createElement('ui-checkbox') as UICheckbox;
      checkbox.setAttribute('marcado', '');
      document.body.appendChild(checkbox);

      expect(checkbox.marcado).toBe(true);

      checkbox.marcado = false;
      expect(checkbox.marcado).toBe(false);

      checkbox.formResetCallback();
      expect(checkbox.marcado).toBe(true);
    });
  });

  describe('ui-radio', () => {
    it('deve respeitar formDisabledCallback(true) e ignorar seleção quando desabilitado', () => {
      const radio = document.createElement('ui-radio') as UIRadio;
      radio.setAttribute('name', 'opcao');
      radio.setAttribute('value', '1');
      document.body.appendChild(radio);

      expect(radio.disabled).toBe(false);

      radio.formDisabledCallback(true);
      expect(radio.disabled).toBe(true);

      radio.selecionar();
      expect(radio.marcado).toBe(false);

      radio.formDisabledCallback(false);
      expect(radio.disabled).toBe(false);
      radio.selecionar();
      expect(radio.marcado).toBe(true);
    });

    it('deve restaurar valor inicial no formResetCallback()', () => {
      const radio = document.createElement('ui-radio') as UIRadio;
      radio.setAttribute('name', 'opcao');
      radio.setAttribute('value', '1');
      document.body.appendChild(radio);

      radio.selecionar();
      expect(radio.marcado).toBe(true);

      radio.formResetCallback();
      expect(radio.marcado).toBe(false);
    });
  });

  describe('ui-switch', () => {
    it('deve desabilitar interação ao receber formDisabledCallback(true)', () => {
      const sw = document.createElement('ui-switch') as UISwitch;
      document.body.appendChild(sw);

      expect(sw.disabled).toBe(false);
      sw.formDisabledCallback(true);
      expect(sw.disabled).toBe(true);

      sw.alternar();
      expect(sw.ativo).toBe(false);

      sw.formDisabledCallback(false);
      expect(sw.disabled).toBe(false);
      sw.alternar();
      expect(sw.ativo).toBe(true);
    });

    it('deve restaurar estado inicial no formResetCallback()', () => {
      const sw = document.createElement('ui-switch') as UISwitch;
      sw.setAttribute('ativo', '');
      document.body.appendChild(sw);

      expect(sw.ativo).toBe(true);
      sw.ativo = false;
      expect(sw.ativo).toBe(false);

      sw.formResetCallback();
      expect(sw.ativo).toBe(true);
    });
  });

  describe('ui-lista-flutuante', () => {
    it('deve desabilitar botão gatilho e fechar lista ao receber formDisabledCallback(true)', () => {
      const select = document.createElement('ui-lista-flutuante') as UIListaFlutuante;
      select.innerHTML = '<option value="a">A</option><option value="b">B</option>';
      document.body.appendChild(select);

      const button = select.shadowRoot!.querySelector('button')!;
      expect(button.disabled).toBe(false);
      expect(select.disabled).toBe(false);

      select.abrir();
      expect(select.hasAttribute('aberta')).toBe(true);

      select.formDisabledCallback(true);
      expect(select.disabled).toBe(true);
      expect(button.disabled).toBe(true);
      expect(select.hasAttribute('aberta')).toBe(false);

      // Não deve abrir quando desabilitado
      select.abrir();
      expect(select.hasAttribute('aberta')).toBe(false);

      select.formDisabledCallback(false);
      expect(select.disabled).toBe(false);
      expect(button.disabled).toBe(false);
    });

    it('deve restaurar valor padrão inicial no formResetCallback()', () => {
      const select = document.createElement('ui-lista-flutuante') as UIListaFlutuante;
      select.setAttribute('value', 'a');
      select.innerHTML = '<option value="a">Opção A</option><option value="b">Opção B</option>';
      document.body.appendChild(select);

      select.value = 'b';
      expect(select.value).toBe('b');

      select.formResetCallback();
      expect(select.value).toBe('a');
    });
  });

  describe('ui-segmented', () => {
    it('deve desabilitar botões internos de opções ao receber formDisabledCallback(true)', () => {
      const seg = document.createElement('ui-segmented') as UISegmented;
      seg.opcoes = [
        { valor: '1', rotulo: 'Um' },
        { valor: '2', rotulo: 'Dois' }
      ];
      document.body.appendChild(seg);

      const botoes = seg.shadowRoot!.querySelectorAll('button');
      botoes.forEach(b => expect(b.disabled).toBe(false));

      seg.formDisabledCallback(true);
      expect(seg.disabled).toBe(true);
      botoes.forEach(b => expect(b.disabled).toBe(true));

      seg.formDisabledCallback(false);
      expect(seg.disabled).toBe(false);
      botoes.forEach(b => expect(b.disabled).toBe(false));
    });
  });
});
