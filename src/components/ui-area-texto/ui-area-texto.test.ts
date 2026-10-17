import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-area-texto';
import type { UIAreaTexto } from './ui-area-texto';

const textarea = (el: UIAreaTexto) => el.shadowRoot!.querySelector('textarea')!;

describe('UIAreaTexto', () => {
  let el: UIAreaTexto;

  beforeEach(() => {
    el = document.createElement('ui-area-texto') as UIAreaTexto;
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('registra <ui-area-texto> e o alias <ui-textarea>', () => {
    expect(customElements.get('ui-area-texto')).toBeDefined();
    expect(customElements.get('ui-textarea')).toBeDefined();
  });

  it('renderiza um textarea com 4 linhas por padrão e expõe os parts', () => {
    expect(textarea(el).getAttribute('rows')).toBe('4');
    const parts = Array.from(el.shadowRoot!.querySelectorAll('[part]')).map((n) => n.getAttribute('part'));
    for (const esperado of ['rotulo', 'campo', 'input', 'rodape', 'ajuda', 'contador']) {
      expect(parts).toContain(esperado);
    }
  });

  it('associa o rótulo ao textarea e mostra o asterisco decorativo quando obrigatório', () => {
    el.setAttribute('label', 'Observações');
    el.setAttribute('obrigatorio', '');
    const label = el.shadowRoot!.querySelector('label')!;
    expect(label.htmlFor).toBe(textarea(el).id);
    expect(label.textContent).toContain('Observações');
    expect(label.querySelector('[aria-hidden="true"]')?.textContent).toBe('*');
    expect(textarea(el).getAttribute('aria-required')).toBe('true');
  });

  it('sem label usa o aria-label do host como nome acessível', () => {
    el.setAttribute('aria-label', 'Descrição do imóvel');
    expect(textarea(el).getAttribute('aria-label')).toBe('Descrição do imóvel');
  });

  it('emite ui-input e input nativo uma única vez por edição, com o valor no detail', () => {
    const uiInput = vi.fn();
    const nativo = vi.fn();
    el.addEventListener('ui-input', uiInput);
    el.addEventListener('input', nativo);

    const ta = textarea(el);
    ta.value = 'linha 1\nlinha 2';
    ta.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    expect(uiInput).toHaveBeenCalledTimes(1);
    expect((uiInput.mock.calls[0][0] as CustomEvent).detail.value).toBe('linha 1\nlinha 2');
    expect(nativo).toHaveBeenCalledTimes(1);
    expect(el.value).toBe('linha 1\nlinha 2');
    expect(el.getAttribute('value')).toBeNull();
  });

  it('emite ui-change e change nativo ao confirmar a edição', () => {
    const uiChange = vi.fn();
    const nativo = vi.fn();
    el.addEventListener('ui-change', uiChange);
    el.addEventListener('change', nativo);
    textarea(el).value = 'abc';
    textarea(el).dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    expect(uiChange).toHaveBeenCalledTimes(1);
    expect(nativo).toHaveBeenCalledTimes(1);
  });

  it('Enter comum não dispara ui-enviar; Ctrl+Enter e Cmd+Enter disparam e cancelam a quebra de linha', () => {
    const enviar = vi.fn();
    el.addEventListener('ui-enviar', enviar);
    textarea(el).value = 'texto';

    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    textarea(el).dispatchEvent(enter);
    expect(enviar).not.toHaveBeenCalled();
    expect(enter.defaultPrevented).toBe(false);

    const ctrl = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });
    textarea(el).dispatchEvent(ctrl);
    textarea(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true, cancelable: true }));
    expect(enviar).toHaveBeenCalledTimes(2);
    expect((enviar.mock.calls[0][0] as CustomEvent).detail.value).toBe('texto');
    expect(ctrl.defaultPrevented).toBe(true);
  });

  it('Enter não submete o <form> (quebra de linha, como um textarea nativo)', () => {
    const form = document.createElement('form');
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', onSubmit);
    form.appendChild(el);
    document.body.appendChild(form);
    vi.useFakeTimers();
    textarea(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    vi.runAllTimers();
    vi.useRealTimers();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('desabilitado e somente leitura chegam ao textarea; somente leitura não envia com Ctrl+Enter', () => {
    el.setAttribute('disabled', '');
    expect(textarea(el).disabled).toBe(true);
    el.removeAttribute('disabled');
    el.setAttribute('readonly', '');
    expect(textarea(el).readOnly).toBe(true);

    const enviar = vi.fn();
    el.addEventListener('ui-enviar', enviar);
    textarea(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    expect(enviar).not.toHaveBeenCalled();
  });

  it('delega focus() e blur() ao textarea interno', () => {
    const f = vi.spyOn(textarea(el), 'focus');
    const b = vi.spyOn(textarea(el), 'blur');
    el.focus();
    el.blur();
    expect(f).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it('o atributo value preenche o textarea e a propriedade value é bidirecional', () => {
    el.setAttribute('value', 'inicial');
    expect(textarea(el).value).toBe('inicial');
    el.value = 'novo\ntexto';
    expect(textarea(el).value).toBe('novo\ntexto');
    el.limpar();
    expect(el.value).toBe('');
  });

  describe('ajuda, erro e contador', () => {
    it('mostra a ajuda e a referencia em aria-describedby só enquanto visível', () => {
      expect(textarea(el).hasAttribute('aria-describedby')).toBe(false);
      el.setAttribute('helper-text', 'Descreva com detalhes');
      const ajuda = el.shadowRoot!.querySelector('.ui-area-texto__helper') as HTMLElement;
      expect(ajuda.textContent).toBe('Descreva com detalhes');
      expect(textarea(el).getAttribute('aria-describedby')).toBe(ajuda.id);
      el.removeAttribute('helper-text');
      expect(textarea(el).hasAttribute('aria-describedby')).toBe(false);
    });

    it('erro marca aria-invalid, estiliza o invólucro e troca a ajuda pela mensagem', () => {
      el.setAttribute('helper-text', 'Ajuda');
      el.setAttribute('mensagem-erro', 'Texto obrigatório');
      const wrapper = el.shadowRoot!.querySelector('.ui-area-texto__wrapper')!;
      expect(textarea(el).getAttribute('aria-invalid')).toBe('true');
      expect(wrapper.classList.contains('ui-area-texto__wrapper--erro')).toBe(true);
      expect(el.shadowRoot!.querySelector('.ui-area-texto__helper')!.textContent).toContain('Texto obrigatório');
    });

    it('contador aparece só com o atributo e acompanha a digitação com o limite do maxlength', () => {
      const contador = el.shadowRoot!.querySelector('.ui-area-texto__contador') as HTMLElement;
      expect(contador.hidden).toBe(true);

      el.setAttribute('contador', '');
      el.setAttribute('maxlength', '10');
      expect(contador.hidden).toBe(false);
      expect(contador.textContent).toBe('0 / 10');

      textarea(el).value = 'abcdefghi';
      textarea(el).dispatchEvent(new Event('input', { bubbles: true }));
      expect(contador.textContent).toBe('9 / 10');
      expect(contador.classList.contains('ui-area-texto__contador--aviso')).toBe(true);
    });

    it('anuncia aos leitores de tela só quando o nível do contador muda', () => {
      el.setAttribute('contador', '');
      el.setAttribute('maxlength', '10');
      const anuncio = el.shadowRoot!.querySelector('.ui-area-texto__anuncio')!;
      const digitar = (texto: string) => {
        textarea(el).value = texto;
        textarea(el).dispatchEvent(new Event('input', { bubbles: true }));
      };

      digitar('abc');
      expect(anuncio.textContent).toBe('');
      digitar('abcdefghi');
      expect(anuncio.textContent).toBe('Restam 1 caracteres.');
      anuncio.textContent = 'marcador';
      digitar('abcdefghij'); // continua em "aviso": não reanuncia
      expect(anuncio.textContent).toBe('marcador');
      digitar('a'); // volta ao normal: limpa
      expect(anuncio.textContent).toBe('');
    });

    it('contador sem maxlength mostra apenas a contagem', () => {
      el.setAttribute('contador', '');
      el.value = 'abc';
      expect(el.shadowRoot!.querySelector('.ui-area-texto__contador')!.textContent).toBe('3');
    });
  });

  describe('formulário (FACE)', () => {
    function formulario(html: string): HTMLFormElement {
      const form = document.createElement('form');
      form.innerHTML = html;
      document.body.appendChild(form);
      return form;
    }

    it('participa do FormData com name e valor digitado', () => {
      const form = formulario('<ui-area-texto name="obs" value="inicial"></ui-area-texto>');
      const campo = form.querySelector('ui-area-texto') as UIAreaTexto;
      textarea(campo).value = 'editado\ncom quebra';
      textarea(campo).dispatchEvent(new Event('input', { bubbles: true }));
      expect(new FormData(form).get('obs')).toBe('editado\ncom quebra');
    });

    it('form.reset() restaura o valor do atributo', () => {
      const form = formulario('<ui-area-texto name="obs" value="padrão"></ui-area-texto>');
      const campo = form.querySelector('ui-area-texto') as UIAreaTexto;
      textarea(campo).value = 'alterado';
      textarea(campo).dispatchEvent(new Event('input', { bubbles: true }));
      campo.formResetCallback();
      expect(campo.value).toBe('padrão');
      expect(new FormData(form).get('obs')).toBe('padrão');
    });

    it('obrigatório vazio é inválido (valueMissing) e válido depois de preenchido', () => {
      el.setAttribute('obrigatorio', '');
      expect(el.checkValidity()).toBe(false);
      expect(el.validity?.valueMissing).toBe(true);
      el.value = 'ok';
      expect(el.checkValidity()).toBe(true);
    });

    it('minlength e maxlength geram tooShort e tooLong com mensagem em português', () => {
      el.setAttribute('minlength', '5');
      el.value = 'abc';
      expect(el.validity?.tooShort).toBe(true);
      expect(el.validationMessage).toContain('pelo menos 5');

      el.removeAttribute('minlength');
      el.setAttribute('maxlength', '3');
      el.value = 'abcdef';
      expect(el.validity?.tooLong).toBe(true);
    });

    it('setCustomValidity tem prioridade e mensagem-validacao substitui o texto padrão', () => {
      el.setCustomValidity('Conteúdo proibido');
      expect(el.validationMessage).toBe('Conteúdo proibido');
      el.setCustomValidity('');
      el.setAttribute('obrigatorio', '');
      el.setAttribute('mensagem-validacao', 'Diga algo');
      expect(el.validationMessage).toBe('Diga algo');
    });

    it('formDisabledCallback desabilita o textarea', () => {
      el.formDisabledCallback(true);
      expect(textarea(el).disabled).toBe(true);
      expect(el.disabled).toBe(true);
    });

    it('formStateRestoreCallback restaura texto', () => {
      el.formStateRestoreCallback('salvo', 'restore');
      expect(el.value).toBe('salvo');
    });
  });

  describe('layout', () => {
    it('linhas define as linhas visíveis, limitadas entre 1 e 50', () => {
      el.setAttribute('linhas', '8');
      expect(textarea(el).getAttribute('rows')).toBe('8');
      el.setAttribute('linhas', '9999');
      expect(textarea(el).getAttribute('rows')).toBe('50');
      el.setAttribute('linhas', '0');
      expect(textarea(el).getAttribute('rows')).toBe('1');
    });

    it('redimensionar aceita só valores conhecidos; auto-altura desliga o redimensionamento', () => {
      expect(textarea(el).style.resize).toBe('vertical');
      el.setAttribute('redimensionar', 'ambos');
      expect(textarea(el).style.resize).toBe('both');
      el.setAttribute('redimensionar', 'nenhum');
      expect(textarea(el).style.resize).toBe('none');
      el.setAttribute('redimensionar', 'xyz; color: red');
      expect(textarea(el).style.resize).toBe('vertical');
      el.setAttribute('redimensionar', 'ambos');
      el.setAttribute('auto-altura', '');
      expect(textarea(el).style.resize).toBe('none');
    });

    it('linhas-max só vale com auto-altura e publica a variável CSS do teto', () => {
      el.setAttribute('linhas-max', '10');
      expect(el.style.getPropertyValue('--ui-area-linhas-max')).toBe('');
      el.setAttribute('auto-altura', '');
      expect(el.style.getPropertyValue('--ui-area-linhas-max')).toBe('10');
      el.removeAttribute('auto-altura');
      expect(el.style.getPropertyValue('--ui-area-linhas-max')).toBe('');
    });

    it('auto-altura aplica a altura medida pelo conteúdo e a remove ao desligar', () => {
      const ta = textarea(el);
      Object.defineProperty(ta, 'scrollHeight', { configurable: true, get: () => 200 });
      Object.defineProperty(ta, 'clientHeight', { configurable: true, get: () => 90 });
      el.setAttribute('auto-altura', '');
      expect(ta.style.height).toBe('200px');
      el.removeAttribute('auto-altura');
      expect(ta.style.height).toBe('');
    });
  });
});
