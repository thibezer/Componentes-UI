/**
 * Decisões puras do comportamento responsivo do <ui-ribbon> (zero DOM, testável sem layout).
 * Responsabilidade única: dado o que foi medido, dizer o que fazer; quem chama mede e aplica.
 */

/** Nível 0: grupo completo. */
export const NIVEL_COMPLETO = 0;
/** Nível 1: botões pequenos só com ícone (o rótulo continua no tooltip e no nome acessível). */
export const NIVEL_REDUZIDO = 1;
/** Nível 2: o grupo inteiro vira um único botão com flyout. */
export const NIVEL_COLAPSADO = 2;

export interface GrupoMedido {
  id: string;
  /** Menor prioridade degrada primeiro; empate: o grupo mais à direita primeiro. Padrão: 0. */
  prioridade?: number;
  /** Largura (px) do grupo em cada nível, do mais largo (0) ao mais estreito. */
  larguras: number[];
}

export interface ResultadoNiveis {
  /** `id` do grupo → nível aplicado (`NIVEL_*`). Todo grupo válido da entrada aparece. */
  niveis: Map<string, number>;
  /** `false` quando nem com tudo degradado há espaço (o painel rola na horizontal). */
  cabe: boolean;
}

const valida = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/**
 * Escolhe o nível de cada grupo para que a soma das larguras caiba em `disponivel`.
 *
 * Estratégia (estilo Office): degrada em **rodadas por nível**. Na rodada 1 reduz grupos (só ícones), na rodada
 * seguinte colapsa; dentro de cada rodada a ordem é a prioridade crescente (empate: da direita para a esquerda) e
 * para assim que cabe. Assim todos perdem rótulos antes de qualquer grupo virar flyout. Níveis que não estreitam o
 * grupo são pulados. Sem histerese: depende só das medidas, então voltar a ficar largo restaura tudo.
 *
 * `extra` é a largura fixa fora dos grupos (padding do contêiner). Entradas inválidas nunca lançam: espaço
 * `<= 0`, `NaN` ou infinito (painel oculto/sem layout) mantém todos completos.
 */
export function decidirNiveisGrupos(grupos: GrupoMedido[], disponivel: number, extra = 0): ResultadoNiveis {
  const niveis = new Map<string, number>();
  const lista: { id: string; prio: number; ordem: number; larguras: number[] }[] = [];
  if (Array.isArray(grupos)) {
    grupos.forEach((g, ordem) => {
      if (!g || typeof g.id !== 'string') return;
      const larguras = Array.isArray(g.larguras) ? g.larguras.map(v => (valida(v) ? v : NaN)) : [];
      niveis.set(g.id, NIVEL_COMPLETO);
      lista.push({ id: g.id, prio: Number.isFinite(g.prioridade) ? (g.prioridade as number) : 0, ordem, larguras });
    });
  }

  const espaco = Number.isFinite(disponivel) ? disponivel : 0;
  if (!lista.length || espaco <= 0) return { niveis, cabe: true };

  const atual = new Map<string, number>();
  let total = valida(extra) ? extra : 0;
  for (const g of lista) {
    const w = g.larguras[NIVEL_COMPLETO];
    atual.set(g.id, valida(w) ? w : 0);
    total += atual.get(g.id)!;
  }
  if (total <= espaco) return { niveis, cabe: true };

  const ordenados = [...lista].sort((a, b) => a.prio - b.prio || b.ordem - a.ordem);
  const maxNivel = lista.reduce((m, g) => Math.max(m, g.larguras.length - 1), 0);

  for (let nivel = NIVEL_REDUZIDO; nivel <= maxNivel; nivel++) {
    for (const g of ordenados) {
      const w = g.larguras[nivel];
      const hoje = atual.get(g.id)!;
      if (!valida(w) || w >= hoje) continue; // não estreita: pula
      total -= hoje - w;
      atual.set(g.id, w);
      niveis.set(g.id, nivel);
      if (total <= espaco) return { niveis, cabe: true };
    }
  }
  return { niveis, cabe: false };
}

export interface DecisaoRecolhimento {
  /** Lado atual (`null` = ainda indeterminado). Guarde para a próxima chamada. */
  estreito: boolean | null;
  acao: 'recolher' | 'restaurar' | null;
}

/**
 * Recolhimento automático da faixa em telas estreitas (`recolher-abaixo`).
 * Só age ao **cruzar** o limite (e na primeira medição): quem expandiu a faixa à mão num espaço estreito não é
 * contrariado, e só se restaura o que foi recolhido automaticamente (`recolhidoPorAuto`), nunca a escolha do usuário.
 */
export function decidirRecolhimentoAuto(
  estreitoAntes: boolean | null,
  largura: number,
  limite: number,
  recolhido: boolean,
  recolhidoPorAuto: boolean
): DecisaoRecolhimento {
  const semDecisao: DecisaoRecolhimento = { estreito: estreitoAntes, acao: null };
  if (!Number.isFinite(largura) || largura <= 0 || !Number.isFinite(limite) || limite <= 0) return semDecisao;

  const estreito = largura < limite;
  if (estreito === estreitoAntes) return semDecisao;
  if (estreito) return { estreito, acao: recolhido ? null : 'recolher' };
  return { estreito, acao: recolhido && recolhidoPorAuto ? 'restaurar' : null };
}

export interface EntradaRolagem {
  /** Posição do item no conteúdo rolável (ex.: `offsetLeft`). */
  inicio: number;
  tamanho: number;
  /** Rolagem atual (`scrollLeft`). */
  rolagem: number;
  /** Largura da área visível (`clientWidth`). */
  visivel: number;
  margem?: number;
}

/**
 * Nova rolagem (`scrollLeft`) que deixa o item inteiro visível, movendo o mínimo.
 * Item maior que a área visível alinha o início. Entradas inválidas mantêm a rolagem atual; nunca negativo.
 */
export function rolagemParaVisivel({ inicio, tamanho, rolagem, visivel, margem = 8 }: EntradaRolagem): number {
  const atual = Number.isFinite(rolagem) && rolagem > 0 ? rolagem : 0;
  if (!Number.isFinite(inicio) || !Number.isFinite(tamanho) || !Number.isFinite(visivel) || visivel <= 0) return atual;

  const m = Number.isFinite(margem) && margem > 0 ? margem : 0;
  const esquerda = Math.max(0, inicio - m);
  const direita = inicio + Math.max(0, tamanho) + m;

  if (direita - esquerda > visivel) return esquerda;
  if (esquerda < atual) return esquerda;
  if (direita > atual + visivel) return direita - visivel;
  return atual;
}
