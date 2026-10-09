/**
 * Avaliador de expressões matemáticas para campos numéricos técnicos (AutoCAD / Revit / Blender).
 * Parser seguro de descida recursiva sem eval(), com suporte a +, -, *, /, ^, parênteses,
 * porcentagens, constantes (pi, e) e funções matemáticas (sqrt, abs, round, floor, ceil, sin, cos, tan,
 * asin, acos, atan). Trigonometria em GRAUS, como nas calculadoras de CAD: sin(30) = 0.5, atan(1) = 45.
 * Função desconhecida ou parêntese sem fechamento invalidam a expressão (retorno null).
 */
const RAD = Math.PI / 180;

/** Remove o ruído de ponto flutuante da trigonometria (ex.: cos(90) = 6e-17 → 0). */
function arredondarTrig(v: number): number {
  return Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(15));
}

const FUNCOES: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sin: (x) => arredondarTrig(Math.sin(x * RAD)),
  cos: (x) => arredondarTrig(Math.cos(x * RAD)),
  tan: (x) => arredondarTrig(Math.tan(x * RAD)),
  asin: (x) => arredondarTrig(Math.asin(x) / RAD),
  acos: (x) => arredondarTrig(Math.acos(x) / RAD),
  atan: (x) => arredondarTrig(Math.atan(x) / RAD)
};
export function avaliarExpressaoMatematica(expr: string): number | null {
  if (!expr || typeof expr !== 'string') return null;

  let s = expr.trim();
  if (!s) return null;

  // Substitui vírgulas decimais entre números por ponto (ex: "10,5 + 2,5" -> "10.5 + 2.5")
  s = s.replace(/(\d),(\d)/g, '$1.$2').replace(/,/g, '.');

  // Substitui constantes conhecidas
  s = s.replace(/\bpi\b/gi, String(Math.PI));
  s = s.replace(/\be\b/gi, String(Math.E));

  let pos = 0;

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
    eatSpaces();
    let val = parseTerm();
    eatSpaces();

    while (pos < s.length) {
      const op = peek();
      if (op === '+' || op === '-') {
        get();
        eatSpaces();
        const startSub = pos;
        const right = parseTerm();
        eatSpaces();
        // Trata porcentagem contextual em adição/subtração (ex: 100 + 10% -> 110)
        const subStr = s.slice(startSub, pos);
        if (subStr.includes('%')) {
          val = op === '+' ? val + (val * right) : val - (val * right);
        } else {
          val = op === '+' ? val + right : val - right;
        }
      } else {
        break;
      }
    }
    return val;
  }

  function parseTerm(): number {
    eatSpaces();
    let val = parseFactor();
    eatSpaces();

    while (pos < s.length) {
      const op = peek();
      if (op === '*' || op === '/' || op === 'x' || op === 'X') {
        get();
        eatSpaces();
        const right = parseFactor();
        if (op === '/' && right === 0) {
          throw new Error('Divisão por zero');
        }
        val = op === '/' ? val / right : val * right;
        eatSpaces();
      } else {
        break;
      }
    }
    return val;
  }

  function parseFactor(): number {
    eatSpaces();
    let val = parsePrimary();
    eatSpaces();

    // Potência com ^ ou **
    if (peek() === '^') {
      get();
      const exp = parseFactor();
      val = Math.pow(val, exp);
    } else if (s.slice(pos, pos + 2) === '**') {
      pos += 2;
      const exp = parseFactor();
      val = Math.pow(val, exp);
    }
    return val;
  }

  function parsePrimary(): number {
    eatSpaces();
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
        return val / 100;
      }
      return val;
    }

    // Funções matemáticas (ver FUNCOES)
    const funcMatch = s.slice(pos).match(/^([a-zA-Z_]\w*)\s*\(/);
    if (funcMatch) {
      const fn = FUNCOES[funcMatch[1].toLowerCase()];
      if (!fn) throw new Error('Função desconhecida: ' + funcMatch[1]);
      pos += funcMatch[0].length;
      const arg = parseExpression();
      eatSpaces();
      if (get() !== ')') throw new Error('Parêntese sem fechamento');
      const res = fn(arg);
      eatSpaces();
      if (peek() === '%') {
        get();
        return res / 100;
      }
      return res;
    }

    // Número literal
    const numMatch = s.slice(pos).match(/^([0-9]+(?:\.[0-9]+)?|\.[0-9]+)/);
    if (numMatch) {
      pos += numMatch[0].length;
      let num = parseFloat(numMatch[0]);
      eatSpaces();
      if (peek() === '%') {
        get();
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
    return isFinite(result) ? result : null;
  } catch (_e) {
    return null;
  }
}
