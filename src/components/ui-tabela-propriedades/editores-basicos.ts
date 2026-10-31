import { ItemPropriedade, ContextoEditorPropriedade } from './tipos';
import { avaliarExpressaoMatematica } from './avaliador-expressao';
import { marcarSelectMisto, registrarAtualizadorEditor, sincronizarSelect } from './propriedades-dom-utils';
import { isValorMisto, textoMistoDe, TEXTO_MISTO_PADRAO } from './propriedades-valor-misto';

export function obterCasasDecimais(prop: ItemPropriedade): number | undefined {
  if (typeof prop.casasDecimais === 'number' && prop.casasDecimais >= 0) return prop.casasDecimais;
  if (typeof prop.precisao === 'number' && prop.precisao >= 0) return prop.precisao;
  return undefined;
}

export function obterPassoNumerico(prop: ItemPropriedade, casas?: number): number {
  if (typeof prop.passo === 'number' && prop.passo > 0) return prop.passo;
  if (typeof prop.step === 'number' && prop.step > 0) return prop.step;
  return casas !== undefined ? Math.pow(10, -casas) : 1;
}

export function aplicarLimitesNumericos(valor: number, prop: ItemPropriedade): number {
  let res = valor;
  if (typeof prop.min === 'number' && Number.isFinite(prop.min)) {
    res = Math.max(prop.min, res);
  }
  if (typeof prop.max === 'number' && Number.isFinite(prop.max)) {
    res = Math.min(prop.max, res);
  }
  return res;
}

/** Campo de texto no estado misto: vazio, com "Varia" no placeholder (some ao digitar). */
function aplicarMistoNoInput(input: HTMLInputElement, prop: ItemPropriedade, misto: boolean, texto: string): void {
  input.classList.toggle('ui-prop__editor--misto', misto);
  if (misto) input.placeholder = texto;
  else if (prop.placeholder) input.placeholder = prop.placeholder;
  else input.removeAttribute('placeholder');
}

export function criarEditorReadonly(
  valorAtual: any,
  obterTextoMisto?: () => string,
  prop?: ItemPropriedade
): HTMLElement {
  const span = document.createElement('span');
  const casas = prop ? obterCasasDecimais(prop) : undefined;

  const atualizar = (valor: any) => {
    if (isValorMisto(valor)) {
      span.className = 'ui-prop__valor-readonly ui-prop__editor--misto';
      span.textContent = obterTextoMisto ? textoMistoDe({ obterTextoMisto }) : TEXTO_MISTO_PADRAO;
      return;
    }
    if (valor === undefined || valor === null) {
      span.className = 'ui-prop__valor-readonly';
      span.textContent = '—';
      return;
    }
    if (prop?.tipo === 'booleano' && typeof valor === 'boolean') {
      span.className = 'ui-prop__valor-readonly';
      span.textContent = valor ? 'Sim' : 'Não';
      return;
    }
    if (prop?.opcoes && prop.opcoes.length > 0) {
      const op = prop.opcoes.find(o => o && String(o.id) === String(valor));
      if (op) {
        span.className = 'ui-prop__valor-readonly';
        span.textContent = op.rotulo;
        return;
      }
    }
    const isNumero = typeof valor === 'number' || (typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor.trim()));
    span.className = `ui-prop__valor-readonly ${isNumero ? 'ui-prop__valor-readonly--numero' : ''}`.trim();
    if (isNumero && casas !== undefined) {
      const n = Number(valor);
      span.textContent = Number.isFinite(n) ? n.toFixed(casas) : String(valor);
    } else {
      span.textContent = String(valor);
    }
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
  container.setAttribute('aria-label', String(prop.rotulo ?? prop.id));

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
      if (e.shiftKey && ctx.focarEditorAnterior) ctx.focarEditorAnterior(container);
      else ctx.focarProximoEditor(container);
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
  select.setAttribute('aria-label', String(prop.rotulo ?? prop.id));

  (Array.isArray(prop.opcoes) ? prop.opcoes : []).forEach(op => {
    if (!op || typeof op !== 'object') return;
    const opt = document.createElement('option');
    opt.value = String(op.id);
    opt.textContent = String(op.rotulo ?? op.id);
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
    const opcao = (prop.opcoes || []).find(op => op && String(op.id) === select.value);
    ctx.registrarAlteracao(categoriaId, prop.id, opcao ? opcao.id : select.value);
    atualizar(ctx.obterValorAtual(prop.id));
  });

  select.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey && ctx.focarEditorAnterior) ctx.focarEditorAnterior(select);
      else ctx.focarProximoEditor(select);
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
  input.setAttribute('aria-label', String(prop.rotulo ?? prop.id));
  if (prop.placeholder) input.placeholder = prop.placeholder;

  const casas = obterCasasDecimais(prop);

  const formatarValor = (val: any) => {
    if (val === undefined || val === null || val === '' || isValorMisto(val)) return '';
    const n = Number(val);
    if (isNaN(n)) return String(val);
    if (casas !== undefined) {
      return n.toFixed(casas);
    }
    return String(n);
  };

  const atualizar = (valor: any) => {
    input.value = formatarValor(valor);
    aplicarMistoNoInput(input, prop, isValorMisto(valor), textoMistoDe(ctx));
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(input, atualizar);

  input.addEventListener('focus', () => {
    input.select();
  });

  input.addEventListener('input', () => {
    const val = input.value.trim();
    const ehNumeroSimples = /^[+-]?[0-9]*[.,]?[0-9]*$/.test(val);
    const contemOperadores = !ehNumeroSimples && (val.startsWith('=') || /[\+\-\*\/\^\%\(\);]|^[a-zA-Z_π]/.test(val));
    input.classList.toggle('ui-prop__editor-input--calculando', contemOperadores);
    if (contemOperadores) {
      const previa = avaliarExpressaoMatematica(val);
      input.title = previa !== null ? `= ${casas !== undefined ? Number(previa.toFixed(casas)) : previa}` : '';
    } else {
      input.title = '';
    }
  });

  const commitNumero = () => {
    input.classList.remove('ui-prop__editor-input--calculando');
    input.title = '';
    const raw = input.value.trim();
    if (raw === '') {
      // Sair de "Varia" sem digitar mantém o valor de cada objeto
      if (isValorMisto(ctx.obterValorAtual(prop.id))) return;
      // O gerenciador ignora valor igual: change + blur não registram null duas vezes
      ctx.registrarAlteracao(categoriaId, prop.id, null);
      return;
    }

    const calculado = avaliarExpressaoMatematica(raw);
    if (calculado !== null && !isNaN(calculado)) {
      let finalVal = aplicarLimitesNumericos(calculado, prop);
      if (casas !== undefined) {
        finalVal = Number(finalVal.toFixed(casas));
      }
      ctx.registrarAlteracao(categoriaId, prop.id, finalVal);
      atualizar(finalVal);
    } else {
      atualizar(ctx.obterValorAtual(prop.id));
    }
  };

  input.addEventListener('change', commitNumero);
  input.addEventListener('blur', commitNumero);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitNumero();
      if (e.shiftKey && ctx.focarEditorAnterior) ctx.focarEditorAnterior(input);
      else ctx.focarProximoEditor(input);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      input.classList.remove('ui-prop__editor-input--calculando');
      input.title = '';
      atualizar(ctx.obterValorAtual(prop.id));
      input.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      // Expressão em edição ("10+5") é resolvida antes de incrementar
      const avaliado = avaliarExpressaoMatematica(input.value);
      const vAtual = ctx.obterValorAtual(prop.id);
      // "Varia" não tem valor de partida: só incrementa o que o usuário já digitou
      if (avaliado === null && isValorMisto(vAtual)) return;
      const atual = avaliado ?? (Number(vAtual) || 0);
      let passo = obterPassoNumerico(prop, casas);
      if (e.shiftKey) passo *= 10;
      else if (e.altKey && casas === undefined) passo *= 0.1;

      let novo = e.key === 'ArrowUp' ? atual + passo : atual - passo;
      novo = aplicarLimitesNumericos(novo, prop);
      if (casas !== undefined) {
        novo = Number(novo.toFixed(casas));
      } else {
        novo = Math.round(novo * 10000) / 10000;
      }

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
  input.setAttribute('aria-label', String(prop.rotulo ?? prop.id));
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
  input.addEventListener('blur', commitTexto);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitTexto();
      if (e.shiftKey && ctx.focarEditorAnterior) ctx.focarEditorAnterior(input);
      else ctx.focarProximoEditor(input);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      atualizar(ctx.obterValorAtual(prop.id));
      input.blur();
    }
  });

  return input;
}
