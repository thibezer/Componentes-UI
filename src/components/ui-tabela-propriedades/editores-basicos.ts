import { ItemPropriedade } from './tipos';
import { ContextoEditorPropriedade } from './tipos';
import { avaliarExpressaoMatematica } from './avaliador-expressao';
import { marcarSelectMisto, navegarAposEnter, registrarAtualizadorEditor, sincronizarSelect } from './propriedades-dom-utils';
import { ajustarNumero, formatarNumero, interpretarEntradaNumerica, passoNumerico } from './propriedades-numero';
import { formatarValorExibicao } from './propriedades-exibicao';
import { isValorMisto, textoMistoDe, TEXTO_MISTO_PADRAO } from './propriedades-valor-misto';

/** Campo de texto no estado misto: vazio, com "Varia" no placeholder (some ao digitar). */
function aplicarMistoNoInput(input: HTMLInputElement, prop: ItemPropriedade, misto: boolean, texto: string): void {
  input.classList.toggle('ui-prop__editor--misto', misto);
  if (misto) input.placeholder = texto;
  else if (prop.placeholder) input.placeholder = prop.placeholder;
  else input.removeAttribute('placeholder');
}

/**
 * Valor somente leitura. Com `prop`, mostra o rótulo da opção, Sim/Não e as casas decimais
 * em vez do valor cru.
 */
export function criarEditorReadonly(valorAtual: any, obterTextoMisto?: () => string, prop?: ItemPropriedade): HTMLElement {
  const span = document.createElement('span');
  const atualizar = (valor: any) => {
    if (isValorMisto(valor)) {
      span.className = 'ui-prop__valor-readonly ui-prop__editor--misto';
      span.textContent = obterTextoMisto ? textoMistoDe({ obterTextoMisto }) : TEXTO_MISTO_PADRAO;
      return;
    }
    const isNumero = typeof valor === 'number' || (typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor.trim()));
    span.className = `ui-prop__valor-readonly ${isNumero ? 'ui-prop__valor-readonly--numero' : ''}`.trim();
    span.textContent = prop
      ? formatarValorExibicao(prop, valor)
      : valor !== undefined && valor !== null ? String(valor) : '—';
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
    const misto = isValorMisto(valor);
    const marcado = !misto && Boolean(valor);
    container.classList.toggle('ui-prop__editor--misto', misto);
    customCheck.classList.toggle('ui-prop__checkbox-custom--marcado', marcado);
    customCheck.classList.toggle('ui-prop__checkbox-custom--misto', misto);
    customCheck.textContent = misto ? '–' : marcado ? '✓' : '';
    rotulo.textContent = misto ? textoMistoDe(ctx) : marcado ? 'Sim' : 'Não';
    container.setAttribute('aria-checked', misto ? 'mixed' : String(marcado));
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(container, atualizar);

  container.appendChild(customCheck);
  container.appendChild(rotulo);

  const alternar = () => {
    // Do estado misto, o primeiro clique marca todos (como o checkbox indeterminado nativo)
    const atual = ctx.obterValorAtual(prop.id);
    const novoValor = isValorMisto(atual) ? true : !Boolean(atual);
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
      navegarAposEnter(ctx, container, e);
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

  const atualizar = (valor: any) => {
    select.classList.toggle('ui-prop__editor--misto', isValorMisto(valor));
    if (isValorMisto(valor)) marcarSelectMisto(select, textoMistoDe(ctx));
    else sincronizarSelect(select, valor);
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(select, atualizar);

  select.addEventListener('change', () => {
    // Devolve o id no tipo original da opção (número continua número)
    const opcao = (prop.opcoes || []).find(op => String(op.id) === select.value);
    ctx.registrarAlteracao(categoriaId, prop.id, opcao ? opcao.id : select.value);
    atualizar(ctx.obterValorAtual(prop.id));
  });

  select.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      navegarAposEnter(ctx, select, e);
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

const TEM_OPERADOR = /[+\-*/^%()x]/i;
const NUMERO_SIMPLES = /^[+-]?[0-9]*[.,]?[0-9]*$/;

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

  const formatarValor = (val: any) => (isValorMisto(val) ? '' : formatarNumero(val, prop.casasDecimais));

  /** Prévia do resultado ("= 15") ao digitar uma expressão; criada sob demanda ao lado do campo. */
  let previa: HTMLSpanElement | null = null;
  const esconderPrevia = () => {
    input.classList.remove('ui-prop__editor-input--calculando');
    if (previa) previa.hidden = true;
  };
  const mostrarPrevia = (texto: string) => {
    if (!previa) {
      if (!input.parentElement) return;
      previa = document.createElement('span');
      previa.className = 'ui-prop__previa-calculo';
      previa.setAttribute('aria-hidden', 'true');
      input.parentElement.appendChild(previa);
    }
    previa.textContent = texto;
    previa.hidden = false;
  };

  const atualizar = (valor: any) => {
    input.value = formatarValor(valor);
    aplicarMistoNoInput(input, prop, isValorMisto(valor), textoMistoDe(ctx));
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(input, atualizar);

  input.addEventListener('focus', () => {
    input.classList.remove('ui-prop__editor-input--invalido');
    input.select();
  });

  input.addEventListener('input', () => {
    input.classList.remove('ui-prop__editor-input--invalido');
    const val = input.value.trim();
    const calculando = TEM_OPERADOR.test(val) && !NUMERO_SIMPLES.test(val);
    input.classList.toggle('ui-prop__editor-input--calculando', calculando);
    if (!calculando) {
      esconderPrevia();
      return;
    }
    const resultado = interpretarEntradaNumerica(val, prop);
    mostrarPrevia(resultado === null ? '= ?' : `= ${formatarNumero(resultado, prop.casasDecimais)}`);
  });

  const commitNumero = () => {
    esconderPrevia();
    const raw = input.value.trim();
    const vAtual = ctx.obterValorAtual(prop.id);
    // Texto igual ao exibido: nada foi digitado. Sem isto, só passar pelo campo arredondaria
    // o valor às casas decimais ou trocaria "10" (texto) por 10 (número).
    if (raw === formatarValor(vAtual)) return;
    if (raw === '') {
      // Sair de "Varia" sem digitar mantém o valor de cada objeto
      if (isValorMisto(vAtual)) return;
      // O gerenciador ignora valor igual: change + blur não registram null duas vezes
      ctx.registrarAlteracao(categoriaId, prop.id, null);
      return;
    }

    const finalVal = interpretarEntradaNumerica(raw, prop);
    if (finalVal !== null) {
      ctx.registrarAlteracao(categoriaId, prop.id, finalVal);
      atualizar(ctx.obterValorAtual(prop.id));
    } else {
      // Expressão inválida: volta ao valor e sinaliza o campo (some ao digitar de novo)
      atualizar(vAtual);
      input.classList.add('ui-prop__editor-input--invalido');
    }
  };

  input.addEventListener('change', commitNumero);
  input.addEventListener('blur', commitNumero);
  input.addEventListener('animationend', () => input.classList.remove('ui-prop__editor-input--invalido'));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitNumero();
      navegarAposEnter(ctx, input, e);
    } else if (e.key === 'Escape') {
      esconderPrevia();
      atualizar(ctx.obterValorAtual(prop.id));
      input.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      // Expressão em edição ("10+5") é resolvida antes de incrementar
      const avaliado = interpretarEntradaNumerica(input.value, prop) ?? avaliarExpressaoMatematica(input.value);
      const vAtual = ctx.obterValorAtual(prop.id);
      // "Varia" não tem valor de partida: só incrementa o que o usuário já digitou
      if (avaliado === null && isValorMisto(vAtual)) return;
      const atual = avaliado ?? (Number(vAtual) || 0);
      const passo = passoNumerico(prop, { shift: e.shiftKey, alt: e.altKey });
      const bruto = e.key === 'ArrowUp' ? atual + passo : atual - passo;
      const novo = ajustarNumero(prop.casasDecimais === undefined ? Math.round(bruto * 100) / 100 : bruto, prop);

      esconderPrevia();
      ctx.registrarAlteracao(categoriaId, prop.id, novo);
      atualizar(novo);
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
  const atualizar = (valor: any) => {
    const misto = isValorMisto(valor);
    input.value = misto || valor == null ? '' : String(valor);
    aplicarMistoNoInput(input, prop, misto, textoMistoDe(ctx));
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(input, atualizar);

  input.addEventListener('focus', () => {
    input.select();
  });

  const commitTexto = () => {
    // Campo vazio a partir de "Varia" não apaga o texto de todos os objetos
    if (input.value === '' && isValorMisto(ctx.obterValorAtual(prop.id))) return;
    ctx.registrarAlteracao(categoriaId, prop.id, input.value);
    atualizar(ctx.obterValorAtual(prop.id));
  };

  input.addEventListener('change', commitTexto);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitTexto();
      navegarAposEnter(ctx, input, e);
    } else if (e.key === 'Escape') {
      atualizar(ctx.obterValorAtual(prop.id));
      input.blur();
    }
  });

  return input;
}
