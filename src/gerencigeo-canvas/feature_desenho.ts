import type { GeometriaFeicao, LatLonPar, NoCurva } from './feature_types';
import { amostrarCurva, espelhoDaAlca, temAlcas } from './feature_curvas';
import { comprimentoMetros, distanciaMetros } from './feature_metricas';
import { gerarElipse, gerarEstrela, gerarPoligonoRegular } from './feature_formas';

/*
 * Máquina de estados das ferramentas de desenho (pura, sem Leaflet). A camada visual
 * (`feature_desenho_controle.ts`) só traduz mouse/teclado em chamadas desta classe.
 */

export const FERRAMENTAS = [
  'ponto', 'linha', 'poligono', 'retangulo', 'elipse', 'poligono-regular', 'estrela', 'circulo', 'texto', 'caneta',
  'medir-distancia', 'medir-area', 'dividir', 'selecao-laco', 'conta-gotas'
] as const;

export type Ferramenta = (typeof FERRAMENTAS)[number];

/** Raio mínimo (m) da ferramenta círculo; abaixo disso o clique é ignorado (como no motor antigo). */
export const RAIO_MINIMO_CIRCULO_M = 2;

export function ehFerramenta(v: unknown): v is Ferramenta {
  return typeof v === 'string' && (FERRAMENTAS as readonly string[]).includes(v);
}

/** Resultado de um clique: se a ferramenta fecha sozinha (ponto, retângulo, círculo...), vem a geometria. */
export interface ResultadoClique {
  concluida?: GeometriaFeicao;
  /** O clique foi recusado (círculo curto demais, cantos alinhados...): o motivo, para a camada visual mostrar. */
  aviso?: string;
}

/**
 * Âncora da caneta Bézier; a alça de saída é uma coordenada absoluta e a de entrada, por padrão, o espelho dela.
 * `entrada` só existe quando o usuário soltou a simetria (Shift) e puxou a alça de entrada sozinha.
 */
export interface AncoraBezier {
  ponto: LatLonPar;
  alca?: LatLonPar;
  entrada?: LatLonPar;
}

export type QualAlcaCaneta = 'entrada' | 'saida';

/** Alça de entrada efetiva da âncora (a própria ou o espelho da saída), se houver alguma alça. */
export function entradaDaAncora(a: AncoraBezier): LatLonPar | undefined {
  return a.entrada ?? (a.alca ? espelhoDaAlca(a.ponto, a.alca) : undefined);
}

/** Nós da curva a partir das âncoras da caneta: a alça de saída é a gravada e a de entrada, o espelho dela. */
export function nosDeAncoras(ancoras: readonly AncoraBezier[]): NoCurva[] {
  return ancoras.map((a) => {
    const no: NoCurva = { ponto: a.ponto };
    if (a.alca) {
      no.saida = a.alca;
      no.entrada = entradaDaAncora(a);
    } else if (a.entrada) {
      no.entrada = a.entrada;
    }
    return no;
  });
}

/** Vértices sobre a curva cúbica que passa pelas âncoras (sem alça = reta). Só apoio: o desenho usa os nós. */
export function amostrarBezier(ancoras: readonly AncoraBezier[]): LatLonPar[] {
  return amostrarCurva(nosDeAncoras(ancoras), false);
}

/**
 * Linha ou polígono da caneta. Com alguma alça, a geometria leva a curva (`curva`) além dos vértices de apoio;
 * sem nenhuma, é uma poligonal comum.
 */
function geometriaDaCaneta(nos: NoCurva[], area: boolean): GeometriaFeicao {
  const curvo = temAlcas(nos);
  if (area) {
    const anel = curvo ? amostrarCurva(nos, true) : nos.map((n) => n.ponto);
    return curvo ? { tipo: 'Polygon', aneis: [anel], curva: nos } : { tipo: 'Polygon', aneis: [anel] };
  }
  const linha = curvo ? amostrarCurva(nos, false) : nos.map((n) => n.ponto);
  return curvo ? { tipo: 'LineString', coordenadas: linha, curva: nos } : { tipo: 'LineString', coordenadas: linha };
}

const iguais = (a: LatLonPar, b: LatLonPar): boolean => a[0] === b[0] && a[1] === b[1];

/** Formas de dois cliques (centro + ponto da borda) cuja geometria vem de um gerador. */
const FORMAS_DE_DOIS_CLIQUES: Partial<Record<Ferramenta, (centro: LatLonPar, borda: LatLonPar) => LatLonPar[] | null>> = {
  elipse: gerarElipse,
  'poligono-regular': (c, b) => gerarPoligonoRegular(c, b, 6),
  estrela: (c, b) => gerarEstrela(c, b, 5)
};

export class SessaoDesenho {
  public readonly pontos: LatLonPar[] = [];
  public cursor: LatLonPar | null = null;
  public readonly ancoras: AncoraBezier[] = [];

  constructor(public readonly ferramenta: Ferramenta, private fechar = false) {}

  /** Quantos vértices/âncoras já foram colocados. */
  public get nos(): number {
    return this.ferramenta === 'caneta' ? this.ancoras.length : this.pontos.length;
  }

  /** A ferramenta aceita vários cliques e termina com Enter/duplo clique? */
  public get ehSequencial(): boolean {
    return ['linha', 'poligono', 'caneta', 'medir-distancia', 'medir-area', 'dividir', 'selecao-laco'].includes(this.ferramenta);
  }

  private get ehArea(): boolean {
    return this.ferramenta === 'poligono' || this.ferramenta === 'medir-area' || this.ferramenta === 'selecao-laco'
      || (this.ferramenta === 'caneta' && this.fechar);
  }

  /** Um clique perto do primeiro vértice fecha a figura? (polígono, laço, medir área e caneta com 3+ vértices) */
  public get fechaNoPrimeiro(): boolean {
    return this.nos >= 3 && (this.ehArea || this.ferramenta === 'caneta');
  }

  /** Posição do primeiro vértice/âncora (alvo do fechamento), se houver. */
  public get primeiro(): LatLonPar | null {
    return (this.ferramenta === 'caneta' ? this.ancoras[0]?.ponto : this.pontos[0]) ?? null;
  }

  public get minimo(): number {
    return this.ehArea ? 3 : 2;
  }

  public get podeConcluir(): boolean {
    return this.ehSequencial && this.nos >= this.minimo;
  }

  public mover(c: LatLonPar): void {
    this.cursor = c;
  }

  public clicar(c: LatLonPar): ResultadoClique {
    switch (this.ferramenta) {
      case 'ponto':
        return { concluida: { tipo: 'Point', coordenada: c } };
      case 'texto':
        // o texto vem de fora (campo de entrada); a geometria é só o ponto
        return { concluida: { tipo: 'Text', coordenada: c, texto: '' } };
      case 'retangulo':
        if (this.pontos.length === 0) {
          this.pontos.push(c);
          return {};
        }
        {
          const g = this.retangulo(this.pontos[0], c);
          return g ? { concluida: g } : { aviso: 'Os dois cantos precisam diferir em latitude e em longitude.' };
        }
      case 'circulo':
        if (this.pontos.length === 0) {
          this.pontos.push(c);
          return {};
        }
        {
          const raio = distanciaMetros(this.pontos[0], c);
          return raio >= RAIO_MINIMO_CIRCULO_M
            ? { concluida: { tipo: 'Circle', centro: this.pontos[0], raioMetros: raio } }
            : { aviso: `Raio mínimo de ${RAIO_MINIMO_CIRCULO_M} m: clique mais longe do centro.` };
        }
      case 'elipse':
      case 'poligono-regular':
      case 'estrela': {
        if (this.pontos.length === 0) {
          this.pontos.push(c);
          return {};
        }
        const anel = FORMAS_DE_DOIS_CLIQUES[this.ferramenta]!(this.pontos[0], c);
        return anel ? { concluida: { tipo: 'Polygon', aneis: [anel] } } : { aviso: 'Clique num ponto diferente do centro.' };
      }
      case 'caneta':
        this.ancoras.push({ ponto: c });
        return {};
      case 'conta-gotas':
        return {};
      default:
        // linha, polígono, medições e divisão: ignora clique repetido no mesmo ponto (duplo clique)
        if (this.pontos.length > 0 && iguais(this.pontos[this.pontos.length - 1], c)) return {};
        this.pontos.push(c);
        return {};
    }
  }

  /** Caneta: arrastar logo após colocar a âncora define a alça de saída (a de entrada é o espelho). */
  public definirAlca(c: LatLonPar): void {
    const ultima = this.ancoras[this.ancoras.length - 1];
    if (this.ferramenta === 'caneta' && ultima) ultima.alca = c;
  }

  /**
   * Caneta: puxa uma alça de qualquer âncora já colocada. Com `simetrica` a oposta vira o espelho; sem ela
   * as duas ficam independentes (a oposta mantém onde estava).
   */
  public moverAlcaDaAncora(indice: number, qual: QualAlcaCaneta, c: LatLonPar, simetrica = true): void {
    const a = this.ancoras[indice];
    if (this.ferramenta !== 'caneta' || !a) return;
    if (simetrica) {
      a.alca = qual === 'saida' ? c : espelhoDaAlca(a.ponto, c);
      delete a.entrada;
      return;
    }
    const entradaAtual = entradaDaAncora(a);
    if (qual === 'saida') {
      a.alca = c;
      if (entradaAtual) a.entrada = entradaAtual;
    } else {
      a.alca ??= a.ponto;
      a.entrada = c;
    }
  }

  /** Desfaz o último vértice/âncora (Backspace). Devolve se algo foi desfeito. */
  public desfazer(): boolean {
    const lista = this.ferramenta === 'caneta' ? this.ancoras : this.pontos;
    if (lista.length === 0) return false;
    lista.pop();
    return true;
  }

  /** Vértices da linha/anel em construção, incluindo a curva da caneta. */
  private vertices(): LatLonPar[] {
    return this.ferramenta === 'caneta' ? amostrarBezier(this.ancoras) : this.pontos;
  }

  private retangulo(a: LatLonPar, b: LatLonPar): GeometriaFeicao | null {
    if (a[0] === b[0] || a[1] === b[1]) return null;
    return { tipo: 'Polygon', aneis: [[[a[0], a[1]], [a[0], b[1]], [b[0], b[1]], [b[0], a[1]]]] };
  }

  /** Geometria provisória para desenhar enquanto o mouse se move (inclui o cursor). */
  public previa(): GeometriaFeicao | null {
    const cur = this.cursor;
    switch (this.ferramenta) {
      case 'retangulo':
        return this.pontos.length === 1 && cur ? this.retangulo(this.pontos[0], cur) : null;
      case 'circulo': {
        if (this.pontos.length !== 1 || !cur) return null;
        const raio = distanciaMetros(this.pontos[0], cur);
        return raio >= RAIO_MINIMO_CIRCULO_M ? { tipo: 'Circle', centro: this.pontos[0], raioMetros: raio } : null;
      }
      case 'caneta': {
        if (this.ancoras.length === 0) return null;
        const nos = nosDeAncoras(cur ? [...this.ancoras, { ponto: cur }] : this.ancoras);
        if (nos.length < 2) return null;
        return geometriaDaCaneta(nos, this.ehArea && nos.length >= 3);
      }
      case 'elipse':
      case 'poligono-regular':
      case 'estrela': {
        if (this.pontos.length !== 1 || !cur) return null;
        const anel = FORMAS_DE_DOIS_CLIQUES[this.ferramenta]!(this.pontos[0], cur);
        return anel ? { tipo: 'Polygon', aneis: [anel] } : null;
      }
      case 'ponto':
      case 'texto':
      case 'conta-gotas':
        return null;
      default: {
        const v = cur ? [...this.pontos, cur] : [...this.pontos];
        if (v.length < 2) return null;
        return this.ehArea && v.length >= 3 ? { tipo: 'Polygon', aneis: [v] } : { tipo: 'LineString', coordenadas: v };
      }
    }
  }

  /** Fecha uma ferramenta sequencial (Enter ou duplo clique). `null` se ainda não há vértices suficientes. */
  public concluir(): GeometriaFeicao | null {
    if (!this.podeConcluir) return null;
    if (this.ferramenta === 'caneta') return geometriaDaCaneta(nosDeAncoras(this.ancoras), this.ehArea);
    const v = this.vertices();
    return this.ehArea ? { tipo: 'Polygon', aneis: [v] } : { tipo: 'LineString', coordenadas: v };
  }

  /** Fecha em polígono (clique no primeiro vértice). Na caneta vale mesmo sem a opção `fechar`. */
  public concluirFechando(): GeometriaFeicao | null {
    if (!this.fechaNoPrimeiro) return null;
    if (this.ferramenta === 'caneta') return geometriaDaCaneta(nosDeAncoras(this.ancoras), true);
    return { tipo: 'Polygon', aneis: [this.vertices()] };
  }

  /** Medida em andamento: comprimento (linha) ou comprimento do contorno (área), em metros. */
  public comprimentoMetros(): number {
    const v = this.cursor && this.nos > 0 ? [...this.vertices(), this.cursor] : this.vertices();
    return comprimentoMetros(v, false);
  }
}
