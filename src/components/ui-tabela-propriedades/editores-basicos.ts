import { ItemPropriedade } from './tipos';
import { ContextoEditorPropriedade } from './tipos';
import { avaliarExpressaoMatematica } from './avaliador-expressao';
import { registrarAtualizadorEditor, sincronizarSelect } from './propriedades-dom-utils';

export function criarEditorReadonly(valorAtual: any): HTMLElement {
  const span = document.createElement('span');
  const atualizar = (valor: any) => {
    const isNumero = typeof valor === 'number' || (typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor.trim()));
    span.className = `ui-prop__valor-readonly ${isNumero ? 'ui-prop__valor-readonly--numero' : ''}`.trim();
    span.textContent = valor !== undefined && valor !== null ? String(valor) : '—';
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(span, atualizar);
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
  // Checkbox customizado: precisa de papel, foco e teclado próprios
  container.setAttribute('role', 'checkbox');
  container.tabIndex = 0;
  container.setAttribute('aria-label', prop.rotulo);

  const customCheck = document.createElement('div');
  customCheck.className = 'ui-prop__checkbox-custom';

  const rotulo = document.createElement('span');
  rotulo.className = 'ui-prop__booleano-rotulo';

  const atualizar = (valor: any) => {
    const marcado = Boolean(valor);
    customCheck.classList.toggle('ui-prop__checkbox-custom--marcado', marcado);
    customCheck.textContent = marcado ? '✓' : '';
    rotulo.textContent = marcado ? 'Sim' : 'Não';
    container.setAttribute('aria-checked', String(marcado));
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(container, atualizar);

  container.appendChild(customCheck);
  container.appendChild(rotulo);

  const alternar = () => {
    const novoValor = !Boolean(ctx.obterValorAtual(prop.id));
    ctx.registrarAlteracao(categoriaId, prop.id, novoValor);
    atualizar(novoValor);
  };

  container.addEventListener('click', (e) => {
    e.preventDefault();
    alternar();
  });

  container.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      alternar();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      ctx.focarProximoEditor(container);
    }
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
  select.setAttribute('aria-label', prop.rotulo);

  (prop.opcoes || []).forEach(op => {
    const opt = document.createElement('option');
    opt.value = String(op.id);
    opt.textContent = op.rotulo;
    select.appendChild(opt);
  });

  sincronizarSelect(select, valorAtual);
  registrarAtualizadorEditor(select, (valor) => sincronizarSelect(select, valor));

  select.addEventListener('change', () => {
    // Devolve o id no tipo original da opção (número continua número)
    const opcao = (prop.opcoes || []).find(op => String(op.id) === select.value);
    ctx.registrarAlteracao(categoriaId, prop.id, opcao ? opcao.id : select.value);
    sincronizarSelect(select, ctx.obterValorAtual(prop.id));
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

  // Botão nativo já dispara click com Enter/Espaço; não repetir no keydown
  btn.addEventListener('click', () => {
    if (typeof prop.onClickAcao === 'function') {
      prop.onClickAcao(prop);
    }
    ctx.despacharEventoAcao(prop, categoriaId);
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
  input.setAttribute('aria-label', prop.rotulo);
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
  registrarAtualizadorEditor(input, (valor) => { input.value = formatarValor(valor); });

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
      // O gerenciador ignora valor igual: change + blur não registram null duas vezes
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
      ctx.registrarAlteracao(categoriaId, prop.id, finalVal);
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
      // Expressão em edição ("10+5") é resolvida antes de incrementar
      const avaliado = avaliarExpressaoMatematica(input.value);
      const atual = avaliado ?? (Number(ctx.obterValorAtual(prop.id)) || 0);
      let passo = prop.casasDecimais !== undefined ? Math.pow(10, -prop.casasDecimais) : 1;
      if (e.shiftKey) passo *= 10;
      else if (e.altKey && prop.casasDecimais === undefined) passo *= 0.1;

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
  input.setAttribute('aria-label', prop.rotulo);
  if (prop.placeholder) input.placeholder = prop.placeholder;
  input.value = valorAtual != null ? String(valorAtual) : '';
  registrarAtualizadorEditor(input, (valor) => { input.value = valor != null ? String(valor) : ''; });

  input.addEventListener('focus', () => {
    input.select();
  });

  const commitTexto = () => {
    ctx.registrarAlteracao(categoriaId, prop.id, input.value);
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
