import { ItemPropriedade, OpcaoPropriedade } from './tipos';
import { ContextoEditorPropriedade } from './tipos';
import { registrarAtualizadorEditor, sincronizarSelect } from './propriedades-dom-utils';

const mesmoTextoSemCaixa = (opcao: string, valor: any) => opcao.toLowerCase() === String(valor ?? '').toLowerCase();

function preencherOpcoes(select: HTMLSelectElement, opcoes: OpcaoPropriedade[]): void {
  opcoes.forEach(op => {
    const opt = document.createElement('option');
    opt.value = String(op.id);
    opt.textContent = op.rotulo;
    select.appendChild(opt);
  });
}

/**
 * Editor Tipo de Linha CAD (Linetype com preview SVG em tempo real)
 */
export function criarEditorLinetype(
  categoriaId: string,
  prop: ItemPropriedade,
  valorAtual: any,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ui-prop__editor-linha-container';

  const svgAmostra = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgAmostra.setAttribute('class', 'ui-prop__linha-amostra-svg');
  svgAmostra.setAttribute('viewBox', '0 0 44 12');

  const lineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  lineSvg.setAttribute('x1', '0');
  lineSvg.setAttribute('y1', '6');
  lineSvg.setAttribute('x2', '44');
  lineSvg.setAttribute('y2', '6');

  const aplicarEstiloLinha = (val: string) => {
    const v = String(val || '').toLowerCase();
    if (v.includes('center') || v.includes('eixo') || v.includes('dashdot') || v.includes('traço-ponto')) {
      lineSvg.setAttribute('stroke-dasharray', '8,3,2,3');
    } else if (v.includes('dash') || v.includes('tracej') || v.includes('hidden')) {
      lineSvg.setAttribute('stroke-dasharray', '6,3');
    } else if (v.includes('dot') || v.includes('ponto') || v.includes('pontilh')) {
      lineSvg.setAttribute('stroke-dasharray', '2,3');
    } else {
      lineSvg.setAttribute('stroke-dasharray', 'none');
    }
  };

  svgAmostra.appendChild(lineSvg);

  const select = document.createElement('select');
  select.className = 'ui-prop__linha-select';
  select.setAttribute('aria-label', prop.rotulo);

  preencherOpcoes(select, prop.opcoes && prop.opcoes.length > 0 ? prop.opcoes : [
    { id: 'ByLayer', rotulo: 'ByLayer' },
    { id: 'ByBlock', rotulo: 'ByBlock' },
    { id: 'Continuous', rotulo: 'Continuous' },
    { id: 'Dashed', rotulo: 'Dashed' },
    { id: 'Hidden', rotulo: 'Hidden' },
    { id: 'Center', rotulo: 'Center' },
    { id: 'Dotted', rotulo: 'Dotted' }
  ]);

  const atualizar = (valor: any) => {
    aplicarEstiloLinha(valor);
    sincronizarSelect(select, valor, mesmoTextoSemCaixa);
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(container, atualizar);

  select.addEventListener('change', () => {
    aplicarEstiloLinha(select.value);
    ctx.registrarAlteracao(categoriaId, prop.id, select.value);
    sincronizarSelect(select, select.value, mesmoTextoSemCaixa);
  });

  select.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      ctx.focarProximoEditor(select);
    }
  });

  container.appendChild(svgAmostra);
  container.appendChild(select);
  return container;
}

/**
 * Editor Espessura de Linha CAD (Lineweight com espessura SVG proporcional)
 */
export function criarEditorLineweight(
  categoriaId: string,
  prop: ItemPropriedade,
  valorAtual: any,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ui-prop__editor-espessura-container';

  const svgAmostra = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgAmostra.setAttribute('class', 'ui-prop__espessura-amostra-svg');
  svgAmostra.setAttribute('viewBox', '0 0 38 12');

  const lineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  lineSvg.setAttribute('x1', '0');
  lineSvg.setAttribute('y1', '6');
  lineSvg.setAttribute('x2', '38');
  lineSvg.setAttribute('y2', '6');

  const calcularStroke = (val: string) => {
    const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return 1.5;
    return Math.min(8, Math.max(1, num * 8));
  };

  svgAmostra.appendChild(lineSvg);

  const select = document.createElement('select');
  select.className = 'ui-prop__espessura-select';
  select.setAttribute('aria-label', prop.rotulo);

  preencherOpcoes(select, prop.opcoes && prop.opcoes.length > 0 ? prop.opcoes : [
    { id: 'ByLayer', rotulo: 'ByLayer' },
    { id: 'ByBlock', rotulo: 'ByBlock' },
    { id: '0.00 mm', rotulo: '0.00 mm' },
    { id: '0.05 mm', rotulo: '0.05 mm' },
    { id: '0.09 mm', rotulo: '0.09 mm' },
    { id: '0.13 mm', rotulo: '0.13 mm' },
    { id: '0.15 mm', rotulo: '0.15 mm' },
    { id: '0.18 mm', rotulo: '0.18 mm' },
    { id: '0.20 mm', rotulo: '0.20 mm' },
    { id: '0.25 mm', rotulo: '0.25 mm' },
    { id: '0.30 mm', rotulo: '0.30 mm' },
    { id: '0.35 mm', rotulo: '0.35 mm' },
    { id: '0.40 mm', rotulo: '0.40 mm' },
    { id: '0.50 mm', rotulo: '0.50 mm' },
    { id: '0.60 mm', rotulo: '0.60 mm' },
    { id: '0.70 mm', rotulo: '0.70 mm' },
    { id: '1.00 mm', rotulo: '1.00 mm' },
    { id: '1.40 mm', rotulo: '1.40 mm' },
    { id: '2.00 mm', rotulo: '2.00 mm' }
  ]);

  const atualizar = (valor: any) => {
    lineSvg.setAttribute('stroke-width', String(calcularStroke(valor)));
    sincronizarSelect(select, valor, mesmoTextoSemCaixa);
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(container, atualizar);

  select.addEventListener('change', () => {
    lineSvg.setAttribute('stroke-width', String(calcularStroke(select.value)));
    ctx.registrarAlteracao(categoriaId, prop.id, select.value);
    sincronizarSelect(select, select.value, mesmoTextoSemCaixa);
  });

  select.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      ctx.focarProximoEditor(select);
    }
  });

  container.appendChild(svgAmostra);
  container.appendChild(select);
  return container;
}

/* ---------- Cores CAD (ACI) ---------- */

const CORES_ACI: { nome: string; indice: number; hex: string }[] = [
  { nome: 'Red', indice: 1, hex: '#ff0000' },
  { nome: 'Yellow', indice: 2, hex: '#ffff00' },
  { nome: 'Green', indice: 3, hex: '#00ff00' },
  { nome: 'Cyan', indice: 4, hex: '#00ffff' },
  { nome: 'Blue', indice: 5, hex: '#0000ff' },
  { nome: 'Magenta', indice: 6, hex: '#ff00ff' },
  { nome: 'White', indice: 7, hex: '#ffffff' }
];

const HEX_VALIDO = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normaliza o valor de cor CAD: índice ACI (1–7, número ou texto) vira o nome; demais em minúsculas. */
function normalizarCorCad(valor: any): string {
  const v = String(valor ?? '').trim().toLowerCase();
  const aci = CORES_ACI.find(c => String(c.indice) === v || c.nome.toLowerCase() === v);
  return aci ? aci.nome.toLowerCase() : v;
}

function hexDaCorCad(valor: any): string {
  const v = normalizarCorCad(valor);
  const aci = CORES_ACI.find(c => c.nome.toLowerCase() === v);
  if (aci) return aci.hex;
  if (HEX_VALIDO.test(v)) return v;
  return '#ffffff'; // ByLayer / ByBlock / desconhecido
}

/** Expande #rgb para #rrggbb (o input type=color só aceita a forma longa). */
function hexLongo(hex: string): string {
  return hex.length === 4 ? '#' + hex.slice(1).split('').map(c => c + c).join('') : hex;
}

/**
 * Editor Cor CAD (ByLayer, ByBlock, Cores Indexadas ACI e Hexadecimal)
 */
export function criarEditorCorCad(
  categoriaId: string,
  prop: ItemPropriedade,
  valorAtual: any,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ui-prop__editor-cor-cad-container';

  const amostra = document.createElement('div');
  amostra.className = 'ui-prop__cor-amostra';

  const select = document.createElement('select');
  select.className = 'ui-prop__cor-cad-select';
  select.setAttribute('aria-label', prop.rotulo);

  preencherOpcoes(select, [
    { id: 'ByLayer', rotulo: 'ByLayer' },
    { id: 'ByBlock', rotulo: 'ByBlock' },
    ...CORES_ACI.map(c => ({ id: c.nome, rotulo: `${c.nome} (${c.indice})` }))
  ]);
  // "Selecionar cor..." é uma ação, não um valor: nunca fica selecionada
  const optEscolher = document.createElement('option');
  optEscolher.value = '__escolher';
  optEscolher.textContent = 'Selecionar cor...';
  optEscolher.setAttribute('data-acao', '');
  select.appendChild(optEscolher);

  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'ui-prop__cor-picker-oculto';
  picker.tabIndex = -1;

  const atualizar = (valor: any) => {
    const hex = hexDaCorCad(valor);
    amostra.style.backgroundColor = hex;
    picker.value = hexLongo(hex);
    sincronizarSelect(
      select,
      valor,
      (opcao, v) => normalizarCorCad(opcao) === normalizarCorCad(v),
      (v) => (v == null || v === '' ? '—' : String(v))
    );
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(container, atualizar);

  // Arrastar no seletor só pré-visualiza; o valor é registrado ao confirmar (change)
  picker.addEventListener('input', () => {
    amostra.style.backgroundColor = picker.value;
  });
  picker.addEventListener('change', () => {
    ctx.registrarAlteracao(categoriaId, prop.id, picker.value);
    atualizar(ctx.obterValorAtual(prop.id));
  });

  select.addEventListener('change', () => {
    if (select.value === '__escolher') {
      // Volta a exibir o valor atual: cancelar o seletor não deixa o select num estado falso
      // e escolher a ação de novo sempre dispara change.
      atualizar(ctx.obterValorAtual(prop.id));
      picker.click();
      return;
    }
    ctx.registrarAlteracao(categoriaId, prop.id, select.value);
    atualizar(ctx.obterValorAtual(prop.id));
  });

  select.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      ctx.focarProximoEditor(select);
    }
  });

  container.appendChild(amostra);
  container.appendChild(select);
  container.appendChild(picker);
  return container;
}

/**
 * Editor Cor Padrão (Swatch com Color Picker Nativo)
 */
export function criarEditorCorSwatch(
  categoriaId: string,
  prop: ItemPropriedade,
  valorAtual: any,
  ctx: ContextoEditorPropriedade
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ui-prop__editor-cor-container';
  container.setAttribute('role', 'button');
  container.tabIndex = 0;

  const amostra = document.createElement('div');
  amostra.className = 'ui-prop__cor-amostra';

  const texto = document.createElement('span');
  texto.className = 'ui-prop__cor-texto';

  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'ui-prop__cor-picker-oculto';
  picker.tabIndex = -1;

  const atualizar = (valor: any) => {
    const hex = typeof valor === 'string' && HEX_VALIDO.test(valor) ? hexLongo(valor) : null;
    amostra.style.backgroundColor = valor || '#ffffff';
    texto.textContent = prop.textoAmostra || String(valor || 'ByLayer');
    picker.value = hex ?? '#ffffff';
    container.setAttribute('aria-label', `${prop.rotulo}: ${valor || 'ByLayer'}`);
  };
  atualizar(valorAtual);
  registrarAtualizadorEditor(container, atualizar);

  picker.addEventListener('input', () => {
    amostra.style.backgroundColor = picker.value;
    texto.textContent = prop.textoAmostra || picker.value;
  });
  picker.addEventListener('change', () => {
    ctx.registrarAlteracao(categoriaId, prop.id, picker.value);
    atualizar(ctx.obterValorAtual(prop.id));
  });

  container.addEventListener('click', (e) => {
    if (e.target !== picker) picker.click();
  });
  container.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      picker.click();
    }
  });

  container.appendChild(amostra);
  container.appendChild(texto);
  container.appendChild(picker);
  return container;
}
