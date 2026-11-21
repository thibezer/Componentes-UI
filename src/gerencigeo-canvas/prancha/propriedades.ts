import { limitesNaFolha } from './elemento_geometria';
import { normalizarElemento } from './elemento_validacao';
import { MODOS_MESCLAGEM, resolverAparencia, resolverSombra } from './aparencia_estilo';
import type { AparenciaElemento, ElementoGrafico, PontaSeta, SombraElemento } from './tipos';

/*
 * Propriedades editáveis de um elemento (L2, puro): o id de cada campo, o valor de EXIBIÇÃO (padrões resolvidos,
 * opacidades em %) e a troca de um campo devolvendo o elemento novo, já validado (`normalizarElemento`). É a fonte única
 * para qualquer painel (o `ui-tabela-propriedades` do kit ou outro do app): nenhum painel decide padrão nem faixa.
 * Os campos `geometria.*` só são lidos aqui; a mudança deles é uma transformação da seleção (feita pelo componente).
 */

export const IDS_PROPRIEDADES_PRANCHA = [
  'elemento.nome', 'elemento.bloqueado', 'elemento.oculto',
  'geometria.x', 'geometria.y', 'geometria.largura', 'geometria.altura', 'geometria.rotacao', 'geometria.raio',
  'traco.ativo', 'traco.cor', 'traco.espessura', 'traco.opacidade', 'traco.tipoLinha', 'traco.escalaTipoLinha', 'traco.terminacao',
  'traco.juncao', 'traco.alinhamento', 'traco.pontaInicio', 'traco.pontaFim',
  'preenchimento.ativo', 'preenchimento.cor', 'preenchimento.opacidade', 'preenchimento.regra',
  'hachura.ativa', 'hachura.angulo', 'hachura.espacamento', 'hachura.cor', 'hachura.cruzada',
  'efeitos.opacidade', 'efeitos.mesclagem',
  'sombra.ativa', 'sombra.dx', 'sombra.dy', 'sombra.desfoque', 'sombra.cor', 'sombra.opacidade'
] as const;

export type IdPropriedadePrancha = (typeof IDS_PROPRIEDADES_PRANCHA)[number];

export const ehPropriedadePrancha = (v: unknown): v is IdPropriedadePrancha =>
  typeof v === 'string' && (IDS_PROPRIEDADES_PRANCHA as readonly string[]).includes(v);

/** Campos de geometria: mudam por transformação da seleção, não por `comPropriedade`. */
export const ehPropriedadeDeGeometria = (id: string): boolean => id.startsWith('geometria.');

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const arred = (v: number): number => Math.round(v * 1e6) / 1e6;

/** Rotação do elemento em graus (−180 a 180], pela matriz. */
export function rotacaoEmGraus(el: ElementoGrafico): number {
  const m = el.transformacao;
  return m && fin(m.a) && fin(m.b) ? arred((Math.atan2(m.b, m.a) * 180) / Math.PI) : 0;
}

/** Valor de exibição do campo (`undefined` se não se aplica ao elemento). Nunca lança. */
export function valorDaPropriedade(el: ElementoGrafico, id: IdPropriedadePrancha): unknown {
  if (!el || typeof el !== 'object' || !el.geometria) return undefined;
  try {
    const ap = el.aparencia ?? {};
    const r = resolverAparencia(el);
    const tr = ap.traco ?? undefined;
    const l = id.startsWith('geometria.') ? limitesNaFolha(el) : null;
    switch (id) {
      case 'elemento.nome': return el.nome ?? '';
      case 'elemento.bloqueado': return el.bloqueado === true;
      case 'elemento.oculto': return el.oculto === true;
      case 'geometria.x': return l ? arred(l.x) : undefined;
      case 'geometria.y': return l ? arred(l.y) : undefined;
      case 'geometria.largura': return l ? arred(l.largura) : undefined;
      case 'geometria.altura': return l ? arred(l.altura) : undefined;
      case 'geometria.rotacao': return rotacaoEmGraus(el);
      case 'geometria.raio': {
        if (el.geometria.tipo !== 'retangulo') return undefined;
        const rs = el.geometria.raios ?? [0, 0, 0, 0];
        return rs.every((v) => v === rs[0]) ? rs[0] : null;
      }
      case 'traco.ativo': return r.traco !== null;
      case 'traco.cor': return r.traco?.cor ?? tr?.cor ?? '#000000';
      case 'traco.espessura': return r.traco?.largura ?? tr?.espessura ?? 0.25;
      case 'traco.opacidade': return arred((r.traco?.opacidade ?? tr?.opacidade ?? 1) * 100);
      case 'traco.tipoLinha': return tr?.tipoLinha ?? 'continua';
      case 'traco.escalaTipoLinha': return tr?.escalaTipoLinha ?? 1;
      case 'traco.terminacao': return tr?.terminacao ?? 'reta';
      case 'traco.juncao': return tr?.juncao ?? 'angular';
      case 'traco.alinhamento': return tr?.alinhamento ?? 'centro';
      case 'traco.pontaInicio': return tr?.pontaInicio?.estilo ?? 'nenhuma';
      case 'traco.pontaFim': return tr?.pontaFim?.estilo ?? 'nenhuma';
      case 'preenchimento.ativo': return r.preenchimento !== null;
      case 'preenchimento.cor': return r.preenchimento?.cor ?? ap.preenchimento?.cor ?? '#ffffff';
      case 'preenchimento.opacidade': return arred((r.preenchimento?.opacidade ?? 1) * 100);
      case 'preenchimento.regra': return r.preenchimento?.regra ?? ap.preenchimento?.regra ?? 'nonzero';
      case 'hachura.ativa': return !!ap.hachura;
      case 'hachura.angulo': return ap.hachura?.angulo ?? 45;
      case 'hachura.espacamento': return ap.hachura?.espacamento ?? 2;
      case 'hachura.cor': return r.hachura?.cor ?? ap.hachura?.cor ?? '#000000';
      case 'hachura.cruzada': return ap.hachura?.cruzada === true;
      case 'efeitos.opacidade': return arred(r.opacidade * 100);
      case 'efeitos.mesclagem': return ap.mesclagem ?? 'normal';
      case 'sombra.ativa': return !!ap.sombra;
    }
    const s = resolverSombra(ap.sombra ?? {}) ?? { dx: 1.5, dy: 1.5, desfoque: 1, cor: '#000000', opacidade: 0 };
    switch (id) {
      case 'sombra.dx': return s.dx;
      case 'sombra.dy': return s.dy;
      case 'sombra.desfoque': return s.desfoque;
      case 'sombra.cor': return s.cor;
      case 'sombra.opacidade': return arred(s.opacidade * 100);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

const numero = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : v;
  return fin(n) ? n : null;
};
const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const booleano = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : null);

/** Liga ou ajusta um bloco opcional da aparência (`null` = desligado; ausente = padrão). */
function bloco<T extends object>(atual: T | null | undefined): T {
  return (atual && typeof atual === 'object' ? { ...atual } : {}) as T;
}

/**
 * O elemento com o campo trocado (validado), ou `null` se o valor não serve, o campo é de geometria ou desconhecido.
 * Nunca lança.
 */
export function comPropriedade(el: ElementoGrafico, id: IdPropriedadePrancha, valor: unknown): ElementoGrafico | null {
  if (!el || typeof el !== 'object' || !ehPropriedadePrancha(id) || ehPropriedadeDeGeometria(id)) return null;
  const ap: AparenciaElemento = { ...(el.aparencia ?? {}) };
  const novo: ElementoGrafico = { ...el };
  const [grupo, campo] = id.split('.') as [string, string];
  const n = numero(valor);
  const b = booleano(valor);
  const t = texto(valor);
  const pct = n === null ? null : Math.min(1, Math.max(0, n / 100));

  if (grupo === 'elemento') {
    if (campo === 'nome') {
      if (t === null) return null;
      if (t.trim() === '') delete novo.nome;
      else novo.nome = t;
    } else {
      if (b === null) return null;
      if (b) novo[campo as 'bloqueado' | 'oculto'] = true;
      else delete novo[campo as 'bloqueado' | 'oculto'];
    }
  } else if (grupo === 'traco') {
    if (campo === 'ativo') {
      if (b === null) return null;
      ap.traco = b ? bloco(ap.traco) : null;
    } else {
      const tr = bloco(ap.traco);
      if (campo === 'cor' && t !== null) tr.cor = t;
      else if (campo === 'espessura' && n !== null && n >= 0) tr.espessura = n;
      else if (campo === 'opacidade' && pct !== null) tr.opacidade = pct;
      else if (campo === 'escalaTipoLinha' && n !== null && n > 0) tr.escalaTipoLinha = n;
      else if (campo === 'tipoLinha' && t !== null) tr.tipoLinha = t as never;
      else if (campo === 'terminacao' && t !== null && ['reta', 'arredondada', 'quadrada'].includes(t)) tr.terminacao = t as never;
      else if (campo === 'juncao' && t !== null && ['angular', 'arredondada', 'chanfrada'].includes(t)) tr.juncao = t as never;
      else if (campo === 'alinhamento' && t !== null && ['centro', 'dentro', 'fora'].includes(t)) tr.alinhamento = t as never;
      else if ((campo === 'pontaInicio' || campo === 'pontaFim') && t !== null) {
        if (t === 'nenhuma') delete tr[campo];
        else tr[campo] = { ...(tr[campo] ?? {}), estilo: t } as PontaSeta;
      } else return null;
      ap.traco = tr;
    }
  } else if (grupo === 'preenchimento') {
    if (campo === 'ativo') {
      if (b === null) return null;
      // ligar sem cor anterior usa branco (o que o painel mostra), como os editores vetoriais
      ap.preenchimento = b ? { cor: '#ffffff', ...bloco(ap.preenchimento) } : null;
    } else {
      const p = bloco(ap.preenchimento);
      if (campo === 'cor' && t !== null) { p.cor = t; delete p.gradiente; }
      else if (campo === 'opacidade' && pct !== null) p.opacidade = pct;
      else if (campo === 'regra' && (t === 'nonzero' || t === 'evenodd')) p.regra = t;
      else return null;
      ap.preenchimento = p;
    }
  } else if (grupo === 'hachura') {
    if (campo === 'ativa') {
      if (b === null) return null;
      ap.hachura = b ? bloco(ap.hachura) : null;
    } else {
      const h = bloco(ap.hachura);
      if (campo === 'angulo' && n !== null) h.angulo = n;
      else if (campo === 'espacamento' && n !== null && n > 0) h.espacamento = n;
      else if (campo === 'cor' && t !== null) h.cor = t;
      else if (campo === 'cruzada' && b !== null) h.cruzada = b;
      else return null;
      ap.hachura = h;
    }
  } else if (grupo === 'efeitos') {
    if (campo === 'opacidade' && pct !== null) ap.opacidade = pct;
    else if (campo === 'mesclagem' && t !== null && (MODOS_MESCLAGEM as string[]).includes(t)) {
      if (t === 'normal') delete ap.mesclagem;
      else ap.mesclagem = t as never;
    } else return null;
  } else if (grupo === 'sombra') {
    if (campo === 'ativa') {
      if (b === null) return null;
      ap.sombra = b ? bloco<SombraElemento>(ap.sombra) : null;
    } else {
      const s = bloco<SombraElemento>(ap.sombra);
      const atual = resolverSombra({ ...s, opacidade: 1 })!;
      if (campo === 'dx' && n !== null) s.deslocamento = [n, atual.dy];
      else if (campo === 'dy' && n !== null) s.deslocamento = [atual.dx, n];
      else if (campo === 'desfoque' && n !== null && n >= 0) s.desfoque = n;
      else if (campo === 'cor' && t !== null) s.cor = t;
      else if (campo === 'opacidade' && pct !== null) s.opacidade = pct;
      else return null;
      ap.sombra = s;
    }
  } else return null;

  if (grupo !== 'elemento') novo.aparencia = ap;
  const limpo = normalizarElemento(novo);
  return limpo ?? null;
}
