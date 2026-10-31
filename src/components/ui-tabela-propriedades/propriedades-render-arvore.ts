import { ItemPropriedade, CategoriaPropriedades } from './tipos';
import { criarEditorValor, ContextoEditorPropriedade } from './propriedades-editores';
import { isValorMisto, valorInicialDaPropriedade, valoresIguais } from './propriedades-valor-misto';
import { alternarPart } from '../../core/parts';
import { obterCasasDecimais, aplicarLimitesNumericos } from './editores-basicos';

export interface ContextoLinhaPropriedade {
  valoresAtuais: Record<string, any>;
  /** Valores do último carregar/aplicar: a linha é marcada como modificada quando difere deles. */
  valoresOriginais: Record<string, any>;
  /** @deprecated Não é mais usado: o destaque compara cada valor com o original. */
  isDirty?: boolean;
  editorCtx: ContextoEditorPropriedade;
  onAtualizarCampoVisual: (propId: string, novoValor: any) => void;
}

export interface OpcoesRenderArvore {
  listaContainer: HTMLElement;
  categorias: CategoriaPropriedades[];
  termoBusca: string;
  onToggleCategoria: (idCategoria: string) => void;
  linhaCtx: ContextoLinhaPropriedade;
}

/**
 * Renderiza todas as categorias e suas propriedades filtradas
 */
export function renderizarCategoriasETree(opcoes: OpcoesRenderArvore): void {
  const { listaContainer, categorias, termoBusca, onToggleCategoria, linhaCtx } = opcoes;
  listaContainer.innerHTML = '';

  const categoriasValidas = (Array.isArray(categorias) ? categorias : []).filter(
    (c): c is CategoriaPropriedades => Boolean(c && typeof c === 'object')
  );

  if (categoriasValidas.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'ui-prop__vazio';
    vazio.setAttribute('part', 'vazio');
    vazio.textContent = 'Nenhuma propriedade disponível.';
    listaContainer.appendChild(vazio);
    return;
  }

  const fragment = document.createDocumentFragment();
  const termo = (termoBusca || '').trim().toLowerCase();
  let totalExibidas = 0;

  categoriasValidas.forEach(cat => {
    const tituloCat = String(cat.titulo ?? cat.id ?? '').toLowerCase();
    const categoriaCasou = Boolean(termo) && tituloCat.includes(termo);

    const propriedadesFiltradas = (Array.isArray(cat.propriedades) ? cat.propriedades : []).filter(prop => {
      if (!prop || typeof prop !== 'object' || prop.id === undefined || prop.id === null) return false;
      if (!termo || categoriaCasou) return true;

      const rotulo = String(prop.rotulo ?? '').toLowerCase();
      const id = String(prop.id).toLowerCase();
      const valorStr = String(linhaCtx.valoresAtuais[prop.id] ?? '').toLowerCase();
      return rotulo.includes(termo) || id.includes(termo) || valorStr.includes(termo);
    });

    if (termo && propriedadesFiltradas.length === 0) {
      return;
    }

    totalExibidas += propriedadesFiltradas.length;

    // Durante a busca as categorias com resultado ficam abertas (sem alterar cat.aberto)
    const abertoPadrao = cat.aberto !== undefined ? cat.aberto !== false : cat.aberta !== false;
    const isAberta = Boolean(termo) || abertoPadrao;

    const catEl = document.createElement('div');
    catEl.className = `ui-prop__categoria ${isAberta ? 'ui-prop__categoria--aberta' : ''}`;
    catEl.setAttribute('data-cat-id', String(cat.id));
    catEl.setAttribute('part', 'categoria');
    alternarPart(catEl, 'categoria-aberta', isAberta);

    // Header da Categoria (botão de expandir/recolher acessível por teclado)
    const headerEl = document.createElement('div');
    headerEl.className = 'ui-prop__categoria-header';
    headerEl.setAttribute('part', 'categoria-cabecalho');
    headerEl.setAttribute('role', 'button');
    headerEl.tabIndex = 0;
    headerEl.setAttribute('aria-expanded', String(isAberta));

    const tituloBloco = document.createElement('div');
    tituloBloco.className = 'ui-prop__categoria-titulo-bloco';

    const setaEl = document.createElement('span');
    setaEl.className = 'ui-prop__categoria-seta';
    setaEl.setAttribute('aria-hidden', 'true');
    setaEl.textContent = '▶';

    const tituloTexto = document.createElement('span');
    tituloTexto.textContent = String(cat.titulo ?? cat.id);

    tituloBloco.appendChild(setaEl);
    tituloBloco.appendChild(tituloTexto);

    const contador = document.createElement('span');
    contador.className = 'ui-prop__categoria-contador';
    contador.textContent = String(propriedadesFiltradas.length);

    headerEl.appendChild(tituloBloco);
    headerEl.appendChild(contador);

    // Clique e interação acessível por teclado (WAI-ARIA Accordion)
    headerEl.addEventListener('click', () => onToggleCategoria(String(cat.id)));
    headerEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggleCategoria(String(cat.id));
      } else if (e.key === 'ArrowRight') {
        if (!catEl.classList.contains('ui-prop__categoria--aberta')) {
          e.preventDefault();
          onToggleCategoria(String(cat.id));
        }
      } else if (e.key === 'ArrowLeft') {
        if (catEl.classList.contains('ui-prop__categoria--aberta')) {
          e.preventDefault();
          onToggleCategoria(String(cat.id));
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const todosHeaders = Array.from(listaContainer.querySelectorAll<HTMLElement>('.ui-prop__categoria-header'));
        const idx = todosHeaders.indexOf(headerEl);
        if (idx !== -1) {
          const proxIdx = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
          if (proxIdx >= 0 && proxIdx < todosHeaders.length) {
            e.preventDefault();
            todosHeaders[proxIdx].focus();
          }
        }
      } else if (e.key === 'Home') {
        const primeiro = listaContainer.querySelector<HTMLElement>('.ui-prop__categoria-header');
        if (primeiro) {
          e.preventDefault();
          primeiro.focus();
        }
      } else if (e.key === 'End') {
        const todos = listaContainer.querySelectorAll<HTMLElement>('.ui-prop__categoria-header');
        if (todos.length > 0) {
          e.preventDefault();
          todos[todos.length - 1].focus();
        }
      }
    });

    // Conteúdo da Categoria (Linhas)
    const conteudoEl = document.createElement('div');
    conteudoEl.className = 'ui-prop__categoria-conteudo';
    conteudoEl.setAttribute('part', 'categoria-conteudo');

    propriedadesFiltradas.forEach(prop => {
      const linhaEl = criarLinhaPropriedade(String(cat.id), prop, linhaCtx);
      conteudoEl.appendChild(linhaEl);
    });

    catEl.appendChild(headerEl);
    catEl.appendChild(conteudoEl);
    fragment.appendChild(catEl);
  });

  if (termo && totalExibidas === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'ui-prop__vazio';
    vazio.setAttribute('part', 'vazio');
    vazio.textContent = `Nenhuma propriedade encontrada para "${termoBusca}".`;
    listaContainer.appendChild(vazio);
    return;
  }

  listaContainer.appendChild(fragment);
}

/**
 * Cria a linha individual de uma propriedade com rótulo, scrubber e editor
 */
export function criarLinhaPropriedade(
  categoriaId: string,
  prop: ItemPropriedade,
  ctx: ContextoLinhaPropriedade
): HTMLDivElement {
  const linha = document.createElement('div');
  linha.className = 'ui-prop__linha';
  linha.setAttribute('data-prop-id', String(prop.id));
  linha.setAttribute('part', 'linha');

  const valorAtual = ctx.valoresAtuais[prop.id] !== undefined ? ctx.valoresAtuais[prop.id] : valorInicialDaPropriedade(prop);
  const valorOriginal = prop.id in ctx.valoresOriginais ? ctx.valoresOriginais[prop.id] : valorInicialDaPropriedade(prop);

  const modificada = !valoresIguais(valorAtual, valorOriginal);
  const mista = isValorMisto(valorAtual);

  if (modificada) {
    linha.classList.add('ui-prop__linha--modificada');
    alternarPart(linha, 'linha-modificada', true);
  }
  if (mista) {
    linha.classList.add('ui-prop__linha--misto');
    alternarPart(linha, 'linha-mista', true);
  }

  linha.addEventListener('dblclick', () => {
    const editor = linha.querySelector<HTMLElement>(
      'input:not([type="color"]):not(.ui-prop__cor-picker-oculto), select, .ui-prop__btn-acao-inline'
    );
    if (editor) {
      editor.focus();
      if (editor instanceof HTMLInputElement) {
        editor.select();
      }
    }
  });

  // Coluna 1: Rótulo
  const colRotulo = document.createElement('div');
  colRotulo.className = 'ui-prop__col-rotulo';
  colRotulo.setAttribute('part', 'rotulo');
  const rotuloTexto = String(prop.rotulo ?? prop.id);
  colRotulo.title = prop.dica ? `${rotuloTexto} — ${prop.dica}` : rotuloTexto;

  const spanRotulo = document.createElement('span');
  spanRotulo.textContent = rotuloTexto;
  colRotulo.appendChild(spanRotulo);

  // Scrubber numérico (estilo CAD / Blender / Figma)
  if (prop.tipo === 'numero' && !prop.somenteLeitura) {
    configurarScrubberNumerico(colRotulo, categoriaId, prop, ctx);
  }

  // Coluna 2: Editor de Valor
  const colValor = document.createElement('div');
  colValor.className = 'ui-prop__col-valor';
  colValor.setAttribute('part', 'valor');

  const editorEl = criarEditorValor(categoriaId, prop, valorAtual, ctx.editorCtx);
  colValor.appendChild(editorEl);

  if (prop.unidade) {
    const unidadeSpan = document.createElement('span');
    unidadeSpan.className = 'ui-prop__unidade-sufixo';
    unidadeSpan.setAttribute('part', 'unidade');
    unidadeSpan.textContent = prop.unidade;
    colValor.appendChild(unidadeSpan);
  }

  linha.appendChild(colRotulo);
  linha.appendChild(colValor);
  return linha;
}

function configurarScrubberNumerico(
  colRotulo: HTMLElement,
  categoriaId: string,
  prop: ItemPropriedade,
  ctx: ContextoLinhaPropriedade
): void {
  colRotulo.classList.add('ui-prop__col-rotulo--scrub');
  const rotuloTexto = String(prop.rotulo ?? prop.id);
  const dicaBase = prop.dica ? `${rotuloTexto} — ${prop.dica}` : rotuloTexto;
  colRotulo.title = `${dicaBase} (Arraste para ajustar, duplo-clique para editar)`;

  let startX = 0;
  let valorInicial = 0;
  let arrastou = false;

  colRotulo.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return;
    // Sem valor de partida: arrastar a partir de "Varia" igualaria todos a um número arbitrário
    if (isValorMisto(ctx.editorCtx.obterValorAtual(prop.id))) return;
    startX = e.clientX;
    // Valor vivo (não o retrato da renderização): cada arrasto continua de onde o anterior parou
    const vAtual = ctx.editorCtx.obterValorAtual(prop.id);
    valorInicial = typeof vAtual === 'number' ? vAtual : (parseFloat(String(vAtual || 0)) || 0);
    arrastou = false;

    try {
      colRotulo.setPointerCapture(e.pointerId);
    } catch (_err) {}
    colRotulo.classList.add('ui-prop__col-rotulo--arrastando');

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (Math.abs(deltaX) > 2) {
        arrastou = true;
      }

      if (arrastou) {
        let fator = 1;
        if (moveEvent.shiftKey) fator = 0.1;
        else if (moveEvent.ctrlKey || moveEvent.metaKey) fator = 10;

        const casas = obterCasasDecimais(prop);
        const sensibilidade = (typeof prop.passo === 'number' && prop.passo > 0)
          ? prop.passo * 0.01
          : (typeof prop.step === 'number' && prop.step > 0)
            ? prop.step * 0.01
            : Math.pow(10, -Math.min(casas !== undefined ? casas : 2, 2));

        let novo = valorInicial + (deltaX * sensibilidade * fator);
        novo = aplicarLimitesNumericos(novo, prop);

        if (casas !== undefined) {
          novo = Number(novo.toFixed(casas));
        } else {
          novo = Math.round(novo * 100) / 100;
        }

        ctx.editorCtx.registrarAlteracao(categoriaId, prop.id, novo);
        ctx.onAtualizarCampoVisual(prop.id, novo);
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      colRotulo.classList.remove('ui-prop__col-rotulo--arrastando');
      try {
        if (colRotulo.hasPointerCapture(upEvent.pointerId)) {
          colRotulo.releasePointerCapture(upEvent.pointerId);
        }
      } catch (_err) {}

      colRotulo.removeEventListener('pointermove', onPointerMove);
      colRotulo.removeEventListener('pointerup', onPointerUp);
      colRotulo.removeEventListener('pointercancel', onPointerUp);
    };

    colRotulo.addEventListener('pointermove', onPointerMove);
    colRotulo.addEventListener('pointerup', onPointerUp);
    colRotulo.addEventListener('pointercancel', onPointerUp);
  });
}
