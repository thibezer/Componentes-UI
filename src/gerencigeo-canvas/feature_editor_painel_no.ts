import type { GeometriaFeicao, LatLonPar } from './feature_types';
import { tipoDoNo, type TipoNo } from './feature_curvas';
import { nosOuVertices, type QualAlca } from './feature_edicao_ops';
import { alcaPolar } from './feature_edicao_nos';

/*
 * Painel do nó selecionado no editor de vértices: tipo do nó, coordenadas e alças por número, segmento reto/curvo,
 * arco por raio e concordância. É só DOM: cada controle chama uma ação do editor e o painel se redesenha com a
 * geometria que o editor devolve. Entradas digitadas são hostis (vazias, NaN, vírgula decimal).
 */

export interface AcoesPainelNo {
  moverNo(coord: LatLonPar): void;
  definirAlca(qual: QualAlca, valor: { comprimentoM: number; azimuteGraus: number }): void;
  definirTipo(tipo: TipoNo): void;
  endireitarSegmento(): void;
  curvarSegmento(): void;
  arco(raioM: number, lado: 'esquerda' | 'direita'): void;
  concordar(raioM: number): void;
  /** Mensagem curta para o usuário (entrada inválida). */
  avisar(texto: string): void;
}

export const RAIO_PADRAO_ARCO_M = 10;

const TIPOS: Array<{ tipo: TipoNo; rotulo: string; titulo: string }> = [
  { tipo: 'canto', rotulo: 'Canto', titulo: 'Sem alças: o traçado muda de direção no nó' },
  { tipo: 'suave', rotulo: 'Suave', titulo: 'Alças alinhadas, cada uma com o seu comprimento' },
  { tipo: 'simetrico', rotulo: 'Simétrico', titulo: 'Alças alinhadas e do mesmo comprimento' },
  { tipo: 'livre', rotulo: 'Livre', titulo: 'Alças independentes (cúspide)' }
];

/** Número digitado, aceitando vírgula decimal. `null` se vazio ou inválido. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '') return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

const ESTILO_BOTAO = 'padding:2px 7px;font-size:11px;border-radius:4px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;cursor:pointer';
const ESTILO_CAMPO = 'width:84px;padding:1px 4px;font-size:11px;border-radius:4px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff';
const COR_TIPO_ATIVO = '#22d3ee';

export class PainelNo {
  public readonly el: HTMLElement;
  private readonly campos = new Map<string, HTMLInputElement>();
  private readonly botoesTipo = new Map<TipoNo, HTMLButtonElement>();
  private readonly botoes = new Map<string, HTMLButtonElement>();

  constructor(private readonly acoes: AcoesPainelNo) {
    const el = document.createElement('div');
    el.dataset.painelNo = '';
    el.style.cssText = 'display:none;flex:0 0 100%;flex-wrap:wrap;gap:6px 10px;align-items:center;padding-top:4px;border-top:1px solid rgba(255,255,255,.15)';
    this.el = el;
    this.montar();
  }

  private rotulo(texto: string): HTMLElement {
    const s = document.createElement('span');
    s.textContent = texto;
    s.style.opacity = '.75';
    return s;
  }

  private campo(nome: string, titulo: string, aoConfirmar: () => void, largura?: number): HTMLInputElement {
    const i = document.createElement('input');
    i.type = 'text';
    i.inputMode = 'decimal';
    i.autocomplete = 'off';
    i.spellcheck = false;
    i.dataset.campo = nome;
    i.title = titulo;
    i.setAttribute('aria-label', titulo);
    i.style.cssText = ESTILO_CAMPO + (largura ? `;width:${largura}px` : '');
    const confirmar = (): void => aoConfirmar();
    i.addEventListener('change', confirmar);
    i.addEventListener('keydown', (e) => {
      // as teclas do campo não vazam para o mapa nem para os atalhos do editor
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmar();
      }
    });
    this.campos.set(nome, i);
    return i;
  }

  private botao(acao: string, rotulo: string, titulo: string, aoClicar: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.acao = acao;
    b.textContent = rotulo;
    b.title = titulo;
    b.style.cssText = ESTILO_BOTAO;
    b.addEventListener('click', aoClicar);
    this.botoes.set(acao, b);
    return b;
  }

  private montar(): void {
    const grupo = (...filhos: HTMLElement[]): HTMLElement => {
      const g = document.createElement('span');
      g.style.cssText = 'display:inline-flex;gap:4px;align-items:center';
      g.append(...filhos);
      return g;
    };

    const tipos = grupo(this.rotulo('Nó'));
    for (const t of TIPOS) {
      const b = this.botao(`tipo-${t.tipo}`, t.rotulo, t.titulo, () => this.acoes.definirTipo(t.tipo));
      this.botoesTipo.set(t.tipo, b);
      tipos.append(b);
    }

    const coords = grupo(
      this.rotulo('Lat'), this.campo('lat', 'Latitude do nó (graus decimais)', () => this.confirmarCoordenada(), 92),
      this.rotulo('Lon'), this.campo('lon', 'Longitude do nó (graus decimais)', () => this.confirmarCoordenada(), 92)
    );

    const alca = (qual: QualAlca, rotulo: string): HTMLElement => grupo(
      this.rotulo(rotulo),
      this.campo(`${qual}-comp`, `Comprimento da alça de ${qual === 'saida' ? 'saída' : 'entrada'} (metros)`, () => this.confirmarAlca(qual), 56),
      this.campo(`${qual}-az`, `Azimute da alça de ${qual === 'saida' ? 'saída' : 'entrada'} (graus, 0 = norte, horário)`, () => this.confirmarAlca(qual), 50),
      this.rotulo('m ·°')
    );

    const segmento = grupo(
      this.rotulo('Segmento →'),
      this.botao('reto', 'Reto', 'Tira as alças do trecho que sai deste nó', () => this.acoes.endireitarSegmento()),
      this.botao('curvo', 'Curvo', 'Dá alças ao trecho que sai deste nó', () => this.acoes.curvarSegmento())
    );

    const arcos = grupo(
      this.rotulo('Raio'),
      this.campo('raio', 'Raio em metros para o arco ou a concordância', () => undefined, 52),
      this.botao('arco-esq', 'Arco ⟲', 'Troca o trecho que sai deste nó por um arco abaulado para a esquerda', () => this.pedirArco('esquerda')),
      this.botao('arco-dir', 'Arco ⟳', 'Troca o trecho que sai deste nó por um arco abaulado para a direita', () => this.pedirArco('direita')),
      this.botao('concordar', 'Concordar', 'Arredonda o canto deste nó com um arco tangente aos dois trechos (raio ao lado)', () => this.pedirConcordar())
    );
    this.campos.get('raio')!.value = String(RAIO_PADRAO_ARCO_M);

    this.el.append(tipos, coords, alca('entrada', 'Alça ←'), alca('saida', 'Alça →'), segmento, arcos);
  }

  private confirmarCoordenada(): void {
    const lat = lerNumero(this.campos.get('lat')!.value);
    const lon = lerNumero(this.campos.get('lon')!.value);
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      this.acoes.avisar('Coordenada inválida (latitude -90 a 90, longitude -180 a 180).');
      return;
    }
    this.acoes.moverNo([lat, lon]);
  }

  private confirmarAlca(qual: QualAlca): void {
    const comp = lerNumero(this.campos.get(`${qual}-comp`)!.value);
    const az = lerNumero(this.campos.get(`${qual}-az`)!.value);
    if (comp === null || az === null || comp < 0) {
      this.acoes.avisar('Alça: informe o comprimento (m, ≥ 0) e o azimute (°).');
      return;
    }
    this.acoes.definirAlca(qual, { comprimentoM: comp, azimuteGraus: az });
  }

  private raio(): number | null {
    const r = lerNumero(this.campos.get('raio')!.value);
    if (r === null || r <= 0) {
      this.acoes.avisar('Informe um raio maior que zero (metros).');
      return null;
    }
    return r;
  }

  private pedirArco(lado: 'esquerda' | 'direita'): void {
    const r = this.raio();
    if (r !== null) this.acoes.arco(r, lado);
  }

  private pedirConcordar(): void {
    const r = this.raio();
    if (r !== null) this.acoes.concordar(r);
  }

  /** Mostra o painel do nó `selecionado` (ou o esconde) e preenche os campos que não estão sendo digitados. */
  public atualizar(g: GeometriaFeicao | null, selecionado: number | null): void {
    const nos = g && nosOuVertices(g);
    const no = nos && selecionado !== null ? nos[selecionado] : undefined;
    if (!g || !nos || !no || selecionado === null) {
      this.el.style.display = 'none';
      return;
    }
    this.el.style.display = 'flex';
    const tipo = tipoDoNo(no);
    for (const [t, b] of this.botoesTipo) {
      const ativo = t === tipo;
      b.style.background = ativo ? COR_TIPO_ATIVO : 'transparent';
      b.style.color = ativo ? '#111' : '#fff';
      b.setAttribute('aria-pressed', String(ativo));
    }
    const ponha = (nome: string, valor: string, habilitado = true): void => {
      const c = this.campos.get(nome);
      if (!c) return;
      c.disabled = !habilitado;
      c.style.opacity = habilitado ? '1' : '.4';
      if (document.activeElement !== c) c.value = valor;
    };
    ponha('lat', no.ponto[0].toFixed(7));
    ponha('lon', no.ponto[1].toFixed(7));
    for (const qual of ['entrada', 'saida'] as const) {
      const p = alcaPolar(g, selecionado, qual);
      ponha(`${qual}-comp`, p ? p.comprimentoM.toFixed(3) : '', !!p);
      ponha(`${qual}-az`, p ? p.azimuteGraus.toFixed(2) : '', !!p);
    }
    const proximo = selecionado < nos.length - 1 || g.tipo === 'Polygon';
    for (const acao of ['reto', 'curvo', 'arco-esq', 'arco-dir']) this.habilitar(acao, proximo);
    this.habilitar('concordar', tipo === 'canto');
  }

  private habilitar(acao: string, ligado: boolean): void {
    const b = this.botoes.get(acao);
    if (!b) return;
    b.disabled = !ligado;
    b.style.opacity = ligado ? '1' : '.4';
    b.style.cursor = ligado ? 'pointer' : 'default';
  }
}
