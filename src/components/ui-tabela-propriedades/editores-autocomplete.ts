/**
 * Guia de funções para o campo numérico: ao digitar letras ("m"), lista as funções e constantes
 * correspondentes ("max", "min", "mod") com uma explicação curta da opção destacada (mouse ou teclado).
 * Setas navegam, Enter/Tab aceitam, Esc fecha. A lista vive no contêiner do painel (não na célula,
 * que corta o que ultrapassa) e é removida ao fechar.
 */

import { aplicarEntrada, sugerirEntradas, EntradaCatalogo, SugestaoExpressao } from './avaliador-catalogo';

export interface ControleAutocompletar {
  aberto: () => boolean;
  /** Trata a tecla se a lista estiver aberta; devolve `true` quando consumiu o evento. */
  tratarTecla: (e: KeyboardEvent) => boolean;
  fechar: () => void;
}

let contador = 0;

function obterContainer(input: HTMLInputElement): HTMLElement | null {
  const raiz = input.getRootNode() as ShadowRoot | Document;
  return ((raiz as ShadowRoot).getElementById?.('container') ?? null) as HTMLElement | null;
}

export function anexarAutocompleteFuncoes(input: HTMLInputElement): ControleAutocompletar {
  const id = `ui-prop-ac-${++contador}`;
  let lista: HTMLDivElement | null = null;
  let dica: HTMLDivElement | null = null;
  let itens: HTMLDivElement[] = [];
  let sugestao: SugestaoExpressao | null = null;
  let ativo = 0;

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');

  const destacar = (indice: number) => {
    if (!sugestao || itens.length === 0) return;
    ativo = (indice + itens.length) % itens.length;
    itens.forEach((el, i) => {
      const ligado = i === ativo;
      el.classList.toggle('ui-prop__ac-item--ativo', ligado);
      el.setAttribute('aria-selected', String(ligado));
    });
    input.setAttribute('aria-activedescendant', itens[ativo].id);
    if (dica) dica.textContent = sugestao.entradas[ativo].descricao;
    itens[ativo].scrollIntoView?.({ block: 'nearest' });
  };

  const posicionar = () => {
    const container = obterContainer(input);
    if (!lista || !container) return;
    const c = container.getBoundingClientRect();
    const r = input.getBoundingClientRect();
    const largura = Math.max(r.width, 190);
    const esquerda = Math.max(0, Math.min(r.right - c.left - largura, c.width - largura));
    lista.style.minWidth = `${largura}px`;
    lista.style.left = `${esquerda}px`;
    const altura = lista.offsetHeight || 0;
    const abaixo = r.bottom - c.top;
    // Sem espaço abaixo, abre acima do campo
    if (altura && abaixo + altura > c.height && r.top - c.top - altura > 0) {
      lista.style.top = `${r.top - c.top - altura}px`;
    } else {
      lista.style.top = `${abaixo}px`;
    }
  };

  const fechar = () => {
    if (lista) lista.remove();
    lista = null;
    dica = null;
    itens = [];
    sugestao = null;
    ativo = 0;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-controls');
    input.removeAttribute('aria-activedescendant');
  };

  const aceitar = (indice: number) => {
    if (!sugestao) return;
    const entrada: EntradaCatalogo | undefined = sugestao.entradas[indice];
    if (!entrada) return;
    const novo = aplicarEntrada(input.value, sugestao, entrada);
    fechar();
    input.value = novo.texto;
    try {
      input.setSelectionRange(novo.cursor, novo.cursor);
    } catch (_e) {}
    // Atualiza a prévia do cálculo, como se o usuário tivesse digitado
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const montar = (nova: SugestaoExpressao) => {
    const container = obterContainer(input);
    if (!container) return;
    if (!lista) {
      lista = document.createElement('div');
      lista.id = id;
      lista.className = 'ui-prop__ac';
      lista.setAttribute('part', 'autocomplete');
      lista.setAttribute('role', 'listbox');
      // Clicar na lista não pode tirar o foco do campo (o blur confirmaria o texto pela metade)
      lista.addEventListener('mousedown', (e) => e.preventDefault());
      container.appendChild(lista);
    }
    const listaAtual = lista;
    listaAtual.textContent = '';
    itens = nova.entradas.map((entrada, i) => {
      const el = document.createElement('div');
      el.id = `${id}-${i}`;
      el.className = 'ui-prop__ac-item';
      el.setAttribute('part', 'autocomplete-item');
      el.setAttribute('role', 'option');
      const nome = document.createElement('span');
      nome.className = 'ui-prop__ac-nome';
      nome.textContent = entrada.nome;
      const assinatura = document.createElement('span');
      assinatura.className = 'ui-prop__ac-assinatura';
      assinatura.textContent = entrada.assinatura;
      el.append(nome, assinatura);
      el.addEventListener('mouseenter', () => destacar(i));
      el.addEventListener('click', () => aceitar(i));
      listaAtual.appendChild(el);
      return el;
    });
    dica = document.createElement('div');
    dica.className = 'ui-prop__ac-dica';
    dica.setAttribute('part', 'autocomplete-dica');
    dica.setAttribute('aria-live', 'polite');
    listaAtual.appendChild(dica);

    sugestao = nova;
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', id);
    destacar(0);
    posicionar();
  };

  const atualizar = () => {
    const nova = sugerirEntradas(input.value, input.selectionStart ?? input.value.length);
    if (nova) montar(nova);
    else fechar();
  };

  input.addEventListener('input', atualizar);
  input.addEventListener('click', atualizar);
  input.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') atualizar();
  });
  input.addEventListener('blur', fechar);

  return {
    aberto: () => lista !== null,
    fechar,
    tratarTecla: (e: KeyboardEvent): boolean => {
      if (!lista) return false;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          destacar(ativo + 1);
          return true;
        case 'ArrowUp':
          e.preventDefault();
          destacar(ativo - 1);
          return true;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          aceitar(ativo);
          return true;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          fechar();
          return true;
        default:
          return false;
      }
    }
  };
}
