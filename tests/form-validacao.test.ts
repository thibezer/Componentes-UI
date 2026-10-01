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

describe('Validação Nativa de Restrições e Form-Associated (HTML5 & ElementInternals)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('ui-campo-texto (Validação e Restrições)', () => {
    it('deve bloquear validação com obrigatorio/required quando vazio e liberar ao preencher', () => {
      const form = document.createElement('form');
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      campo.setAttribute('name', 'cpf');
      campo.setAttribute('label', 'CPF');
      campo.setAttribute('obrigatorio', '');
      form.appendChild(campo);
      document.body.appendChild(form);

      // Visualmente deve exibir o asterisco no label
      const label = campo.shadowRoot!.querySelector('.ui-campo-texto__label')!;
      expect(label.innerHTML).toContain('*');
      expect(label.querySelector('.ui-campo-texto__asterisco')).toBeTruthy();

      // Validação nativa: campo vazio obrigatório
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.valueMissing).toBe(true);
      expect(campo.checkValidity()).toBe(false);
      expect(campo.validationMessage).toBeTruthy();
      expect(form.checkValidity()).toBe(false);

      // Ao preencher o campo
      campo.value = '123.456.789-00';
      expect(campo.validity?.valid).toBe(true);
      expect(campo.validity?.valueMissing).toBe(false);
      expect(campo.checkValidity()).toBe(true);
      expect(form.checkValidity()).toBe(true);

      // Ao limpar o valor
      campo.value = '';
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.valueMissing).toBe(true);
      expect(form.checkValidity()).toBe(false);
    });

    it('não deve considerar inválido se o campo for obrigatório porém estiver disabled', () => {
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      campo.setAttribute('obrigatorio', '');
      campo.disabled = true;
      document.body.appendChild(campo);

      expect(campo.validity?.valid).toBe(true);
      expect(campo.checkValidity()).toBe(true);
    });

    it('deve validar minlength e maxlength', () => {
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      campo.setAttribute('minlength', '5');
      campo.setAttribute('maxlength', '10');
      document.body.appendChild(campo);

      // Vazio (não obrigatório) é válido
      expect(campo.checkValidity()).toBe(true);

      // Menor que 5
      campo.value = 'abc';
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.tooShort).toBe(true);
      expect(campo.checkValidity()).toBe(false);

      // Entre 5 e 10
      campo.value = 'abcdef';
      expect(campo.validity?.valid).toBe(true);
      expect(campo.validity?.tooShort).toBe(false);
      expect(campo.checkValidity()).toBe(true);

      // Maior que 10
      campo.value = '1234567890123';
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.tooLong).toBe(true);
      expect(campo.checkValidity()).toBe(false);
    });

    it('deve validar pattern de expressão regular', () => {
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      campo.setAttribute('pattern', '\\d{5}-\\d{3}');
      document.body.appendChild(campo);

      campo.value = 'abc';
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.patternMismatch).toBe(true);
      expect(campo.checkValidity()).toBe(false);

      campo.value = '12345-678';
      expect(campo.validity?.valid).toBe(true);
      expect(campo.validity?.patternMismatch).toBe(false);
      expect(campo.checkValidity()).toBe(true);
    });

    it('deve validar formato tipo="email"', () => {
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      campo.setAttribute('tipo', 'email');
      document.body.appendChild(campo);

      campo.value = 'emailinvalido';
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.typeMismatch).toBe(true);

      campo.value = 'contato@gerencigeo.com.br';
      expect(campo.validity?.valid).toBe(true);
      expect(campo.validity?.typeMismatch).toBe(false);
    });

    it('deve validar número com min e max em tipo="number"', () => {
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      campo.setAttribute('tipo', 'number');
      campo.setAttribute('min', '10');
      campo.setAttribute('max', '50');
      document.body.appendChild(campo);

      campo.value = 'não-número';
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.badInput).toBe(true);

      campo.value = '5';
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.rangeUnderflow).toBe(true);

      campo.value = '60';
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.rangeOverflow).toBe(true);

      campo.value = '25';
      expect(campo.validity?.valid).toBe(true);
    });

    it('deve suportar setCustomValidity()', () => {
      const campo = document.createElement('ui-campo-texto') as UICampoTexto;
      document.body.appendChild(campo);

      campo.setCustomValidity('CPF inválido de acordo com a Receita Federal.');
      expect(campo.validity?.valid).toBe(false);
      expect(campo.validity?.customError).toBe(true);
      expect(campo.validationMessage).toBe('CPF inválido de acordo com a Receita Federal.');
      expect(campo.checkValidity()).toBe(false);

      // Limpar erro customizado
      campo.setCustomValidity('');
      expect(campo.validity?.valid).toBe(true);
      expect(campo.validity?.customError).toBe(false);
      expect(campo.checkValidity()).toBe(true);
    });
  });

  describe('ui-checkbox (Validação obrigatória)', () => {
    it('deve validar termo obrigatório não marcado e marcar como válido ao aceitar', () => {
      const form = document.createElement('form');
      const checkbox = document.createElement('ui-checkbox') as UICheckbox;
      checkbox.setAttribute('name', 'termos');
      checkbox.setAttribute('obrigatorio', '');
      form.appendChild(checkbox);
      document.body.appendChild(form);

      expect(checkbox.validity?.valid).toBe(false);
      expect(checkbox.validity?.valueMissing).toBe(true);
      expect(form.checkValidity()).toBe(false);

      checkbox.alternar();
      expect(checkbox.marcado).toBe(true);
      expect(checkbox.validity?.valid).toBe(true);
      expect(checkbox.validity?.valueMissing).toBe(false);
      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('ui-radio (Validação obrigatória de grupo)', () => {
    it('deve exigir seleção em grupo de opções com obrigatorio', () => {
      const form = document.createElement('form');
      const radio1 = document.createElement('ui-radio') as UIRadio;
      radio1.setAttribute('name', 'plano');
      radio1.setAttribute('value', 'basico');
      radio1.setAttribute('obrigatorio', '');

      const radio2 = document.createElement('ui-radio') as UIRadio;
      radio2.setAttribute('name', 'plano');
      radio2.setAttribute('value', 'pro');

      form.appendChild(radio1);
      form.appendChild(radio2);
      document.body.appendChild(form);

      // Nenhum marcado
      expect(radio1.validity?.valid).toBe(false);
      expect(radio1.validity?.valueMissing).toBe(true);
      expect(form.checkValidity()).toBe(false);

      // Seleciona radio2
      radio2.selecionar();
      expect(radio2.marcado).toBe(true);
      expect(radio1.validity?.valid).toBe(true);
      expect(radio2.validity?.valid).toBe(true);
      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('ui-switch (Validação obrigatória)', () => {
    it('deve exigir ativação quando obrigatorio', () => {
      const form = document.createElement('form');
      const sw = document.createElement('ui-switch') as UISwitch;
      sw.setAttribute('name', 'confirmar');
      sw.setAttribute('obrigatorio', '');
      form.appendChild(sw);
      document.body.appendChild(form);

      expect(sw.validity?.valid).toBe(false);
      expect(sw.validity?.valueMissing).toBe(true);
      expect(form.checkValidity()).toBe(false);

      sw.alternar();
      expect(sw.ativo).toBe(true);
      expect(sw.validity?.valid).toBe(true);
      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('ui-lista-flutuante (Validação obrigatória)', () => {
    it('deve validar seleção obrigatória e exibir asterisco no label', () => {
      const form = document.createElement('form');
      const select = document.createElement('ui-lista-flutuante') as UIListaFlutuante;
      select.setAttribute('name', 'cidade');
      select.setAttribute('label', 'Cidade');
      select.setAttribute('obrigatorio', '');
      select.itens = [
        { id: 'curitiba', label: 'Curitiba' },
        { id: 'maringa', label: 'Maringá' }
      ];
      form.appendChild(select);
      document.body.appendChild(form);

      const label = select.shadowRoot!.querySelector('.ui-lista-flutuante__label')!;
      expect(label.innerHTML).toContain('*');

      expect(select.validity?.valid).toBe(false);
      expect(select.validity?.valueMissing).toBe(true);
      expect(form.checkValidity()).toBe(false);

      select.value = 'curitiba';
      expect(select.validity?.valid).toBe(true);
      expect(select.validity?.valueMissing).toBe(false);
      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('ui-segmented (Validação obrigatória)', () => {
    it('deve exigir seleção quando obrigatorio', () => {
      const form = document.createElement('form');
      const seg = document.createElement('ui-segmented') as UISegmented;
      seg.setAttribute('name', 'categoria');
      seg.setAttribute('obrigatorio', '');
      seg.opcoes = [
        { valor: 'a', rotulo: 'Opção A' },
        { valor: 'b', rotulo: 'Opção B' }
      ];
      form.appendChild(seg);
      document.body.appendChild(form);

      expect(seg.validity?.valid).toBe(false);
      expect(seg.validity?.valueMissing).toBe(true);
      expect(form.checkValidity()).toBe(false);

      seg.valor = 'a';
      expect(seg.validity?.valid).toBe(true);
      expect(form.checkValidity()).toBe(true);
    });
  });
});
