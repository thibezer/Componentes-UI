import L from 'leaflet';
import type { CanvasLayerDef } from './types';
import { partesDaLinha, type Feicao, type LatLonPar } from './feature_types';
import { areaDaGeometria, extensaoDaGeometria, formatarArea, formatarExtensao } from './feature_metricas';
import { corSegura } from './renderers/feicoes_renderer';

/*
 * Popup único de feição, sob demanda. Montado com DOM (textContent), nunca com HTML de string,
 * porque nome, descrição e atributos vêm do consumidor.
 */

export type AcaoFeicao = 'inspecionar' | 'zoom' | 'vertices' | 'copiar';

const ROTULO_TIPO: Record<string, string> = {
  Point: 'Ponto', LineString: 'Linha', Polygon: 'Polígono', Circle: 'Círculo', Text: 'Texto'
};

/** Chaves tratadas à parte (título, categoria etc.); o resto vira "atributos". */
const CHAVES_RESERVADAS = new Set([
  'name', 'nome', 'category', 'categoria', 'description', 'descricao',
  'author', 'autor', 'date', 'data', 'created_at', 'criadoEm'
]);
const MAX_ATRIBUTOS = 6;

export interface MargensPopup {
  topo: number;
  base: number;
  esquerda: number;
  direita: number;
}

function primeiro(f: Feicao, chaves: string[]): string {
  for (const k of chaves) {
    const v = f.propriedades?.[k];
    if (v !== undefined && v !== null && String(v) !== '') return String(v);
  }
  return '';
}

function formatarData(bruta: string): string {
  // "2026-10-09" puro é lido como UTC pelo Date e cairia no dia anterior em fusos negativos
  const dia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bruta);
  const d = dia ? new Date(Number(dia[1]), Number(dia[2]) - 1, Number(dia[3])) : new Date(bruta);
  return Number.isNaN(d.getTime()) ? bruta : d.toLocaleDateString('pt-BR');
}

function valorCurto(v: unknown): string {
  const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return t.length > 80 ? `${t.slice(0, 77)}...` : t;
}

export function coordenadaDeReferencia(f: Feicao): LatLonPar {
  const g = f.geometria;
  switch (g.tipo) {
    case 'Point':
    case 'Text': return g.coordenada;
    case 'Circle': return g.centro;
    case 'LineString': return g.coordenadas[Math.floor(g.coordenadas.length / 2)]; // multiparte: a 1ª parte
    case 'Polygon': {
      const a = g.aneis[0];
      const lat = a.reduce((s, p) => s + p[0], 0) / a.length;
      const lon = a.reduce((s, p) => s + p[1], 0) / a.length;
      return [lat, lon];
    }
  }
}

function metricas(f: Feicao): Array<[string, string]> {
  const g = f.geometria;
  const m: Array<[string, string]> = [];
  const area = areaDaGeometria(g);
  const ext = extensaoDaGeometria(g);
  if (g.tipo === 'Polygon') {
    m.push(['Área', formatarArea(area ?? 0)], ['Perímetro', formatarExtensao(ext ?? 0)]);
    m.push(['Vértices', String(g.aneis.reduce((s, a) => s + a.length, 0))]);
  } else if (g.tipo === 'LineString') {
    const partes = partesDaLinha(g);
    m.push(['Extensão', formatarExtensao(ext ?? 0)], ['Vértices', String(partes.reduce((s, p) => s + p.length, 0))]);
    if (partes.length > 1) m.push(['Partes', String(partes.length)]);
  } else if (g.tipo === 'Circle') {
    m.push(['Raio', formatarExtensao(g.raioMetros)], ['Área', formatarArea(area ?? 0)]);
  }
  const [lat, lon] = coordenadaDeReferencia(f);
  m.push(['Coordenadas', `${lat.toFixed(6)}, ${lon.toFixed(6)}`]);
  return m;
}

export interface DependenciasPopup {
  obterMapa: () => L.Map | null;
  obterCamada: (camadaId: string) => CanvasLayerDef | undefined;
  aoAcao: (acao: AcaoFeicao, feicao: Feicao) => void;
  /** Executa a abertura como pedido explícito (o portão de popups do mapa deixa passar). Sem ele, abre direto. */
  liberar?: <T>(fn: () => T) => T;
}

export class FeicaoPopup {
  private popup: L.Popup | null = null;
  private feicaoAtual: Feicao | null = null;
  private margens: MargensPopup = { topo: 20, base: 20, esquerda: 20, direita: 20 };

  constructor(private dep: DependenciasPopup) {}

  /** Afasta o auto-pan de barras, tabelas e painéis laterais sobrepostos ao mapa. */
  public definirMargens(m: Partial<MargensPopup>): void {
    this.margens = { ...this.margens, ...m };
  }

  public get aberto(): Feicao | null {
    return this.feicaoAtual;
  }

  public abrir(f: Feicao): void {
    const map = this.dep.obterMapa();
    if (!map) return;
    this.fechar();
    this.feicaoAtual = f;
    this.popup = L.popup({
      className: 'compact-popup',
      maxWidth: 280,
      closeOnClick: false,
      autoClose: false,
      autoPanPaddingTopLeft: L.point(this.margens.esquerda, this.margens.topo),
      autoPanPaddingBottomRight: L.point(this.margens.direita, this.margens.base)
    })
      .setLatLng(coordenadaDeReferencia(f))
      .setContent(this.montar(f));
    const popup = this.popup;
    if (this.dep.liberar) this.dep.liberar(() => popup.openOn(map));
    else popup.openOn(map);
  }

  /** Reconstrói o conteúdo se a feição aberta mudou (estilo, propriedades, geometria). */
  public atualizar(f: Feicao): void {
    if (!this.popup || this.feicaoAtual?.id !== f.id || this.feicaoAtual.camadaId !== f.camadaId) return;
    this.feicaoAtual = f;
    this.popup.setLatLng(coordenadaDeReferencia(f)).setContent(this.montar(f));
  }

  public fechar(): void {
    const popup = this.popup;
    this.popup = null;
    this.feicaoAtual = null;
    popup?.close();
  }

  private montar(f: Feicao): HTMLElement {
    const camada = this.dep.obterCamada(f.camadaId);
    const cor = corSegura(f.estilo?.corTraco ?? camada?.estilo.corPrimaria, '#38bdf8');
    const el = (tag: string, css = '', texto?: string): HTMLElement => {
      const n = document.createElement(tag);
      if (css) n.style.cssText = css;
      if (texto !== undefined) n.textContent = texto;
      return n;
    };

    const raiz = el('div', 'font-family:var(--ui-fonte-base,sans-serif);color:rgba(255,255,255,.9);line-height:1.35;min-width:200px;border-left:3px solid ' + cor + ';padding-left:8px');
    raiz.className = 'cad-feicao-popup';

    raiz.appendChild(el('div', 'font-weight:700;font-size:13px;margin-bottom:1px', primeiro(f, ['name', 'nome']) || f.id));

    const categoria = primeiro(f, ['category', 'categoria']);
    const sub = [ROTULO_TIPO[f.geometria.tipo], camada?.nome ?? f.camadaId, categoria].filter(Boolean).join(' · ');
    raiz.appendChild(el('div', 'font-size:11px;color:rgba(255,255,255,.6);margin-bottom:4px', sub));

    const descricao = primeiro(f, ['description', 'descricao']);
    if (descricao) raiz.appendChild(el('div', 'font-size:11px;margin-bottom:4px', descricao));

    const linhas = (pares: Array<[string, string]>): HTMLElement => {
      const bloco = el('div', 'font-size:11px;margin-bottom:4px');
      for (const [k, v] of pares) {
        const l = el('div');
        l.appendChild(el('strong', '', `${k}: `));
        l.appendChild(document.createTextNode(v));
        bloco.appendChild(l);
      }
      return bloco;
    };
    raiz.appendChild(linhas(metricas(f)));

    const atributos = Object.entries(f.propriedades ?? {})
      .filter(([k, v]) => !CHAVES_RESERVADAS.has(k) && v !== undefined && v !== null && v !== '');
    if (atributos.length > 0) {
      raiz.appendChild(linhas(atributos.slice(0, MAX_ATRIBUTOS).map(([k, v]) => [k, valorCurto(v)])));
      if (atributos.length > MAX_ATRIBUTOS) {
        raiz.appendChild(el('div', 'font-size:10px;color:rgba(255,255,255,.55);margin-bottom:4px', `${atributos.length} atributos`));
      }
    }

    const autor = primeiro(f, ['author', 'autor']);
    const data = primeiro(f, ['date', 'data', 'created_at', 'criadoEm']);
    if (autor || data) {
      const t = [autor, data ? formatarData(data) : ''].filter(Boolean).join(' · ');
      raiz.appendChild(el('div', 'font-size:10px;color:rgba(255,255,255,.55);margin-bottom:4px', t));
    }

    const acoes = el('div', 'display:flex;gap:4px;flex-wrap:wrap;margin-top:6px');
    const botoes: Array<[AcaoFeicao, string]> = [['inspecionar', 'Inspecionar'], ['zoom', 'Zoom']];
    if (f.geometria.tipo === 'LineString' || f.geometria.tipo === 'Polygon' || f.geometria.tipo === 'Point') {
      botoes.push(['vertices', 'Vértices']);
    }
    if (f.geometria.tipo === 'Point') botoes.push(['copiar', 'Copiar']);
    for (const [acao, rotulo] of botoes) {
      const b = el('button', 'font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:inherit;cursor:pointer', rotulo) as HTMLButtonElement;
      b.type = 'button';
      b.dataset.acao = acao;
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.dep.aoAcao(acao, this.feicaoAtual ?? f);
      });
      acoes.appendChild(b);
    }
    raiz.appendChild(acoes);
    return raiz;
  }
}
