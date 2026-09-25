/**
 * Renderizador da barra seletora de tipos e famílias (<ui-tabela-propriedades>).
 * Suporta o estilo 'revit' (com card de família, miniatura e botão 'Editar tipo')
 * e o estilo 'autocad' (com dropdown compacto e ações rápidas: Quick Select, Select Objects e Calculadora).
 */

import type { SeletorTipoItem } from './tipos';

export interface ContextoSeletorTipo {
  tipoContainerElement: HTMLElement | null;
  tipos: SeletorTipoItem[];
  tipoSelecionadoId: string;
  estiloVisual: string;
  onSelecionarTipo: (id: string) => void;
  onEditarTipo: (tipo: SeletorTipoItem) => void;
  onQuickSelect: (tipo: SeletorTipoItem) => void;
  onSelectObjects: (tipo: SeletorTipoItem) => void;
  onCalculadora: (tipo: SeletorTipoItem) => void;
}

export function renderizarSeletorTipos(ctx: ContextoSeletorTipo): void {
  if (!ctx.tipoContainerElement) return;

  if (!ctx.tipos || ctx.tipos.length === 0) {
    ctx.tipoContainerElement.style.display = 'none';
    return;
  }

  ctx.tipoContainerElement.style.display = 'flex';
  ctx.tipoContainerElement.innerHTML = '';

  const tipoAtual = ctx.tipos.find(t => String(t.id) === String(ctx.tipoSelecionadoId)) || ctx.tipos[0];

  if (ctx.estiloVisual === 'revit') {
    // 1. Card Grande de Tipo (Estilo Revit)
    const card = document.createElement('div');
    card.className = 'ui-prop__tipo-revit-card';

    const miniatura = document.createElement('div');
    miniatura.className = 'ui-prop__tipo-miniatura';
    if (tipoAtual.iconeSvg) {
      miniatura.innerHTML = tipoAtual.iconeSvg;
    } else {
      miniatura.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <path d="M3 9h18M9 21V9"></path>
        </svg>
      `;
    }

    const info = document.createElement('div');
    info.className = 'ui-prop__tipo-info';

    const nome = document.createElement('div');
    nome.className = 'ui-prop__tipo-nome';
    nome.textContent = tipoAtual.rotulo;

    const subtexto = document.createElement('div');
    subtexto.className = 'ui-prop__tipo-subtexto';
    subtexto.textContent = tipoAtual.subtipo || 'Tipo de Família';

    info.appendChild(nome);
    info.appendChild(subtexto);
    card.appendChild(miniatura);
    card.appendChild(info);

    // Sub-barra: Dropdown de seleção de instância/tipo + Botão "Editar tipo"
    const subbarra = document.createElement('div');
    subbarra.className = 'ui-prop__tipo-revit-subbarra';

    const select = document.createElement('select');
    select.className = 'ui-prop__tipo-select';
    ctx.tipos.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.rotulo}${t.subtipo ? ` : ${t.subtipo}` : ''}`;
      if (String(t.id) === String(ctx.tipoSelecionadoId)) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      ctx.onSelecionarTipo(select.value);
    });

    const btnEditarTipo = document.createElement('button');
    btnEditarTipo.type = 'button';
    btnEditarTipo.className = 'ui-prop__btn-editar-tipo';
    btnEditarTipo.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: -1px;">
        <rect x="3" y="3" width="12" height="12" rx="1"></rect>
        <rect x="9" y="9" width="12" height="12" rx="1"></rect>
      </svg>
      <span>Editar tipo</span>
    `;
    btnEditarTipo.addEventListener('click', () => {
      ctx.onEditarTipo(tipoAtual);
    });

    subbarra.appendChild(select);
    subbarra.appendChild(btnEditarTipo);

    ctx.tipoContainerElement.appendChild(card);
    ctx.tipoContainerElement.appendChild(subbarra);
  } else {
    // 2. Barra Compacta (Estilo AutoCAD com Ações Rápidas)
    const autocadBar = document.createElement('div');
    autocadBar.className = 'ui-prop__tipo-autocad-bar';

    const select = document.createElement('select');
    select.className = 'ui-prop__tipo-select';
    ctx.tipos.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.rotulo;
      if (String(t.id) === String(ctx.tipoSelecionadoId)) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      ctx.onSelecionarTipo(select.value);
    });

    // Botões de Ação Clássicos do AutoCAD (Quick Select, Select Objects, QuickCalc)
    const acoesDiv = document.createElement('div');
    acoesDiv.className = 'ui-prop__tipo-autocad-acoes';

    // 1. Quick Select
    const btnQuickSelect = document.createElement('button');
    btnQuickSelect.type = 'button';
    btnQuickSelect.className = 'ui-prop__btn-autocad';
    btnQuickSelect.title = 'Seleção rápida';
    btnQuickSelect.setAttribute('aria-label', 'Seleção rápida');
    btnQuickSelect.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    `;
    btnQuickSelect.addEventListener('click', () => {
      ctx.onQuickSelect(tipoAtual);
    });

    // 2. Select Objects
    const btnSelectObjects = document.createElement('button');
    btnSelectObjects.type = 'button';
    btnSelectObjects.className = 'ui-prop__btn-autocad';
    btnSelectObjects.title = 'Selecionar objetos';
    btnSelectObjects.setAttribute('aria-label', 'Selecionar objetos');
    btnSelectObjects.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="7"></circle>
        <line x1="12" y1="2" x2="12" y2="7"></line>
        <line x1="12" y1="17" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="7" y2="12"></line>
        <line x1="17" y1="12" x2="22" y2="12"></line>
        <line x1="12" y1="9" x2="12" y2="15" stroke-width="2.5"></line>
        <line x1="9" y1="12" x2="15" y2="12" stroke-width="2.5"></line>
      </svg>
    `;
    btnSelectObjects.addEventListener('click', () => {
      ctx.onSelectObjects(tipoAtual);
    });

    // 3. QuickCalc (Calculadora)
    const btnCalc = document.createElement('button');
    btnCalc.type = 'button';
    btnCalc.className = 'ui-prop__btn-autocad';
    btnCalc.title = 'Calculadora rápida';
    btnCalc.setAttribute('aria-label', 'Calculadora rápida');
    btnCalc.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="2" width="16" height="20" rx="2"></rect>
        <line x1="8" y1="6" x2="16" y2="6"></line>
        <circle cx="8" cy="11" r="1" fill="currentColor"></circle>
        <circle cx="12" cy="11" r="1" fill="currentColor"></circle>
        <circle cx="16" cy="11" r="1" fill="currentColor"></circle>
        <circle cx="8" cy="15" r="1" fill="currentColor"></circle>
        <circle cx="12" cy="15" r="1" fill="currentColor"></circle>
        <circle cx="16" cy="15" r="1" fill="currentColor"></circle>
      </svg>
    `;
    btnCalc.addEventListener('click', () => {
      ctx.onCalculadora(tipoAtual);
    });

    acoesDiv.appendChild(btnQuickSelect);
    acoesDiv.appendChild(btnSelectObjects);
    acoesDiv.appendChild(btnCalc);

    autocadBar.appendChild(select);
    autocadBar.appendChild(acoesDiv);
    ctx.tipoContainerElement.appendChild(autocadBar);
  }
}
