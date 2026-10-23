import '../src/canvas';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { CanvasFormas } from '../src/gerencigeo-canvas/renderers/canvas_formas_leaflet';

/*
 * Página de conferência manual do renderizador canvas (motor das formas, Fase 3). Cena fixa com todos os tipos de feição,
 * uma camada translúcida e, opcionalmente, volume sintético. Roteiro com caixas salvas no localStorage.
 * `npm run dev` e abra /bench/conferencia-canvas.html. Não é benchmark (o rAF é o do navegador): para números, use
 * /bench/bench-formas.html.
 */

type Par = [number, number];
type FeicaoEntrada = { id: string; geometria: unknown; propriedades?: Record<string, unknown>; estilo?: Record<string, unknown> };

const CENTRO: Par = [-23.5, -46.6];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((CENTRO[0] * Math.PI) / 180));
const desloc = (norteM: number, lesteM: number): Par => [CENTRO[0] + norteM * mLat, CENTRO[1] + lesteM * mLon];
const retangulo = (norteM: number, lesteM: number, alturaM: number, larguraM: number): Par[] => [
  desloc(norteM, lesteM), desloc(norteM, lesteM + larguraM), desloc(norteM + alturaM, lesteM + larguraM), desloc(norteM + alturaM, lesteM)
];

const CHAVE_ROTEIRO = 'conferencia-canvas:roteiro';
const ROTEIRO: Array<{ id: string; titulo: string; detalhe: string }> = [
  { id: 'zoom-anim', titulo: 'Animação de zoom (canvas)', detalhe: 'Zoom + / Zoom − e a roda do mouse: as formas escalam junto com o mapa durante a animação, sem piscar, sumir ou dar salto no fim.' },
  { id: 'zoom-volume', titulo: 'Animação de zoom com volume', detalhe: 'Volume "+ 20 mil": repita o zoom animado e o "Voar até o lote". Ao terminar, nada fora do lugar; marcas viram formas ao aproximar.' },
  { id: 'pan', titulo: 'Pan', detalhe: 'Arraste o mapa em várias direções (pouco e muito). Ao soltar, nada some nem duplica nas bordas; com "+ 50 mil" (camada cheia, desloca o bitmap) e com "só a cena" (repinta).' },
  { id: 'edicao', titulo: 'Edição de vértices', detalhe: '"Editar o lote 1" e arraste um vértice: o lote acompanha o arrasto, o desenho antigo some da base durante o arrasto e, ao soltar, fica a geometria nova sem fantasma. "Parar edição" (ou Esc) encerra.' },
  { id: 'edicao-pan', titulo: 'Edição + zoom/pan', detalhe: 'Com a edição aberta, dê zoom e pan: as alças e o lote em edição continuam alinhados.' },
  { id: 'popup-demanda', titulo: 'Popup sob demanda', detalhe: 'Modo sob-demanda: clique simples só seleciona (sem popup, sem mover o mapa); duplo clique abre; "Abrir popup do lote 2" abre sem mover o mapa.' },
  { id: 'popup-auto', titulo: 'Popup automático', detalhe: 'Modo automatico: clicar numa feição seleciona e abre o popup (com auto-pan). Modo desligado: nada abre.' },
  { id: 'opacidade', titulo: 'Camada com opacidade < 1', detalhe: 'Slider da "Translúcida": a camada inteira esmaece junto (0 some, 1 cheia), sem afetar "Lotes". Polígonos sobrepostos da mesma camada mantêm o escurecimento do preenchimento.' },
  { id: 'opacidade-selecao', titulo: 'Seleção em camada translúcida', detalhe: '"Selecionar uma feição dela": no canvas a seleção aparece cheia, sem a opacidade da camada (pendência conhecida). Anote se é aceitável.' },
  { id: 'tipos', titulo: 'Ícone, texto, círculo e curva', detalhe: 'Torre (ícone), selo de texto, círculo e a curva Bézier aparecem e acompanham zoom e pan.' },
  { id: 'paridade', titulo: 'Mesma aparência nos dois caminhos', detalhe: 'Troque para leaflet e repita zoom, edição, popup e opacidade: a aparência deve ser a mesma (a ordem de desenho dentro da camada pode variar).' }
];

function cena(): { lotes: FeicaoEntrada[]; translucida: FeicaoEntrada[] } {
  const lotes: FeicaoEntrada[] = [];
  for (let i = 0; i < 6; i++) {
    lotes.push({
      id: `lote${i + 1}`,
      geometria: { tipo: 'Polygon', aneis: [retangulo(-60 + Math.floor(i / 3) * 70, -150 + (i % 3) * 90, 55, 75)] },
      propriedades: { nome: `Lote ${i + 1}`, area: '4.125 m²' }
    });
  }
  lotes.push({ id: 'circulo', geometria: { tipo: 'Circle', centro: desloc(120, 120), raioMetros: 40 }, propriedades: { nome: 'Círculo de 40 m' } });
  lotes.push({ id: 'via1', geometria: { tipo: 'LineString', coordenadas: [desloc(-90, -200), desloc(-90, 160), desloc(60, 220)] }, propriedades: { nome: 'Via 1' }, estilo: { corTraco: '#facc15', espessuraTraco: 3 } });
  lotes.push({ id: 'via2', geometria: { tipo: 'LineString', coordenadas: [desloc(150, -200), desloc(150, 40)] }, propriedades: { nome: 'Via 2' }, estilo: { corTraco: '#facc15', espessuraTraco: 2, dashArray: '6 4' } });
  for (let i = 0; i < 4; i++) {
    lotes.push({ id: `torre${i}`, geometria: { tipo: 'Point', coordenada: desloc(-130, -120 + i * 70) }, propriedades: { nome: `Torre ${i}` }, estilo: { icone: 'tower' } });
    lotes.push({ id: `ponto${i}`, geometria: { tipo: 'Point', coordenada: desloc(100, -180 + i * 40) }, propriedades: { nome: `Ponto ${i}` } });
  }
  lotes.push({ id: 'rotulo', geometria: { tipo: 'Text', coordenada: desloc(40, -180), texto: 'Quadra A' }, propriedades: {}, estilo: { corFundo: '#0f172a', corBorda: '#38bdf8' } });
  const a = desloc(170, 100);
  const b = desloc(170, 220);
  const c = desloc(240, 160);
  lotes.push({
    id: 'curva', propriedades: { nome: 'Curva Bézier' },
    geometria: {
      tipo: 'Polygon', aneis: [[a, b, c]],
      curva: [{ ponto: a, saida: desloc(140, 140) }, { ponto: b, entrada: desloc(140, 180) }, { ponto: c, entrada: desloc(250, 220), saida: desloc(250, 100) }]
    }
  });

  const translucida: FeicaoEntrada[] = [
    { id: 'faixa', geometria: { tipo: 'Polygon', aneis: [retangulo(-40, -180, 50, 330)] }, propriedades: { nome: 'Faixa translúcida' }, estilo: { corPreenchimento: '#e11d48', opacidadePreenchimento: 0.6 } },
    { id: 'sobreposta', geometria: { tipo: 'Polygon', aneis: [retangulo(-20, -60, 80, 80)] }, propriedades: { nome: 'Sobreposta' }, estilo: { corPreenchimento: '#e11d48', opacidadePreenchimento: 0.6 } }
  ];
  return { lotes, translucida };
}

/** Volume sintético (quadrados de 40 m num bloco de ~13 km), semente fixa. */
function volume(n: number): FeicaoEntrada[] {
  let s = 7;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  return Array.from({ length: n }, (_, i) => {
    const norte = (rnd() - 0.5) * 13000;
    const leste = (rnd() - 0.5) * 13000;
    return { id: `v${i}`, geometria: { tipo: 'Polygon', aneis: [retangulo(norte, leste, 40, 40)] }, propriedades: { n: i } };
  });
}

const palco = document.getElementById('palco')!;
const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
el.setAttribute('sem-camadas-padrao', '');
el.setAttribute('renderizador', new URLSearchParams(location.search).get('renderizador') === 'leaflet' ? 'leaflet' : 'canvas');
palco.appendChild(el);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const eventos = $('eventos');
function registrar(texto: string): void {
  const hora = new Date().toLocaleTimeString('pt-BR');
  eventos.textContent = `${hora} ${texto}\n${eventos.textContent ?? ''}`.slice(0, 4000);
  setTimeout(atualizarEstado, 0);
}
for (const nome of ['cad-feicao-selecionada', 'cad-selecao', 'cad-edicao-iniciada', 'cad-edicao-concluida', 'cad-edicao-recusada', 'cad-feicao-atualizada']) {
  el.addEventListener(nome, (e) => {
    const d = (e as CustomEvent).detail as Record<string, unknown> | undefined;
    const f = d?.feicao as { id?: string } | null | undefined;
    registrar(`${nome}${f?.id ? ` (${f.id})` : ''}`);
  });
}

function carregarCena(): void {
  const { lotes, translucida } = cena();
  el.definirFeicoes('lotes', lotes, { nome: 'Lotes', zIndex: 600, estilo: { corPrimaria: '#38bdf8' } });
  el.definirFeicoes('translucida', translucida, { nome: 'Translúcida', zIndex: 610, opacidade: Number($<HTMLInputElement>('opacidade').value), estilo: { corPrimaria: '#e11d48' } });
}

function atualizarEstado(): void {
  const map = el.getMap();
  const linhas = [
    `renderizador: ${el.renderizador}   zoom: ${map ? map.getZoom().toFixed(2) : '-'}`,
    `CanvasFormas.limiteRepintar: ${CanvasFormas.limiteRepintar}`,
    `editando vértices: ${el.editandoVertices ? 'sim' : 'não'}   popups: ${el.popups}`
  ];
  for (const id of ['lotes', 'translucida', 'volume']) {
    const e = el.estatisticasFeicoes(id);
    if (!e) continue;
    linhas.push(`${id}: total ${e.total}, detalhe ${e.materializadas}, marcas ${e.marcasLOD}, clusters ${e.clusters}` +
      (e.canvases !== undefined ? `, canvases ${e.canvases}` : ''));
  }
  $('estado').textContent = linhas.join('\n');
  $('rotulo-modo').textContent = `(atual: ${el.renderizador})`;
  document.querySelectorAll<HTMLButtonElement>('[data-renderizador]').forEach((b) => b.classList.toggle('ativo', b.dataset.renderizador === el.renderizador));
}

function montarRoteiro(): void {
  let marcados: Record<string, boolean> = {};
  try { marcados = JSON.parse(localStorage.getItem(CHAVE_ROTEIRO) ?? '{}') as Record<string, boolean>; } catch { /* sem armazenamento */ }
  const ol = $('roteiro');
  ol.textContent = '';
  for (const item of ROTEIRO) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    caixa.checked = !!marcados[item.id];
    li.classList.toggle('ok', caixa.checked);
    caixa.addEventListener('change', () => {
      marcados[item.id] = caixa.checked;
      li.classList.toggle('ok', caixa.checked);
      try { localStorage.setItem(CHAVE_ROTEIRO, JSON.stringify(marcados)); } catch { /* sem armazenamento */ }
    });
    const titulo = document.createElement('span');
    titulo.textContent = item.titulo;
    label.append(caixa, titulo);
    const detalhe = document.createElement('small');
    detalhe.textContent = item.detalhe;
    li.append(label, detalhe);
    ol.appendChild(li);
  }
  $('limpar-roteiro').onclick = () => {
    try { localStorage.removeItem(CHAVE_ROTEIRO); } catch { /* sem armazenamento */ }
    montarRoteiro();
  };
}

function ligarControles(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-renderizador]').forEach((b) => {
    b.onclick = () => {
      el.renderizador = b.dataset.renderizador as 'canvas' | 'leaflet';
      registrar(`renderizador → ${el.renderizador}`);
      setTimeout(atualizarEstado, 50);
    };
  });
  $<HTMLSelectElement>('volume').onchange = (e) => {
    const n = Number((e.target as HTMLSelectElement).value);
    el.definirFeicoes('volume', volume(n), { nome: 'Volume', zIndex: 590, estilo: { corPrimaria: '#64748b' } });
    registrar(`volume → ${n}`);
  };
  $('zoom-mais').onclick = () => el.getMap()?.zoomIn(1, { animate: true });
  $('zoom-menos').onclick = () => el.getMap()?.zoomOut(1, { animate: true });
  $('voar').onclick = () => el.getMap()?.flyTo(desloc(-30, -110), 19, { duration: 1.5 });
  $('enquadrar').onclick = () => el.ajustarCamada('lotes');
  $('editar').onclick = () => {
    const r = el.editarVertices('lotes', 'lote1');
    registrar(`editarVertices(lote1) → ${JSON.stringify(r)}`);
  };
  $('parar').onclick = () => el.pararEdicaoVertices();
  $<HTMLSelectElement>('popups').onchange = (e) => { el.popups = (e.target as HTMLSelectElement).value as typeof el.popups; };
  $('popup').onclick = () => registrar(`abrirPopupFeicao(lote2) → ${el.abrirPopupFeicao('lotes', 'lote2')}`);
  const opacidade = $<HTMLInputElement>('opacidade');
  opacidade.oninput = () => {
    const v = Number(opacidade.value);
    el.setLayerOpacity('translucida', v);
    $('valor-opacidade').textContent = v.toFixed(2).replace('.', ',');
  };
  $('selecionar-translucida').onclick = () => el.selecionarFeicao('translucida', 'sobreposta');
}

customElements.whenDefined('ui-canvas-cad').then(() => {
  const map = el.inicializarAgora();
  carregarCena();
  map?.setView(desloc(0, 0), 17, { animate: false });
  montarRoteiro();
  ligarControles();
  atualizarEstado();
  map?.on('zoomend moveend', atualizarEstado);
  setInterval(atualizarEstado, 1000);
});
