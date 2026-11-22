import { TIPOS_LINHA } from '../../gerencigeo-canvas/motor/tipos-linha';
import { contornoNaFolha, limitesNaFolha } from '../../gerencigeo-canvas/prancha/elemento_geometria';
import { MODOS_MESCLAGEM } from '../../gerencigeo-canvas/prancha/aparencia_estilo';
import { valorDaPropriedade, type IdPropriedadePrancha } from '../../gerencigeo-canvas/prancha/propriedades';
import type { ElementoGrafico, ModoMesclagem } from '../../gerencigeo-canvas/prancha/tipos';

/*
 * Dados do painel de propriedades (sem DOM): as categorias no formato do `<ui-tabela-propriedades>` do kit para a seleção
 * da prancha. A prancha não importa o painel (outro L4): os tipos abaixo são o mesmo contrato, por estrutura. O app só
 * liga: `painel.categorias = prancha.categoriasDePropriedades()` e, no `ui-propriedade-alterada`,
 * `prancha.aplicarPropriedade(e.detail.id, e.detail.valor)`.
 */

export type TipoItemPainelPrancha = 'texto' | 'numero' | 'selecao' | 'booleano' | 'cor' | 'linha' | 'readonly';

export interface ItemPainelPrancha {
  id: string;
  rotulo: string;
  tipo: TipoItemPainelPrancha;
  valor: unknown;
  /** Valor diferente entre os selecionados (o painel mostra "Varia"). */
  misto?: boolean;
  unidade?: string;
  casasDecimais?: number;
  passo?: number;
  min?: number;
  max?: number;
  opcoes?: Array<{ id: string; rotulo: string }>;
  dica?: string;
}

export interface CategoriaPainelPrancha {
  id: string;
  titulo: string;
  aberto?: boolean;
  propriedades: ItemPainelPrancha[];
}

const ROTULO_TIPO: Record<string, string> = {
  retangulo: 'Retângulo', elipse: 'Elipse', 'poligono-regular': 'Polígono', estrela: 'Estrela', linha: 'Linha', caminho: 'Caminho',
  texto: 'Texto'
};

export const rotuloDoTipo = (el: ElementoGrafico): string => ROTULO_TIPO[el?.geometria?.tipo] ?? 'Elemento';

const ROTULO_MESCLAGEM: Record<ModoMesclagem, string> = {
  normal: 'Normal', multiplicar: 'Multiplicar', tela: 'Tela', sobrepor: 'Sobrepor', escurecer: 'Escurecer', clarear: 'Clarear',
  'subexposicao-cor': 'Subexposição de cores', 'superexposicao-cor': 'Superexposição de cores', 'luz-dura': 'Luz direta',
  'luz-suave': 'Luz indireta', diferenca: 'Diferença', exclusao: 'Exclusão', matiz: 'Matiz', saturacao: 'Saturação', cor: 'Cor',
  luminosidade: 'Luminosidade'
};

const ROTULO_LINHA: Record<string, string> = {
  continua: 'Contínua', tracejada: 'Tracejada', 'tracejada-curta': 'Tracejada curta', 'tracejada-longa': 'Tracejada longa',
  pontilhada: 'Pontilhada', 'traco-ponto': 'Traço-ponto'
};

const op = (pares: Array<[string, string]>): Array<{ id: string; rotulo: string }> => pares.map(([id, rotulo]) => ({ id, rotulo }));
const PONTAS = op([['nenhuma', 'Nenhuma'], ['triangulo', 'Triângulo'], ['triangulo-aberto', 'Triângulo vazado'], ['aberta', 'Aberta'], ['circulo', 'Círculo'], ['quadrado', 'Quadrado'], ['losango', 'Losango'], ['barra', 'Barra']]);

/** Um campo, com o valor comum à seleção ou misto. */
function campo(sel: readonly ElementoGrafico[], id: IdPropriedadePrancha, rotulo: string, tipo: TipoItemPainelPrancha, extra: Partial<ItemPainelPrancha> = {}): ItemPainelPrancha | null {
  const valores = sel.map((e) => valorDaPropriedade(e, id)).filter((v) => v !== undefined);
  if (valores.length === 0) return null;
  const chave = (v: unknown): string => JSON.stringify(v);
  const igual = valores.every((v) => chave(v) === chave(valores[0])) && valores[0] !== null;
  return igual ? { id, rotulo, tipo, valor: valores[0], ...extra } : { id, rotulo, tipo, valor: null, misto: true, ...extra };
}

const mm = { unidade: 'mm', casasDecimais: 2, passo: 0.5 };
const pct = { unidade: '%', casasDecimais: 0, passo: 5, min: 0, max: 100 };
const so = (itens: Array<ItemPainelPrancha | null>): ItemPainelPrancha[] => itens.filter((i): i is ItemPainelPrancha => i !== null);

/** Posição e tamanho da CAIXA DA SELEÇÃO (como o painel Transformar dos editores vetoriais). */
function geometria(sel: readonly ElementoGrafico[]): ItemPainelPrancha[] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of sel) {
    const l = limitesNaFolha(e);
    if (!l) continue;
    x0 = Math.min(x0, l.x); y0 = Math.min(y0, l.y); x1 = Math.max(x1, l.x + l.largura); y1 = Math.max(y1, l.y + l.altura);
  }
  const r = (v: number): number => Math.round(v * 1e6) / 1e6;
  const itens: Array<ItemPainelPrancha | null> = Number.isFinite(x0)
    ? [
        { id: 'geometria.x', rotulo: 'X', tipo: 'numero', valor: r(x0), ...mm },
        { id: 'geometria.y', rotulo: 'Y', tipo: 'numero', valor: r(y0), ...mm },
        { id: 'geometria.largura', rotulo: 'Largura', tipo: 'numero', valor: r(x1 - x0), ...mm, min: 0 },
        { id: 'geometria.altura', rotulo: 'Altura', tipo: 'numero', valor: r(y1 - y0), ...mm, min: 0 }
      ]
    : [];
  itens.push(campo(sel, 'geometria.rotacao', 'Rotação', 'numero', { unidade: '°', casasDecimais: 2, passo: 15 }));
  if (sel.every((e) => e.geometria.tipo === 'retangulo')) itens.push(campo(sel, 'geometria.raio', 'Raio dos cantos', 'numero', { ...mm, min: 0 }));
  return so(itens);
}

/** O que o painel mostra da folha quando não há seleção. */
export interface ContextoFolhaPainelPrancha {
  largura: number;
  altura: number;
  unidade?: string;
  grade?: number;
  margens?: { esquerda: number; direita: number; superior: number; inferior: number } | null;
}

const fmt = (n: number): string => String(Math.round(n * 100) / 100).replace('.', ',');

/**
 * Painel SEM seleção: a folha (tamanho, unidade, grade, margens) em campos somente leitura e uma dica. Quem edita a
 * folha são os atributos do componente (`largura`, `altura`, `grade`, `margens`); o painel apenas informa.
 */
export function categoriasSemSelecao(folha: ContextoFolhaPainelPrancha): CategoriaPainelPrancha[] {
  const f = folha && Number.isFinite(folha.largura) && Number.isFinite(folha.altura) ? folha : null;
  const itens: ItemPainelPrancha[] = [{ id: 'dica', rotulo: 'Seleção', tipo: 'readonly', valor: 'Nada selecionado', dica: 'Selecione um elemento para editar: clique nele ou arraste um retângulo de seleção.' }];
  if (f) {
    itens.push({ id: 'folha.tamanho', rotulo: 'Folha', tipo: 'readonly', valor: `${fmt(f.largura)} × ${fmt(f.altura)} mm` });
    if (f.unidade) itens.push({ id: 'folha.unidade', rotulo: 'Unidade', tipo: 'readonly', valor: f.unidade });
    if (Number.isFinite(f.grade)) itens.push({ id: 'folha.grade', rotulo: 'Grade', tipo: 'readonly', valor: `${fmt(f.grade as number)} mm` });
    const m = f.margens;
    if (m) itens.push({ id: 'folha.margens', rotulo: 'Margens', tipo: 'readonly', valor: `${fmt(m.esquerda)} / ${fmt(m.direita)} / ${fmt(m.superior)} / ${fmt(m.inferior)} mm`, dica: 'esquerda / direita / superior / inferior' });
  }
  return [{ id: 'folha', titulo: 'Folha', aberto: true, propriedades: itens }];
}

/**
 * Categorias do painel para a seleção: Elemento, Posição e tamanho, Traço, Preenchimento e Hachura (formas fechadas e,
 * no preenchimento, texto), Efeitos. Seleção vazia (ou inválida) dá `[]`.
 */
export function categoriasDePropriedades(selecao: readonly ElementoGrafico[]): CategoriaPainelPrancha[] {
  const sel = Array.isArray(selecao) ? selecao.filter((e) => e && typeof e === 'object' && e.geometria) : [];
  if (sel.length === 0) return [];
  const textos = sel.filter((e) => e.geometria.tipo === 'texto');
  const fechados = sel.filter((e) => e.geometria.tipo !== 'texto' && contornoNaFolha(e)?.tipo === 'Polygon');
  const comTraco = sel.length > textos.length;
  const tipo = sel.length === 1 ? rotuloDoTipo(sel[0]) : `${sel.length} elementos`;

  const cats: CategoriaPainelPrancha[] = [
    {
      id: 'elemento', titulo: 'Elemento', aberto: true,
      propriedades: so([
        { id: 'elemento.tipo', rotulo: 'Tipo', tipo: 'readonly', valor: tipo },
        campo(sel, 'elemento.nome', 'Nome', 'texto'),
        campo(sel, 'elemento.bloqueado', 'Bloqueado', 'booleano'),
        campo(sel, 'elemento.oculto', 'Oculto', 'booleano')
      ])
    },
    { id: 'geometria', titulo: 'Posição e tamanho', aberto: true, propriedades: geometria(sel) }
  ];

  if (comTraco) {
    const semTexto = sel.filter((e) => e.geometria.tipo !== 'texto');
    cats.push({
      id: 'traco', titulo: 'Traço', aberto: true,
      propriedades: so([
        campo(semTexto, 'traco.ativo', 'Com traço', 'booleano'),
        campo(semTexto, 'traco.cor', 'Cor', 'cor'),
        campo(semTexto, 'traco.espessura', 'Espessura', 'numero', { ...mm, passo: 0.05, min: 0 }),
        campo(semTexto, 'traco.opacidade', 'Opacidade', 'numero', pct),
        campo(semTexto, 'traco.tipoLinha', 'Tipo de linha', 'linha', { opcoes: TIPOS_LINHA.map((t) => ({ id: t, rotulo: ROTULO_LINHA[t] ?? t })) }),
        campo(semTexto, 'traco.escalaTipoLinha', 'Escala da linha', 'numero', { casasDecimais: 2, passo: 0.1, min: 0 }),
        campo(semTexto, 'traco.terminacao', 'Terminação', 'selecao', { opcoes: op([['reta', 'Reta'], ['arredondada', 'Arredondada'], ['quadrada', 'Quadrada']]) }),
        campo(semTexto, 'traco.juncao', 'Junção', 'selecao', { opcoes: op([['angular', 'Angular'], ['arredondada', 'Arredondada'], ['chanfrada', 'Chanfrada']]) }),
        fechados.length === semTexto.length
          ? campo(semTexto, 'traco.alinhamento', 'Alinhamento', 'selecao', { opcoes: op([['centro', 'Centro'], ['dentro', 'Dentro'], ['fora', 'Fora']]) })
          : null,
        fechados.length === 0 ? campo(semTexto, 'traco.pontaInicio', 'Ponta inicial', 'selecao', { opcoes: PONTAS }) : null,
        fechados.length === 0 ? campo(semTexto, 'traco.pontaFim', 'Ponta final', 'selecao', { opcoes: PONTAS }) : null
      ])
    });
  }

  const comArea = [...fechados, ...textos];
  if (comArea.length === sel.length) {
    cats.push({
      id: 'preenchimento', titulo: 'Preenchimento', aberto: true,
      propriedades: so([
        campo(sel, 'preenchimento.ativo', 'Com preenchimento', 'booleano'),
        campo(sel, 'preenchimento.cor', 'Cor', 'cor'),
        campo(sel, 'preenchimento.opacidade', 'Opacidade', 'numero', pct),
        textos.length === 0 ? campo(sel, 'preenchimento.regra', 'Regra', 'selecao', { opcoes: op([['nonzero', 'Diferente de zero'], ['evenodd', 'Par-ímpar']]) }) : null
      ])
    });
  }
  if (fechados.length === sel.length) {
    cats.push({
      id: 'hachura', titulo: 'Hachura', aberto: false,
      propriedades: so([
        campo(sel, 'hachura.ativa', 'Com hachura', 'booleano'),
        campo(sel, 'hachura.angulo', 'Ângulo', 'numero', { unidade: '°', casasDecimais: 1, passo: 15 }),
        campo(sel, 'hachura.espacamento', 'Espaçamento', 'numero', { ...mm, min: 0.1 }),
        campo(sel, 'hachura.cor', 'Cor', 'cor'),
        campo(sel, 'hachura.cruzada', 'Cruzada', 'booleano')
      ])
    });
  }

  cats.push({
    id: 'efeitos', titulo: 'Efeitos', aberto: false,
    propriedades: so([
      campo(sel, 'efeitos.opacidade', 'Opacidade', 'numero', pct),
      campo(sel, 'efeitos.mesclagem', 'Mesclagem', 'selecao', { opcoes: MODOS_MESCLAGEM.map((m) => ({ id: m, rotulo: ROTULO_MESCLAGEM[m] })) }),
      campo(sel, 'sombra.ativa', 'Sombra', 'booleano'),
      campo(sel, 'sombra.dx', 'Sombra X', 'numero', mm),
      campo(sel, 'sombra.dy', 'Sombra Y', 'numero', mm),
      campo(sel, 'sombra.desfoque', 'Desfoque', 'numero', { ...mm, min: 0 }),
      campo(sel, 'sombra.cor', 'Cor da sombra', 'cor'),
      campo(sel, 'sombra.opacidade', 'Opacidade da sombra', 'numero', pct)
    ])
  });
  return cats.filter((c) => c.propriedades.length > 0);
}
