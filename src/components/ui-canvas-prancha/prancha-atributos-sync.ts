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
  'rotulo', 'somente-leitura', 'passo-teclado'
] as const;

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
    default:
      break;
  }
  c.agendar();
  return false;
}
