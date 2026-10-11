import type { Ponto, Segmento, Confrontante } from './types';
import { criarLinha, type Feicao, type LatLonPar } from './feature_types';
import { parseCoordenada } from './utils';
import { statusDe } from './feature_versoes';

/*
 * Adaptadores dos dados atuais (pontos, segmentos, vizinhos) para Feicao.
 * Camadas existentes e genéricas convivem: os renderizadores antigos seguem intactos.
 */

/** Opções da normalização de entrada. */
export interface OpcoesNormalizacao {
  /**
   * Aceita a coordenada (0, 0) exata. Por padrão ela é rejeitada, pois costuma ser um placeholder de erro
   * ("Null Island"); ligue quando houver dados reais ali.
   */
  aceitarOrigem?: boolean;
}

/**
 * Aceita [lat,lon], {lat,lng|lon}, {latitude,longitude}. Descarta NaN/Infinity.
 * Rejeita (0, 0) exato, a menos que `opcoes.aceitarOrigem` (ver `normalizarFeicaoEntrada`).
 */
export function normalizarCoordenada(bruta: unknown, opcoes?: OpcoesNormalizacao): LatLonPar | null {
  let lat: unknown;
  let lon: unknown;
  if (Array.isArray(bruta)) {
    [lat, lon] = bruta;
  } else if (bruta && typeof bruta === 'object') {
    const o = bruta as Record<string, unknown>;
    lat = o.lat ?? o.latitude;
    lon = o.lng ?? o.lon ?? o.longitude;
  } else {
    return null;
  }
  const c = parseCoordenada(lat, lon, opcoes);
  if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lon)) return null;
  return [c.lat, c.lon];
}

function iguais(a: LatLonPar, b: LatLonPar): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Normaliza um anel; abre o anel fechado duplicado. Exige ≥3 vértices. */
export function normalizarAnel(bruto: unknown[], opcoes?: OpcoesNormalizacao): LatLonPar[] | null {
  const pts = bruto.map((c) => normalizarCoordenada(c, opcoes)).filter((p): p is LatLonPar => p !== null);
  if (pts.length > 1 && iguais(pts[0], pts[pts.length - 1])) pts.pop();
  return pts.length >= 3 ? pts : null;
}

/** Normaliza uma linha; exige ≥2 vértices. */
export function normalizarLinha(bruta: unknown[], opcoes?: OpcoesNormalizacao): LatLonPar[] | null {
  const pts = bruta.map((c) => normalizarCoordenada(c, opcoes)).filter((p): p is LatLonPar => p !== null);
  return pts.length >= 2 ? pts : null;
}

/** Aceita anel simples ou multianel. */
export function normalizarPoligono(bruto: unknown[], opcoes?: OpcoesNormalizacao): LatLonPar[][] | null {
  if (!Array.isArray(bruto) || bruto.length === 0) return null;
  const multi = Array.isArray(bruto[0]) && Array.isArray((bruto[0] as unknown[])[0]);
  const aneis = (multi ? (bruto as unknown[][]) : [bruto]).map((a) => normalizarAnel(a, opcoes));
  if (aneis.some((a) => a === null)) return null;
  return aneis as LatLonPar[][];
}

export function pontoParaFeicao(p: Ponto, camadaId: string): Feicao | null {
  const c = parseCoordenada(p.lat, p.lon);
  if (!c) return null;
  return {
    id: String(p.id),
    camadaId,
    geometria: { tipo: 'Point', coordenada: [c.lat, c.lon] },
    propriedades: { ...p }
  };
}

/** Segmentos referenciam pontos por id; segmentos com ponta ausente são descartados. */
export function segmentoParaFeicao(s: Segmento, pontos: Map<string, Ponto>, camadaId: string): Feicao | null {
  const a = pontos.get(String(s.ponto_inicio_id));
  const b = pontos.get(String(s.ponto_fim_id));
  if (!a || !b) return null;
  const ca = parseCoordenada(a.lat, a.lon);
  const cb = parseCoordenada(b.lat, b.lon);
  if (!ca || !cb) return null;
  const tracejado = (s.tipo_limite_sigef ?? s.tipo_limite) === 'LN1';
  return {
    id: String(s.id ?? `${s.ponto_inicio_id}-${s.ponto_fim_id}`),
    camadaId,
    geometria: { tipo: 'LineString', coordenadas: [[ca.lat, ca.lon], [cb.lat, cb.lon]] },
    estilo: tracejado ? { dashArray: '6, 6' } : undefined,
    propriedades: { ...s }
  };
}

/** Converte o POLYGON((x y, ...)) do vizinho (ordem WKT: lon lat). */
export function confrontanteParaFeicao(c: Confrontante, camadaId: string): Feicao | null {
  if (!c.poligono_wkt) return null;
  const m = /POLYGON\s*\(\s*\(\s*(.*?)\s*\)\s*\)/i.exec(c.poligono_wkt);
  if (!m) return null;
  const pares = m[1].split(',').map((par) => {
    const [x, y] = par.trim().split(/\s+/);
    return [y, x]; // WKT é lon lat; a normalização espera lat lon
  });
  const anel = normalizarAnel(pares);
  if (!anel) return null;
  return {
    id: String(c.id ?? c.nome ?? ''),
    camadaId,
    geometria: { tipo: 'Polygon', aneis: [anel] },
    propriedades: { nome: c.nome, nome_propriedade: c.nome_propriedade }
  };
}

const TIPOS = new Set(['Point', 'LineString', 'Polygon', 'Circle', 'Text']);

/**
 * Porta de entrada das feições vindas do consumidor: aceita coordenadas em qualquer formato
 * suportado por `normalizarCoordenada` e devolve a `Feicao` normalizada, ou `null` se inválida.
 *
 * Por padrão rejeita a coordenada (0, 0) exata (placeholder de erro, "Null Island"): uma feição com um
 * vértice ali é descartada. Quem tem dados reais nesse ponto liga `opcoes.aceitarOrigem` (no componente,
 * o atributo `aceitar-origem`).
 */
export function normalizarFeicaoEntrada(bruta: unknown, camadaId: string, opcoes?: OpcoesNormalizacao): Feicao | null {
  if (!bruta || typeof bruta !== 'object') return null;
  const r = bruta as Record<string, any>;
  const g = r.geometria;
  if (!g || !TIPOS.has(g.tipo) || r.id === undefined || r.id === null || r.id === '') return null;

  let geometria: Feicao['geometria'] | null = null;
  switch (g.tipo) {
    case 'Point': {
      const c = normalizarCoordenada(g.coordenada, opcoes);
      if (c) geometria = { tipo: 'Point', coordenada: c };
      break;
    }
    case 'Text': {
      const c = normalizarCoordenada(g.coordenada, opcoes);
      if (c && typeof g.texto === 'string' && g.texto) geometria = { tipo: 'Text', coordenada: c, texto: g.texto };
      break;
    }
    case 'LineString': {
      // `partes` (multiparte) vence `coordenadas`; partes com menos de 2 vértices válidos são descartadas
      const partes = Array.isArray(g.partes)
        ? g.partes.map((p: unknown) => (Array.isArray(p) ? normalizarLinha(p, opcoes) : null)).filter((p: LatLonPar[] | null): p is LatLonPar[] => p !== null)
        : [];
      if (partes.length > 0) {
        geometria = criarLinha(partes);
      } else {
        const pts = Array.isArray(g.coordenadas) ? normalizarLinha(g.coordenadas, opcoes) : null;
        if (pts) geometria = criarLinha([pts]);
      }
      break;
    }
    case 'Polygon': {
      const aneis = Array.isArray(g.aneis) ? normalizarPoligono(g.aneis, opcoes) : null;
      if (aneis) geometria = { tipo: 'Polygon', aneis };
      break;
    }
    case 'Circle': {
      const c = normalizarCoordenada(g.centro, opcoes);
      const raio = Number(g.raioMetros);
      if (c && Number.isFinite(raio) && raio > 0) geometria = { tipo: 'Circle', centro: c, raioMetros: raio };
      break;
    }
  }
  if (!geometria) return null;

  const f: Feicao = {
    id: String(r.id),
    camadaId,
    geometria,
    estilo: r.estilo && typeof r.estilo === 'object' ? { ...r.estilo } : undefined,
    propriedades: r.propriedades && typeof r.propriedades === 'object' ? { ...r.propriedades } : {},
    bloqueada: !!r.bloqueada,
    status: 'oficial',
    excluida: !!r.excluida
  };
  if (r.oculta) f.oculta = true;
  if (typeof r.entidadeId === 'string' || typeof r.entidadeId === 'number') f.entidadeId = String(r.entidadeId);
  f.status = statusDe({ ...f, status: r.status });
  return f;
}
