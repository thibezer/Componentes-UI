/**
 * Catálogo das funções e constantes aceitas por `avaliarExpressaoMatematica` e a lógica pura
 * (sem DOM) do guia de autocompletar: dado o texto e a posição do cursor, quais entradas sugerir.
 */

export interface EntradaCatalogo {
  nome: string;
  tipo: 'funcao' | 'constante';
  /** Forma de uso exibida ao lado do nome, ex.: "(a; b; …)". Vazia nas constantes. */
  assinatura: string;
  /** Explicação curta, com exemplo. */
  descricao: string;
}

export const CATALOGO_EXPRESSAO: readonly EntradaCatalogo[] = Object.freeze([
  { nome: 'abs', tipo: 'funcao', assinatura: '(x)', descricao: 'Valor absoluto (sem sinal). Ex.: abs(-5) = 5' },
  { nome: 'acos', tipo: 'funcao', assinatura: '(x)', descricao: 'Arco-cosseno; o resultado é em graus. Ex.: acos(0.5) = 60' },
  { nome: 'asin', tipo: 'funcao', assinatura: '(x)', descricao: 'Arco-seno; o resultado é em graus. Ex.: asin(0.5) = 30' },
  { nome: 'atan', tipo: 'funcao', assinatura: '(x)', descricao: 'Arco-tangente; o resultado é em graus. Ex.: atan(1) = 45' },
  { nome: 'atan2', tipo: 'funcao', assinatura: '(y; x)', descricao: 'Ângulo em graus do ponto (x, y). Ex.: atan2(1; 1) = 45' },
  { nome: 'ceil', tipo: 'funcao', assinatura: '(x)', descricao: 'Arredonda para cima. Ex.: ceil(2.1) = 3' },
  { nome: 'cos', tipo: 'funcao', assinatura: '(x)', descricao: 'Cosseno, com x em graus. Ex.: cos(60) = 0.5' },
  { nome: 'deg', tipo: 'funcao', assinatura: '(x)', descricao: 'Converte radianos em graus. Ex.: deg(pi) = 180' },
  { nome: 'e', tipo: 'constante', assinatura: '', descricao: 'Número de Euler, 2,71828…' },
  { nome: 'floor', tipo: 'funcao', assinatura: '(x)', descricao: 'Arredonda para baixo. Ex.: floor(2.9) = 2' },
  { nome: 'hypot', tipo: 'funcao', assinatura: '(a; b; …)', descricao: 'Hipotenusa: raiz da soma dos quadrados. Ex.: hypot(3; 4) = 5' },
  { nome: 'ln', tipo: 'funcao', assinatura: '(x)', descricao: 'Logaritmo natural (base e). Ex.: ln(e) = 1' },
  { nome: 'log', tipo: 'funcao', assinatura: '(x)', descricao: 'Logaritmo na base 10. Ex.: log(100) = 2' },
  { nome: 'max', tipo: 'funcao', assinatura: '(a; b; …)', descricao: 'Maior dos valores. Ex.: max(3; 1; 2) = 3' },
  { nome: 'min', tipo: 'funcao', assinatura: '(a; b; …)', descricao: 'Menor dos valores. Ex.: min(3; 1; 2) = 1' },
  { nome: 'mod', tipo: 'funcao', assinatura: '(a; b)', descricao: 'Resto da divisão de a por b. Ex.: mod(10; 3) = 1' },
  { nome: 'pi', tipo: 'constante', assinatura: '', descricao: 'Constante π = 3,14159…' },
  { nome: 'pow', tipo: 'funcao', assinatura: '(base; expoente)', descricao: 'Potência. Ex.: pow(2; 3) = 8 (o mesmo que 2^3)' },
  { nome: 'rad', tipo: 'funcao', assinatura: '(x)', descricao: 'Converte graus em radianos. Ex.: rad(180) = 3.14159…' },
  { nome: 'round', tipo: 'funcao', assinatura: '(x)', descricao: 'Arredonda para o inteiro mais próximo. Ex.: round(2.5) = 3' },
  { nome: 'sign', tipo: 'funcao', assinatura: '(x)', descricao: 'Sinal do número: -1, 0 ou 1. Ex.: sign(-7) = -1' },
  { nome: 'sin', tipo: 'funcao', assinatura: '(x)', descricao: 'Seno, com x em graus. Ex.: sin(30) = 0.5' },
  { nome: 'sqrt', tipo: 'funcao', assinatura: '(x)', descricao: 'Raiz quadrada. Ex.: sqrt(16) = 4' },
  { nome: 'tan', tipo: 'funcao', assinatura: '(x)', descricao: 'Tangente, com x em graus. Ex.: tan(45) = 1' },
  { nome: 'trunc', tipo: 'funcao', assinatura: '(x)', descricao: 'Remove a parte decimal. Ex.: trunc(-2.9) = -2' }
] as EntradaCatalogo[]);

export interface SugestaoExpressao {
  entradas: EntradaCatalogo[];
  /** Posição onde começa a palavra digitada (substituída ao aceitar). */
  inicio: number;
  /** Posição do cursor (fim da palavra digitada). */
  fim: number;
}

/**
 * Sugestões para a palavra que termina no cursor. Devolve `null` quando não há o que sugerir:
 * sem letras antes do cursor, palavra colada a um número ("2e", "2x"), cursor no meio de uma
 * palavra, função já seguida de "(", constante já digitada por completo ou nenhuma correspondência.
 */
export function sugerirEntradas(texto: string, cursor: number): SugestaoExpressao | null {
  if (typeof texto !== 'string' || !Number.isFinite(cursor)) return null;
  const fim = Math.max(0, Math.min(texto.length, Math.floor(cursor)));
  const antes = texto.slice(0, fim);
  const m = /[a-zA-Z_]+$/.exec(antes);
  if (!m) return null;

  const inicio = fim - m[0].length;
  if (inicio > 0 && /[0-9.,]/.test(texto[inicio - 1])) return null;
  const depois = texto.slice(fim);
  if (/^[a-zA-Z0-9_]/.test(depois)) return null;

  const prefixo = m[0].toLowerCase();
  const entradas = CATALOGO_EXPRESSAO.filter(e => {
    if (!e.nome.startsWith(prefixo)) return false;
    if (e.nome === prefixo && (e.tipo === 'constante' || depois.startsWith('('))) return false;
    return true;
  });
  return entradas.length > 0 ? { entradas, inicio, fim } : null;
}

/** Texto e posição do cursor depois de aceitar uma entrada (funções ganham "(" para abrir os argumentos). */
export function aplicarEntrada(
  texto: string,
  sugestao: Pick<SugestaoExpressao, 'inicio' | 'fim'>,
  entrada: EntradaCatalogo
): { texto: string; cursor: number } {
  const insercao = entrada.nome + (entrada.tipo === 'funcao' ? '(' : '');
  return {
    texto: texto.slice(0, sugestao.inicio) + insercao + texto.slice(sugestao.fim),
    cursor: sugestao.inicio + insercao.length
  };
}
