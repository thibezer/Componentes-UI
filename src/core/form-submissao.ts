/**
 * Submissão de formulários a partir de controles encapsulados no Shadow DOM.
 * O <button> e o <input> internos não pertencem ao <form> do consumidor, então
 * o navegador não reconhece o botão como "submitter" nem o Enter no campo como
 * submissão implícita. Estas funções reproduzem o comportamento nativo.
 */

const SELETOR_BOTAO_SUBMIT = [
  'button:not([type])',
  'button[type="submit"]',
  'input[type="submit"]',
  'input[type="image"]',
  'ui-botao[type="submit"]',
  'ui-botao[tipo-submit]',
  'ui-botao-primario[type="submit"]',
  'ui-botao-primario[tipo-submit]'
].join(', ');

/** Campos que, sozinhos no formulário, permitem submeter com Enter mesmo sem botão (HTML §4.10.21.2). */
const SELETOR_CAMPO_IMPLICITO = [
  'input:not([type])',
  ...['text', 'search', 'url', 'tel', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number']
    .map((tipo) => `input[type="${tipo}"]`),
  'ui-campo-texto',
  'ui-input'
].join(', ');

/** Elementos do formulário que casam com o seletor, incluindo os associados por `form="id"`, em ordem do documento. */
function elementosDoFormulario(form: HTMLFormElement, seletor: string): HTMLElement[] {
  const internos = Array.from(form.querySelectorAll<HTMLElement>(seletor)).filter((el) => {
    const alvo = el.getAttribute('form');
    return !alvo || alvo === form.id;
  });
  if (!form.id) return internos;

  const externos = Array.from(
    (form.getRootNode() as Document | ShadowRoot).querySelectorAll<HTMLElement>(`[form="${CSS.escape(form.id)}"]`)
  ).filter((el) => !form.contains(el) && el.matches(seletor));

  return [...internos, ...externos].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
}

function estaDesabilitado(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return true;
  try {
    return el.matches(':disabled');
  } catch {
    return false;
  }
}

/**
 * Submete o formulário com validação nativa. Quando `nome` é informado, um <button>
 * temporário leva o par nome/valor ao FormData, como faria um submitter nativo.
 */
export function submeterFormulario(form: HTMLFormElement, nome?: string | null, valor?: string | null): void {
  if (!nome) {
    form.requestSubmit();
    return;
  }

  const submitter = document.createElement('button');
  submitter.type = 'submit';
  submitter.name = nome;
  submitter.value = valor ?? '';
  submitter.hidden = true;
  form.append(submitter);
  try {
    form.requestSubmit(submitter);
  } finally {
    submitter.remove();
  }
}

/**
 * Submissão implícita (Enter em um campo de texto): aciona o botão padrão do formulário
 * ou, sem botão, submete apenas se houver um único campo de texto.
 */
export function submeterImplicitamente(form: HTMLFormElement): void {
  const botaoPadrao = elementosDoFormulario(form, SELETOR_BOTAO_SUBMIT)[0];
  if (botaoPadrao) {
    if (!estaDesabilitado(botaoPadrao)) botaoPadrao.click();
    return;
  }

  if (elementosDoFormulario(form, SELETOR_CAMPO_IMPLICITO).length === 1) {
    form.requestSubmit();
  }
}
