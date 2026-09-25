import { ItemPropriedade, OpcaoPropriedade } from './tipos';
import { ContextoEditorPropriedade } from './tipos';

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
    if (v.includes('dash') || v.includes('tracej') || v.includes('hidden')) {
      lineSvg.setAttribute('stroke-dasharray', '6,3');
    } else if (v.includes('dot') || v.includes('ponto') || v.includes('pontilh')) {
      lineSvg.setAttribute('stroke-dasharray', '2,3');
    } else if (v.includes('center') || v.includes('eixo')) {
      lineSvg.setAttribute('stroke-dasharray', '8,3,2,3');
    } else {
      lineSvg.setAttribute('stroke-dasharray', 'none');
    }
  };

  aplicarEstiloLinha(valorAtual);
  svgAmostra.appendChild(lineSvg);

  const select = document.createElement('select');
  select.className = 'ui-prop__linha-select';

  const opcoesLinha: OpcaoPropriedade[] = prop.opcoes && prop.opcoes.length > 0 ? prop.opcoes : [
    { id: 'ByLayer', rotulo: 'ByLayer' },
    { id: 'ByBlock', rotulo: 'ByBlock' },
    { id: 'Continuous', rotulo: 'Continuous' },
    { id: 'Dashed', rotulo: 'Dashed' },
    { id: 'Hidden', rotulo: 'Hidden' },
    { id: 'Center', rotulo: 'Center' },
    { id: 'Dotted', rotulo: 'Dotted' }
  ];

  opcoesLinha.forEach(op => {
    const opt = document.createElement('option');
    opt.value = String(op.id);
    opt.textContent = op.rotulo;
    if (String(op.id).toLowerCase() === String(valorAtual).toLowerCase()) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    aplicarEstiloLinha(select.value);
    ctx.registrarAlteracao(categoriaId, prop.id, select.value);
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

  lineSvg.setAttribute('stroke-width', String(calcularStroke(valorAtual)));
  svgAmostra.appendChild(lineSvg);

  const select = document.createElement('select');
  select.className = 'ui-prop__espessura-select';

  const opcoesEspessura: OpcaoPropriedade[] = prop.opcoes && prop.opcoes.length > 0 ? prop.opcoes : [
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
  ];

  opcoesEspessura.forEach(op => {
    const opt = document.createElement('option');
    opt.value = String(op.id);
    opt.textContent = op.rotulo;
    if (String(op.id).toLowerCase() === String(valorAtual).toLowerCase()) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    lineSvg.setAttribute('stroke-width', String(calcularStroke(select.value)));
    ctx.registrarAlteracao(categoriaId, prop.id, select.value);
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
  const getHexCor = (val: string): string => {
    const v = String(val).toLowerCase();
    if (v === 'red' || v === '1') return '#ff0000';
    if (v === 'yellow' || v === '2') return '#ffff00';
    if (v === 'green' || v === '3') return '#00ff00';
    if (v === 'cyan' || v === '4') return '#00ffff';
    if (v === 'blue' || v === '5') return '#0000ff';
    if (v === 'magenta' || v === '6') return '#ff00ff';
    if (v === 'white' || v === '7' || v === 'bylayer' || v === 'byblock') return '#ffffff';
    if (v.startsWith('#')) return v;
    return '#ffffff';
  };

  amostra.style.backgroundColor = getHexCor(valorAtual);

  const select = document.createElement('select');
  select.className = 'ui-prop__cor-cad-select';

  const coresCad = [
    { id: 'ByLayer', rotulo: 'ByLayer' },
    { id: 'ByBlock', rotulo: 'ByBlock' },
    { id: 'Red', rotulo: 'Red (1)' },
    { id: 'Yellow', rotulo: 'Yellow (2)' },
    { id: 'Green', rotulo: 'Green (3)' },
    { id: 'Cyan', rotulo: 'Cyan (4)' },
    { id: 'Blue', rotulo: 'Blue (5)' },
    { id: 'Magenta', rotulo: 'Magenta (6)' },
    { id: 'White', rotulo: 'White (7)' },
    { id: 'custom', rotulo: 'Selecionar cor...' }
  ];

  coresCad.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.rotulo;
    if (String(c.id).toLowerCase() === String(valorAtual).toLowerCase()) opt.selected = true;
    select.appendChild(opt);
  });

  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'ui-prop__cor-picker-oculto';

  picker.addEventListener('input', () => {
    const novaCor = picker.value;
    amostra.style.backgroundColor = novaCor;
    ctx.registrarAlteracao(categoriaId, prop.id, novaCor);
  });

  select.addEventListener('change', () => {
    if (select.value === 'custom') {
      picker.click();
    } else {
      amostra.style.backgroundColor = getHexCor(select.value);
      ctx.registrarAlteracao(categoriaId, prop.id, select.value);
    }
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

  const amostra = document.createElement('div');
  amostra.className = 'ui-prop__cor-amostra';
  amostra.style.backgroundColor = valorAtual || '#ffffff';

  const texto = document.createElement('span');
  texto.className = 'ui-prop__cor-texto';
  texto.textContent = prop.textoAmostra || String(valorAtual || 'ByLayer');

  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'ui-prop__cor-picker-oculto';
  picker.value = (typeof valorAtual === 'string' && valorAtual.startsWith('#')) ? valorAtual : '#ffffff';

  picker.addEventListener('input', () => {
    const novaCor = picker.value;
    amostra.style.backgroundColor = novaCor;
    texto.textContent = novaCor;
    ctx.registrarAlteracao(categoriaId, prop.id, novaCor);
  });

  container.addEventListener('click', () => {
    picker.click();
  });

  container.appendChild(amostra);
  container.appendChild(texto);
  container.appendChild(picker);
  return container;
}
