/**
 * Avaliador de expressões matemáticas para campos numéricos técnicos (AutoCAD / Revit / Blender).
 * Parser seguro de descida recursiva sem eval(), com suporte a =, +, -, *, /, ^, parênteses,
 * porcentagens, notação científica, constantes (pi, e) e funções matemáticas (sqrt, abs, round,
 * floor, ceil, trunc, sign, sin, cos, tan, asin, acos, atan, atan2, min, max, pow, hypot, mod,
 * log, ln, deg, rad).
 * Trigonometria em GRAUS, como nas calculadoras de CAD: sin(30) = 0.5, atan(1) = 45.
 * Função desconhecida, parêntese sem fechamento ou recursão excessiva invalidam a expressão (retorno null).
 */
const RAD = Math.PI / 180;
const MAX_PROFUNDIDADE = 64;

/** Remove o ruído de ponto flutuante da trigonometria (ex.: cos(90) = 6e-17 → 0). */
function arredondarTrig(v: number): number {
  return Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(15));
}

const FUNCOES_UNARIAS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  trunc: Math.trunc,
  sign: Math.sign,
  log: Math.log10,
  ln: Math.log,
  deg: (x) => arredondarTrig(x / RAD),
  rad: (x) => arredondarTrig(x * RAD),
  sin: (x) => arredondarTrig(Math.sin(x * RAD)),
  cos: (x) => arredondarTrig(Math.cos(x * RAD)),
  tan: (x) => arredondarTrig(Math.tan(x * RAD)),
  asin: (x) => arredondarTrig(Math.asin(x) / RAD),
  acos: (x) => arredondarTrig(Math.acos(x) / RAD),
  atan: (x) => arredondarTrig(Math.atan(x) / RAD)
};

const FUNCOES_VARIADICAS: Record<string, (args: number[]) => number> = {
  min: (args) => (args.length > 0 ? Math.min(...args) : NaN),
  max: (args) => (args.length > 0 ? Math.max(...args) : NaN),
  pow: (args) => (args.length === 2 ? Math.pow(args[0], args[1]) : NaN),
  hypot: (args) => (args.length >= 2 ? Math.hypot(...args) : NaN),
  atan2: (args) => (args.length === 2 ? arredondarTrig(Math.atan2(args[0], args[1]) / RAD) : NaN),
  mod: (args) => (args.length === 2 && args[1] !== 0 ? args[0] % args[1] : NaN)
};

export function avaliarExpressaoMatematica(expr: string): number | null {
  if (!expr || typeof expr !== 'string') return null;

  let s = expr.trim();
  if (s.startsWith('=')) {
    s = s.slice(1).trim();
  }
  if (!s) return null;

  // Substitui vírgulas decimais entre números por ponto (ex: "10,5 + 2,5" -> "10.5 + 2.5")
  s = s.replace(/(\d),(\d)/g, '$1.$2');

  let pos = 0;
  let profundidade = 0;
  let ultimoTermoPercentualDireto = false;

  function peek(): string {
    return s[pos] || '';
  }

  function get(): string {
    return s[pos++] || '';
  }

  function eatSpaces() {
    while (pos < s.length && /\s/.test(s[pos])) {
      pos++;
    }
  }

  function parseExpression(): number {
    if (++profundidade > MAX_PROFUNDIDADE) {
      throw new Error('Profundidade máxima excedida');
    }
    try {
      eatSpaces();
      let val = parseTerm();
      eatSpaces();

      while (pos < s.length) {
        const op = peek();
        if (op === '+' || op === '-') {
          get();
          eatSpaces();
          const right = parseTerm();
          const eraPercentualDireto = ultimoTermoPercentualDireto;
          eatSpaces();
          // Trata porcentagem contextual em adição/subtração (ex: 100 + 10% -> 110)
          if (eraPercentualDireto) {
            val = op === '+' ? val + (val * right) : val - (val * right);
          } else {
            val = op === '+' ? val + right : val - right;
          }
          ultimoTermoPercentualDireto = false;
        } else {
          break;
        }
      }
      return val;
    } finally {
      profundidade--;
    }
  }

  function parseTerm(): number {
    eatSpaces();
    let val = parseFactor();
    let percentualPuro = ultimoTermoPercentualDireto;
    eatSpaces();

    while (pos < s.length) {
      const op = peek();
      if (op === '*' || op === '/' || op === 'x' || op === 'X') {
        // 'x' só é multiplicação se não fizer parte de identificador
        get();
        eatSpaces();
        const right = parseFactor();
        percentualPuro = false;
        if (op === '/' && right === 0) {
          throw new Error('Divisão por zero');
        }
        val = op === '/' ? val / right : val * right;
        eatSpaces();
      } else {
        break;
      }
    }
    ultimoTermoPercentualDireto = percentualPuro;
    return val;
  }

  function parseFactor(): number {
    if (++profundidade > MAX_PROFUNDIDADE) {
      throw new Error('Profundidade máxima excedida');
    }
    try {
      eatSpaces();
      // O sinal unário pesa menos que a potência: -2^2 = -(2^2) = -4, como em calculadoras e CAD
      const sinal = peek();
      if (sinal === '+' || sinal === '-') {
        get();
        const v = parseFactor();
        return sinal === '-' ? -v : v;
      }
      let val = parsePrimary();
      const percentualPrimario = ultimoTermoPercentualDireto;
      eatSpaces();

      // Potência com ^ ou **
      if (peek() === '^') {
        get();
        const exp = parseFactor();
        val = Math.pow(val, exp);
        ultimoTermoPercentualDireto = false;
      } else if (s.slice(pos, pos + 2) === '**') {
        pos += 2;
        const exp = parseFactor();
        val = Math.pow(val, exp);
        ultimoTermoPercentualDireto = false;
      } else {
        ultimoTermoPercentualDireto = percentualPrimario;
      }
      return val;
    } finally {
      profundidade--;
    }
  }

  function parsePrimary(): number {
    eatSpaces();
    ultimoTermoPercentualDireto = false;
    const ch = peek();

    // Sinais unários (+ ou -)
    if (ch === '+' || ch === '-') {
      get();
      const val = parsePrimary();
      return ch === '-' ? -val : val;
    }

    // Parênteses
    if (ch === '(') {
      get();
      const val = parseExpression();
      eatSpaces();
      if (get() !== ')') throw new Error('Parêntese sem fechamento');
      eatSpaces();
      if (peek() === '%') {
        get();
        ultimoTermoPercentualDireto = true;
        return val / 100;
      }
      ultimoTermoPercentualDireto = false;
      return val;
    }

    // Funções matemáticas
    const funcMatch = s.slice(pos).match(/^([a-zA-Z_]\w*)\s*\(/);
    if (funcMatch) {
      const nomeFn = funcMatch[1].toLowerCase();
      const fnUnaria = FUNCOES_UNARIAS[nomeFn];
      const fnVariadica = FUNCOES_VARIADICAS[nomeFn];
      if (!fnUnaria && !fnVariadica) {
        throw new Error('Função desconhecida: ' + funcMatch[1]);
      }
      pos += funcMatch[0].length;
      const args: number[] = [parseExpression()];
      eatSpaces();
      while (peek() === ';' || peek() === ',') {
        get();
        eatSpaces();
        args.push(parseExpression());
        eatSpaces();
      }
      if (get() !== ')') throw new Error('Parêntese sem fechamento');
      const res = fnVariadica
        ? fnVariadica(args)
        : (args.length === 1 && fnUnaria ? fnUnaria(args[0]) : NaN);
      if (isNaN(res)) throw new Error('Resultado inválido de função');
      eatSpaces();
      if (peek() === '%') {
        get();
        ultimoTermoPercentualDireto = true;
        return res / 100;
      }
      ultimoTermoPercentualDireto = false;
      return res;
    }

    // Constantes conhecidas (pi, π, e)
    const constMatch = s.slice(pos).match(/^(pi|π|e)\b/i);
    if (constMatch) {
      pos += constMatch[0].length;
      const token = constMatch[1].toLowerCase();
      let val = token === 'e' ? Math.E : Math.PI;
      eatSpaces();
      if (peek() === '%') {
        get();
        ultimoTermoPercentualDireto = true;
        val = val / 100;
      }
      return val;
    }

    // Número literal (incluindo notação científica como 1e-5, 2.5e3, ou vírgula inicial ,5)
    const numMatch = s.slice(pos).match(/^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+|,[0-9]+)(?:[eE][+-]?[0-9]+)?/);
    if (numMatch) {
      pos += numMatch[0].length;
      let num = parseFloat(numMatch[0].replace(',', '.'));
      eatSpaces();
      if (peek() === '%') {
        get();
        ultimoTermoPercentualDireto = true;
        num = num / 100;
      }
      return num;
    }

    throw new Error('Caractere inválido: ' + ch);
  }

  try {
    const result = parseExpression();
    eatSpaces();
    if (pos < s.length) {
      return null;
    }
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch (_e) {
    return null;
  }
}
