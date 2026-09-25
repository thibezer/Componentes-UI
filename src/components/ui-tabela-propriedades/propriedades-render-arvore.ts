import { ItemPropriedade, CategoriaPropriedades } from './tipos';
import { criarEditorValor, ContextoEditorPropriedade } from './propriedades-editores';

export interface ContextoLinhaPropriedade {
  valoresAtuais: Record<string, any>;
  valoresOriginais: Record<string, any>;
  isDirty: boolean;
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

  if (!categorias || categorias.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'ui-prop__vazio';
    vazio.textContent = 'Nenhuma propriedade disponível.';
    listaContainer.appendChild(vazio);
    return;
  }

  const fragment = document.createDocumentFragment();

  categorias.forEach(cat => {
    const propriedadesFiltradas = (cat.propriedades || []).filter(prop => {
      if (!termoBusca) return true;
      return (
        prop.rotulo.toLowerCase().includes(termoBusca) ||
        String(prop.id).toLowerCase().includes(termoBusca)
      );
    });

    if (termoBusca && propriedadesFiltradas.length === 0) {
      return;
    }

    const isAberta = cat.aberto !== false;
    const catEl = document.createElement('div');
    catEl.className = `ui-prop__categoria ${isAberta ? 'ui-prop__categoria--aberta' : ''}`;
    catEl.setAttribute('data-cat-id', cat.id);

    // Header da Categoria
    const headerEl = document.createElement('div');
    headerEl.className = 'ui-prop__categoria-header';

    const tituloBloco = document.createElement('div');
    tituloBloco.className = 'ui-prop__categoria-titulo-bloco';

    const setaEl = document.createElement('span');
    setaEl.className = 'ui-prop__categoria-seta';
    setaEl.textContent = '▶';

    const tituloTexto = document.createElement('span');
    tituloTexto.textContent = cat.titulo;

    tituloBloco.appendChild(setaEl);
    tituloBloco.appendChild(tituloTexto);

    const contador = document.createElement('span');
    contador.className = 'ui-prop__categoria-contador';
    contador.textContent = String(propriedadesFiltradas.length);

    headerEl.appendChild(tituloBloco);
    headerEl.appendChild(contador);

    headerEl.addEventListener('click', () => onToggleCategoria(cat.id));
    headerEl.addEventListener('dblclick', () => onToggleCategoria(cat.id));

    // Conteúdo da Categoria (Linhas)
    const conteudoEl = document.createElement('div');
    conteudoEl.className = 'ui-prop__categoria-conteudo';

    propriedadesFiltradas.forEach(prop => {
      const linhaEl = criarLinhaPropriedade(cat.id, prop, linhaCtx);
      conteudoEl.appendChild(linhaEl);
    });

    catEl.appendChild(headerEl);
    catEl.appendChild(conteudoEl);
    fragment.appendChild(catEl);
  });

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
  linha.setAttribute('data-prop-id', prop.id);

  const valorAtual = ctx.valoresAtuais[prop.id] !== undefined ? ctx.valoresAtuais[prop.id] : prop.valor;
  const valorOriginal = ctx.valoresOriginais[prop.id];

  if (ctx.isDirty && valorAtual !== valorOriginal) {
    linha.classList.add('ui-prop__linha--modificada');
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
  colRotulo.title = prop.rotulo;
  const spanRotulo = document.createElement('span');
  spanRotulo.textContent = prop.rotulo;
  colRotulo.appendChild(spanRotulo);

  // Scrubber numérico (estilo CAD / Blender / Figma)
  if (prop.tipo === 'numero' && !prop.somenteLeitura) {
    configurarScrubberNumerico(colRotulo, categoriaId, prop, ctx);
  }

  // Coluna 2: Editor de Valor
  const colValor = document.createElement('div');
  colValor.className = 'ui-prop__col-valor';

  const editorEl = criarEditorValor(categoriaId, prop, valorAtual, ctx.editorCtx);
  colValor.appendChild(editorEl);

  if (prop.unidade) {
    const unidadeSpan = document.createElement('span');
    unidadeSpan.className = 'ui-prop__unidade-sufixo';
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
  colRotulo.title = `${prop.rotulo} (Arraste para ajustar, duplo-clique para editar)`;

  let startX = 0;
  let valorInicial = 0;
  let arrastou = false;

  colRotulo.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return;
    startX = e.clientX;
    const vAtual = ctx.valoresAtuais[prop.id];
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

        const casas = prop.casasDecimais !== undefined ? prop.casasDecimais : 2;
        const passoBase = Math.pow(10, -Math.min(casas, 2));
        let novo = valorInicial + (deltaX * passoBase * fator);

        if (prop.casasDecimais !== undefined) {
          novo = Number(novo.toFixed(prop.casasDecimais));
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
