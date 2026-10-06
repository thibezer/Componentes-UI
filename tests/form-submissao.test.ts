import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../src/components/ui-campo-texto';
import '../src/components/ui-botao';
import '../src/components/ui-lista-flutuante';

import type { UICampoTexto } from '../src/components/ui-campo-texto';
import type { UIListaFlutuante } from '../src/components/ui-lista-flutuante';

const aguardarTick = () => new Promise((resolve) => setTimeout(resolve, 0));

function pressionarEnter(campo: UICampoTexto): KeyboardEvent {
  const input = campo.shadowRoot!.querySelector('input')!;
  const evento = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true });
  input.dispatchEvent(evento);
  return evento;
}

describe('Rótulos tratados como texto (prevenção de XSS)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const rotuloMalicioso = '<img src=x onerror="window.__xss=1">Nome';

  it('ui-campo-texto obrigatório não interpreta HTML do label', () => {
    const campo = document.createElement('ui-campo-texto') as UICampoTexto;
    campo.setAttribute('label', rotuloMalicioso);
    campo.setAttribute('obrigatorio', '');
    document.body.appendChild(campo);

    const label = campo.shadowRoot!.querySelector('.ui-campo-texto__label')!;
    expect(label.querySelector('img')).toBeNull();
    expect(label.textContent).toContain(rotuloMalicioso);
    expect(label.querySelector('.ui-campo-texto__asterisco')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('ui-lista-flutuante obrigatória não interpreta HTML do label', () => {
    const lista = document.createElement('ui-lista-flutuante') as UIListaFlutuante;
    lista.setAttribute('label', rotuloMalicioso);
    lista.setAttribute('obrigatorio', '');
    document.body.appendChild(lista);

    const label = lista.shadowRoot!.querySelector('.ui-lista-flutuante__label')!;
    expect(label.querySelector('img')).toBeNull();
    expect(label.textContent).toContain(rotuloMalicioso);
    expect(label.querySelector('.ui-lista-flutuante__asterisco')).toBeTruthy();
  });
});

describe('Submissão implícita com Enter em <ui-campo-texto>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve acionar o botão de envio padrão do formulário', async () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <ui-campo-texto name="usuario"></ui-campo-texto>
      <ui-campo-texto name="senha"></ui-campo-texto>
      <ui-botao type="submit" name="acao" value="entrar">Entrar</ui-botao>
    `;
    document.body.appendChild(form);

    const aoSubmeter = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', aoSubmeter);

    pressionarEnter(form.querySelector('ui-campo-texto') as UICampoTexto);
    await aguardarTick();

    expect(aoSubmeter).toHaveBeenCalledTimes(1);
  });

  it('não deve submeter quando o botão padrão estiver desabilitado', async () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <ui-campo-texto name="usuario"></ui-campo-texto>
      <ui-botao type="submit" disabled>Entrar</ui-botao>
    `;
    document.body.appendChild(form);

    const aoSubmeter = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', aoSubmeter);

    pressionarEnter(form.querySelector('ui-campo-texto') as UICampoTexto);
    await aguardarTick();

    expect(aoSubmeter).not.toHaveBeenCalled();
  });

  it('sem botão, deve submeter apenas se houver um único campo de texto', async () => {
    const form = document.createElement('form');
    form.innerHTML = '<ui-campo-texto name="busca"></ui-campo-texto>';
    document.body.appendChild(form);

    const aoSubmeter = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', aoSubmeter);

    pressionarEnter(form.querySelector('ui-campo-texto') as UICampoTexto);
    await aguardarTick();
    expect(aoSubmeter).toHaveBeenCalledTimes(1);

    form.insertAdjacentHTML('beforeend', '<ui-campo-texto name="outro"></ui-campo-texto>');
    pressionarEnter(form.querySelector('ui-campo-texto') as UICampoTexto);
    await aguardarTick();
    expect(aoSubmeter).toHaveBeenCalledTimes(1);
  });

  it('deve respeitar preventDefault() do consumidor no keydown', async () => {
    const form = document.createElement('form');
    form.innerHTML = '<ui-campo-texto name="busca"></ui-campo-texto>';
    document.body.appendChild(form);

    const aoSubmeter = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', aoSubmeter);
    form.addEventListener('keydown', (e) => e.preventDefault());

    pressionarEnter(form.querySelector('ui-campo-texto') as UICampoTexto);
    await aguardarTick();

    expect(aoSubmeter).not.toHaveBeenCalled();
  });
});
