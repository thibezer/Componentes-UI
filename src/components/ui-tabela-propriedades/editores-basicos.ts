import { ItemPropriedade } from './tipos';
import { ContextoEditorPropriedade } from './tipos';
import { avaliarExpressaoMatematica } from './avaliador-expressao';

export function criarEditorReadonly(valorAtual: any): HTMLElement {
  const span = document.createElement('span');
  const isNumero = typeof valorAtual === 'number' || (typeof valorAtual === 'string' && /^-?\d+(\.\d+)?$/.test(valorAtual.trim()));
  span.className = `ui-prop__valor-readonly ${isNumero ? 'ui-prop__valor-readonly--numero' : ''}`.trim();
  span.textContent = valorAtual !== undefined && valorAtual !== null ? String(valorAtual) : '—';
  return span;
}

export function criarEditorBooleano(
  categoriaId: string,
  prop: ItemPropriedade,
  valorAtual: any,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  const container = document.createElement('label');
  container.className = 'ui-prop__editor-booleano';

  const isChecked = Boolean(valorAtual);
  const customCheck = document.createElement('div');
  customCheck.className = `ui-prop__checkbox-custom ${isChecked ? 'ui-prop__checkbox-custom--marcado' : ''}`;
  customCheck.textContent = isChecked ? '✓' : '';

  const rotulo = document.createElement('span');
  rotulo.className = 'ui-prop__booleano-rotulo';
  rotulo.textContent = isChecked ? 'Sim' : 'Não';

  container.appendChild(customCheck);
  container.appendChild(rotulo);

  container.addEventListener('click', (e) => {
    e.preventDefault();
    const novoValor = !Boolean(ctx.obterValorAtual(prop.id));
    ctx.registrarAlteracao(categoriaId, prop.id, novoValor);
    customCheck.classList.toggle('ui-prop__checkbox-custom--marcado', novoValor);
    customCheck.textContent = novoValor ? '✓' : '';
    rotulo.textContent = novoValor ? 'Sim' : 'Não';
  });

  return container;
}

export function criarEditorSelecao(
  categoriaId: string,
  prop: ItemPropriedade,
  valorAtual: any,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  const select = document.createElement('select');
  select.className = 'ui-prop__editor-select';

  (prop.opcoes || []).forEach(op => {
    const opt = document.createElement('option');
    opt.value = String(op.id);
    opt.textContent = op.rotulo;
    if (String(op.id) === String(valorAtual)) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    ctx.registrarAlteracao(categoriaId, prop.id, select.value);
  });

  select.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      ctx.focarProximoEditor(select);
    }
  });

  return select;
}

export function criarEditorAcao(
  categoriaId: string,
  prop: ItemPropriedade,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ui-prop__btn-acao-inline';
  btn.textContent = prop.rotuloAcao || 'Editar...';

  btn.addEventListener('click', () => {
    if (typeof prop.onClickAcao === 'function') {
      prop.onClickAcao(prop);
    }
    ctx.despacharEventoAcao(prop, categoriaId);
  });

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btn.click();
    }
  });

  return btn;
}

export function criarEditorNumero(
  categoriaId: string,
  prop: ItemPropriedade,
  valorAtual: any,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.className = 'ui-prop__editor-input ui-prop__editor-input--numero';
  if (prop.placeholder) input.placeholder = prop.placeholder;

  const formatarValor = (val: any) => {
    if (val === undefined || val === null || val === '') return '';
    const n = Number(val);
    if (isNaN(n)) return String(val);
    if (prop.casasDecimais !== undefined) {
      return n.toFixed(prop.casasDecimais);
    }
    return String(n);
  };

  input.value = formatarValor(valorAtual);

  input.addEventListener('focus', () => {
    input.select();
  });

  input.addEventListener('input', () => {
    const val = input.value;
    const contemOperadores = /[\+\-\*\/\^\%\(\)]/.test(val) && !/^[+-]?[0-9]*\.?[0-9]*$/.test(val.trim());
    input.classList.toggle('ui-prop__editor-input--calculando', contemOperadores);
  });

  const commitNumero = () => {
    input.classList.remove('ui-prop__editor-input--calculando');
    const raw = input.value.trim();
    if (raw === '') {
      ctx.registrarAlteracao(categoriaId, prop.id, null);
      return;
    }

    const calculado = avaliarExpressaoMatematica(raw);
    if (calculado !== null && !isNaN(calculado)) {
      let finalVal = calculado;
      if (prop.casasDecimais !== undefined) {
        finalVal = Number(calculado.toFixed(prop.casasDecimais));
      }
      input.value = formatarValor(finalVal);
      if (finalVal !== ctx.obterValorAtual(prop.id)) {
        ctx.registrarAlteracao(categoriaId, prop.id, finalVal);
      }
    } else {
      input.value = formatarValor(ctx.obterValorAtual(prop.id));
    }
  };

  input.addEventListener('change', commitNumero);
  input.addEventListener('blur', commitNumero);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitNumero();
      ctx.focarProximoEditor(input);
    } else if (e.key === 'Escape') {
      input.classList.remove('ui-prop__editor-input--calculando');
      input.value = formatarValor(ctx.obterValorAtual(prop.id));
      input.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const atual = parseFloat(input.value) || 0;
      let passo = prop.casasDecimais !== undefined ? Math.pow(10, -prop.casasDecimais) : 1;
      if (e.shiftKey) passo *= 10;
      else if (e.altKey) passo *= 0.1;

      let novo = e.key === 'ArrowUp' ? atual + passo : atual - passo;
      if (prop.casasDecimais !== undefined) {
        novo = Number(novo.toFixed(prop.casasDecimais));
      } else {
        novo = Math.round(novo * 100) / 100;
      }

      input.value = formatarValor(novo);
      ctx.registrarAlteracao(categoriaId, prop.id, novo);
    }
  });

  return input;
}

export function criarEditorTexto(
  categoriaId: string,
  prop: ItemPropriedade,
  valorAtual: any,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ui-prop__editor-input';
  if (prop.placeholder) input.placeholder = prop.placeholder;
  input.value = valorAtual != null ? String(valorAtual) : '';

  input.addEventListener('focus', () => {
    input.select();
  });

  const commitTexto = () => {
    if (input.value !== ctx.obterValorAtual(prop.id)) {
      ctx.registrarAlteracao(categoriaId, prop.id, input.value);
    }
  };

  input.addEventListener('change', commitTexto);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitTexto();
      ctx.focarProximoEditor(input);
    } else if (e.key === 'Escape') {
      input.value = String(ctx.obterValorAtual(prop.id) ?? '');
      input.blur();
    }
  });

  return input;
}
