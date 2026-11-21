import { ehUnidadePrancha } from '../../gerencigeo-canvas/espaco/espaco_plano';
import type { ControladorPrancha } from './prancha-controlador';
import { ehFerramentaPrancha } from './tipos';

/*
 * Atributos HTML → estado do controlador (um sentido: o estado vivo é do controlador; propriedades e métodos públicos
 * são a API). Valores inválidos voltam ao padrão sem lançar.
 */

/** Atributos observados (literais, para o manifesto e os tipos React/Vue). */
export const ATRIBUTOS_PRANCHA = [
  'largura', 'altura', 'unidade', 'grade', 'mostrar-grade', 'sem-reguas', 'sem-snap', 'sem-guias-inteligentes', 'ferramenta',
  'rotulo', 'somente-leitura', 'passo-teclado', 'margens', 'teclado', 'ajustar-ao-abrir'
] as const;

/** `margens="e d s i"` (mm): 4 números (esquerda direita superior inferior) ou 1 (as quatro). Inválido = sem margens. */
export function lerMargens(v: string | null): { esquerda: number; direita: number; superior: number; inferior: number } | null {
  if (!v) return null;
  const n = v.trim().split(/[\s,;]+/).map((t) => parseFloat(t.replace(',', '.')));
  if (n.length !== 1 && n.length !== 4) return null;
  if (!n.every((x) => Number.isFinite(x) && x >= 0 && x <= 100000)) return null;
  return n.length === 1 ? { esquerda: n[0], direita: n[0], superior: n[0], inferior: n[0] } : { esquerda: n[0], direita: n[1], superior: n[2], inferior: n[3] };
}

export type ModoAjusteAoAbrir = 'folha' | 'conteudo' | 'nenhum';
export const lerAjusteAoAbrir = (v: string | null): ModoAjusteAoAbrir => (v === 'conteudo' || v === 'nenhum' ? v : 'folha');

const numero = (v: string | null, padrao: number, min: number, max: number): number => {
  const n = v === null ? NaN : parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) && n >= min && n <= max ? n : padrao;
};

/** Aplica o atributo; devolve se a folha mudou de tamanho (o host reenquadra se ainda não houve zoom do usuário). */
export function aplicarAtributoPrancha(c: ControladorPrancha, nome: string, valor: string | null): boolean {
  switch (nome) {
    case 'largura': {
      const l = numero(valor, 210, 1, 100000);
      const mudou = l !== c.folha.largura;
      c.folha = { ...c.folha, largura: l };
      return mudou;
    }
    case 'altura': {
      const a = numero(valor, 297, 1, 100000);
      const mudou = a !== c.folha.altura;
      c.folha = { ...c.folha, altura: a };
      return mudou;
    }
    case 'unidade':
      c.unidade = valor && ehUnidadePrancha(valor) ? valor : 'mm';
      break;
    case 'grade':
      c.grade = numero(valor, 10, 0.1, 10000);
      break;
    case 'mostrar-grade':
      c.mostrarGrade = valor !== null && valor !== 'false';
      break;
    case 'sem-snap':
      c.snapLigado = valor === null || valor === 'false';
      break;
    case 'sem-guias-inteligentes':
      c.guiasInteligentes = valor === null || valor === 'false';
      break;
    case 'ferramenta':
      c.definirFerramenta(valor && ehFerramentaPrancha(valor) ? valor : 'selecao');
      break;
    case 'somente-leitura':
      c.somenteLeitura = valor !== null && valor !== 'false';
      break;
    case 'passo-teclado':
      c.passoTeclado = numero(valor, 1, 0.001, 1000);
      break;
    case 'margens':
      c.margens = lerMargens(valor);
      break;
    default:
      break;
  }
  c.agendar();
  return false;
}
