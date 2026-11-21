import type { GeometriaFeicao, Par } from '../feature_types';
import type { JuncaoTraco, TerminacaoTraco, TipoLinha } from '../motor/tipos-linha';
import type { Matriz2D } from '../espaco/espaco_matriz';

/*
 * Modelo do elemento gráfico da prancha (L2, puro). Coordenadas em mm no espaço plano (`ESPACO_PLANO`: x para a direita,
 * y para baixo, origem no canto superior esquerdo da folha).
 *
 * Um elemento tem uma geometria LOCAL e uma `transformacao` (matriz afim local → folha). As formas paramétricas
 * (retângulo, elipse, polígono regular, estrela) são centradas na origem local, então a translação da matriz é o centro
 * delas na folha e rotação/escala acontecem em torno do centro por padrão. O caminho (polígono, polilinha, Bézier) reusa
 * `GeometriaFeicao` (`LineString`/`Polygon` com `curva`) nas coordenadas locais.
 */

/** Raios dos cantos do retângulo em mm: [superior esquerdo, superior direito, inferior direito, inferior esquerdo]. */
export type RaiosCantos = [number, number, number, number];

/** Como um arco de elipse fecha: só o arco, arco + corda, ou fatia (arco + dois raios até o centro). */
export type FechamentoArco = 'aberto' | 'corda' | 'fatia';

export interface ArcoElipse {
  /** Radianos, de +x para +y (horário na tela). */
  inicio: number;
  /** Radianos; o arco vai de `inicio` até `fim` no sentido crescente. */
  fim: number;
  fechamento?: FechamentoArco;
}

export type GeometriaElemento =
  /** Retângulo `largura × altura` centrado na origem, com cantos arredondados independentes ("ao vivo"). */
  | { tipo: 'retangulo'; largura: number; altura: number; raios?: RaiosCantos }
  /** Elipse de semieixos `rx`, `ry` centrada na origem; com `arco`, só um trecho dela. */
  | { tipo: 'elipse'; rx: number; ry: number; arco?: ArcoElipse }
  /** Polígono regular de `lados` lados inscrito no círculo de raio `raio`, com um vértice para cima (−y). */
  | { tipo: 'poligono-regular'; raio: number; lados: number }
  /** Estrela de `pontas` pontas, com uma ponta para cima. */
  | { tipo: 'estrela'; raioExterno: number; raioInterno: number; pontas: number }
  /** Linha reta de `de` até `ate` (coordenadas locais); com pontas de seta no traço, vira seta. */
  | { tipo: 'linha'; de: Par; ate: Par }
  /** Polígono, polilinha ou caminho Bézier (`curva`) em coordenadas locais. */
  | { tipo: 'caminho'; geometria: Extract<GeometriaFeicao, { tipo: 'LineString' | 'Polygon' }> }
  /**
   * Texto com a linha de base da primeira linha em y = 0 e o início em x = 0 (alinhamento à esquerda). `tamanho` é a
   * altura do corpo em mm; `largura` (mm), se houver, é a caixa de quebra e a caixa de seleção.
   */
  | { tipo: 'texto'; texto: string; tamanho: number; fonte?: string; largura?: number; alinhamento?: 'esquerda' | 'centro' | 'direita' };

export type TipoGeometriaElemento = GeometriaElemento['tipo'];

/** Estilo das pontas de seta (Fase 2 pinta; aqui só o modelo). */
export type EstiloPontaSeta = 'triangulo' | 'triangulo-aberto' | 'aberta' | 'circulo' | 'quadrado' | 'losango' | 'barra';

export interface PontaSeta {
  estilo: EstiloPontaSeta;
  /** Multiplica o tamanho padrão da ponta (proporcional à espessura do traço). Padrão 1. */
  escala?: number;
}

export interface TracoElemento {
  /** Cor CSS (hex, rgb/hsl ou nome). Ausente = preto. */
  cor?: string;
  /** Espessura em mm. Padrão 0,25 mm. */
  espessura?: number;
  /** 0 a 1 (padrão 1). */
  opacidade?: number;
  /** Tipo de linha CAD (`motor/tipos-linha.ts`); padrão contínua. */
  tipoLinha?: TipoLinha;
  /** Escala do tipo de linha (LTSCALE); padrão 1. */
  escalaTipoLinha?: number;
  terminacao?: TerminacaoTraco;
  juncao?: JuncaoTraco;
  /** Limite da junção angular (miter limit), como no Canvas 2D. Padrão 4. */
  limitePonta?: number;
  /** Onde o traço fica em relação ao contorno (fechado). Padrão `'centro'`. */
  alinhamento?: 'centro' | 'dentro' | 'fora';
  pontaInicio?: PontaSeta;
  pontaFim?: PontaSeta;
}

/** Parada de cor de um gradiente; `posicao` de 0 a 1. */
export interface ParadaGradiente {
  posicao: number;
  cor: string;
  /** 0 a 1 (padrão 1). */
  opacidade?: number;
}

/**
 * Gradiente com coordenadas RELATIVAS à caixa local do elemento (como o `objectBoundingBox` do SVG): [0, 0] é o canto
 * superior esquerdo e [1, 1] o inferior direito; acompanha rotação, escala e espelho do elemento. Num contexto sem gradiente
 * (o PDF vetorial do app), vira a cor sólida `corDegradacao` (ver `resolverAparencia`).
 */
export type GradienteElemento =
  | { tipo: 'linear'; de: Par; ate: Par; paradas: ParadaGradiente[] }
  /** `raio` relativo à caixa (0,5 = encosta nas bordas); `foco` opcional, relativo também. */
  | { tipo: 'radial'; centro: Par; raio: number; foco?: Par; paradas: ParadaGradiente[] };

export interface PreenchimentoElemento {
  cor?: string;
  /** 0 a 1 (padrão 1). */
  opacidade?: number;
  /** Regra de preenchimento. Padrão `'nonzero'` (com mais de um anel, `'evenodd'`, para os furos aparecerem). */
  regra?: 'nonzero' | 'evenodd';
  /** Gradiente no lugar da cor sólida (a `cor`, se houver, é a degradação em contextos sem gradiente). */
  gradiente?: GradienteElemento;
}

/**
 * Hachura vetorial: linhas paralelas recortadas pela forma, em mm DA FOLHA (o espaçamento não muda com a escala do
 * elemento; o ângulo gira junto com ele). Desenhada com `moveTo`/`lineTo`/`stroke` e `clip`, funciona em qualquer contexto,
 * inclusive no PDF vetorial.
 */
export interface HachuraElemento {
  /** Graus, de +x para +y (horário na tela), somados à rotação do elemento. Padrão 45. */
  angulo?: number;
  /** Distância entre linhas em mm (padrão 2; mínimo 0,1). */
  espacamento?: number;
  /** Padrão: a cor do traço, senão preto. */
  cor?: string;
  /** Espessura das linhas em mm (padrão 0,18). */
  espessura?: number;
  /** 0 a 1 (padrão 1). */
  opacidade?: number;
  /** Também as linhas perpendiculares (xadrez). */
  cruzada?: boolean;
}

/**
 * Modo de mesclagem do elemento com o que está por baixo (os do Illustrator/Photoshop). Capacidade OPCIONAL: no Canvas
 * vira `globalCompositeOperation`, no SVG `mix-blend-mode`; num contexto sem ela (o PDF vetorial do app) fica `normal`.
 */
export type ModoMesclagem =
  | 'normal' | 'multiplicar' | 'tela' | 'sobrepor' | 'escurecer' | 'clarear' | 'subexposicao-cor' | 'superexposicao-cor'
  | 'luz-dura' | 'luz-suave' | 'diferenca' | 'exclusao' | 'matiz' | 'saturacao' | 'cor' | 'luminosidade';

/**
 * Sombra projetada: a silhueta do elemento, deslocada na FOLHA (não gira com o elemento) e desfocada. É vetorial (pintada
 * com o mesmo contrato mínimo), então aparece também no PDF; o desfoque é capacidade OPCIONAL (`filter` do Canvas,
 * `feGaussianBlur` no SVG): sem ela, a sombra sai nítida.
 */
export interface SombraElemento {
  /** mm na folha, [x, y] (padrão [1,5, 1,5]: para a direita e para baixo). */
  deslocamento?: Par;
  /** Desvio-padrão do desfoque em mm (padrão 1; 0 = nítida). */
  desfoque?: number;
  /** Padrão preto. */
  cor?: string;
  /** 0 a 1 (padrão 0,5). */
  opacidade?: number;
}

/** Aparência do elemento. `null` em `traco`/`preenchimento` = sem traço/sem preenchimento. */
export interface AparenciaElemento {
  traco?: TracoElemento | null;
  preenchimento?: PreenchimentoElemento | null;
  /** Hachura por cima do preenchimento (e por baixo do traço); só em formas fechadas. */
  hachura?: HachuraElemento | null;
  /** Opacidade do elemento inteiro, 0 a 1 (padrão 1). */
  opacidade?: number;
  /** Fase 5: modo de mesclagem (padrão `normal`). */
  mesclagem?: ModoMesclagem;
  /** Fase 5: sombra projetada; `null` ou ausente = sem sombra. */
  sombra?: SombraElemento | null;
}

export interface ElementoGrafico {
  /** Identidade estável, decidida pelo app. */
  id: string;
  nome?: string;
  geometria: GeometriaElemento;
  /** Local → folha. Ausente = identidade. */
  transformacao?: Matriz2D;
  /** Pivô de rotação/escala em coordenadas LOCAIS. Ausente = centro da caixa local. */
  pivo?: Par;
  aparencia?: AparenciaElemento;
  /** Não pode ser selecionado nem editado (continua visível). */
  bloqueado?: boolean;
  /** Não é desenhado nem selecionado; segue nos dados. */
  oculto?: boolean;
  camadaId?: string;
  grupoId?: string;
  /** Ordem de empilhamento dentro da camada (maior = mais à frente). Ausente = posição na lista. */
  ordem?: number;
  /** É a forma de uma máscara de recorte: não é pintada; recorta os elementos que a apontam em `recorteId`. */
  mascara?: boolean;
  /** Id do elemento-máscara que recorta este elemento (máscara de recorte, Ctrl+7). */
  recorteId?: string;
  /** Dados livres do app (nunca interpretados pelo kit). */
  propriedades?: Record<string, unknown>;
}

/** Caixa alinhada aos eixos em mm. */
export interface CaixaMm {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/**
 * Camada da prancha. A ordem da lista é a ordem de empilhamento (a primeira fica atrás). Elementos sem camada ou com uma
 * camada que não está na lista ficam por cima de todas.
 */
export interface CamadaPrancha {
  id: string;
  nome?: string;
  /** Padrão: visível. Camada oculta: seus elementos não são pintados, exportados nem selecionados. */
  visivel?: boolean;
  /** Camada bloqueada: seus elementos aparecem mas não são selecionados nem editados. */
  bloqueada?: boolean;
  /** 0 a 1 (padrão 1): multiplica a opacidade dos elementos da camada. */
  opacidade?: number;
}
