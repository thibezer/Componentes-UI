import type { DataSimples, DiaGrade, EventoCalendario } from './tipos';

/**
 * Funções puras de data do `<ui-calendario>` (sem DOM, sem fuso horário).
 * Entradas hostis (texto vazio, mês 13, 31/02) devolvem `null` em vez de estourar.
 */

const REGEX_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/;
const REGEX_MES = /^(\d{4})-(\d{2})$/;

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function dataValida(ano: number, mes: number, dia: number): boolean {
  return ano >= 1 && ano <= 9999 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(ano, mes);
}

function dois(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatarIso({ ano, mes, dia }: DataSimples): string {
  return `${String(ano).padStart(4, '0')}-${dois(mes)}-${dois(dia)}`;
}

export function formatarMes(ano: number, mes: number): string {
  return `${String(ano).padStart(4, '0')}-${dois(mes)}`;
}

/** Lê `AAAA-MM-DD` (ou ISO completo). `null` se inválido. */
export function lerIso(texto: unknown): DataSimples | null {
  if (typeof texto !== 'string') return null;
  const m = REGEX_ISO.exec(texto.trim());
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  return dataValida(ano, mes, dia) ? { ano, mes, dia } : null;
}

/** Lê `AAAA-MM` (ou uma data completa, aproveitando ano e mês). `null` se inválido. */
export function lerMes(texto: unknown): { ano: number; mes: number } | null {
  if (typeof texto !== 'string') return null;
  const t = texto.trim();
  const m = REGEX_MES.exec(t);
  if (m) {
    const ano = Number(m[1]);
    const mes = Number(m[2]);
    return ano >= 1 && ano <= 9999 && mes >= 1 && mes <= 12 ? { ano, mes } : null;
  }
  const d = lerIso(t);
  return d ? { ano: d.ano, mes: d.mes } : null;
}

export function hojeLocal(agora: Date = new Date()): DataSimples {
  return { ano: agora.getFullYear(), mes: agora.getMonth() + 1, dia: agora.getDate() };
}

/** Soma dias (positivos ou negativos) usando UTC para evitar saltos de horário de verão. */
export function somarDias(data: DataSimples, dias: number): DataSimples {
  const d = new Date(Date.UTC(data.ano, data.mes - 1, data.dia + dias));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

/** Soma meses mantendo o dia, limitado ao último dia do mês de destino (31/01 + 1 → 28/02). */
export function somarMeses(data: DataSimples, meses: number): DataSimples {
  const total = data.ano * 12 + (data.mes - 1) + meses;
  const ano = Math.floor(total / 12);
  const mes = (total % 12 + 12) % 12 + 1;
  if (ano < 1 || ano > 9999) return data;
  return { ano, mes, dia: Math.min(data.dia, diasNoMes(ano, mes)) };
}

export function diaDaSemana(data: DataSimples): number {
  return new Date(Date.UTC(data.ano, data.mes - 1, data.dia)).getUTCDay();
}

/**
 * Monta a grade do mês: sempre `semanas` linhas (padrão 6) de 7 dias, começando em `inicioSemana`
 * (0 = domingo, 1 = segunda). Seis linhas mantêm a altura estável ao trocar de mês.
 */
export function montarGradeMes(ano: number, mes: number, inicioSemana = 1, semanas = 6): DiaGrade[] {
  const inicio = inicioSemana >= 0 && inicioSemana <= 6 ? Math.trunc(inicioSemana) : 1;
  const primeiro: DataSimples = { ano, mes, dia: 1 };
  const deslocamento = (diaDaSemana(primeiro) - inicio + 7) % 7;
  const dias: DiaGrade[] = [];
  for (let i = 0; i < semanas * 7; i++) {
    const d = somarDias(primeiro, i - deslocamento);
    dias.push({ ...d, iso: formatarIso(d), doMes: d.ano === ano && d.mes === mes, diaSemana: diaDaSemana(d) });
  }
  return dias;
}

/** Agrupa eventos por data (`AAAA-MM-DD`), ignorando itens inválidos. */
export function agruparEventosPorDia(eventos: unknown): Map<string, EventoCalendario[]> {
  const mapa = new Map<string, EventoCalendario[]>();
  if (!Array.isArray(eventos)) return mapa;
  for (const bruto of eventos) {
    if (!bruto || typeof bruto !== 'object') continue;
    const ev = bruto as EventoCalendario;
    const d = lerIso(ev.data);
    if (!d) continue;
    const iso = formatarIso(d);
    const lista = mapa.get(iso);
    if (lista) lista.push(ev);
    else mapa.set(iso, [ev]);
  }
  return mapa;
}

/** Nomes localizados dos meses e dias da semana (curtos), via `Intl`, com fallback em pt-BR. */
export function nomesDeMeses(locale: string): string[] {
  try {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, i) => capitalizar(fmt.format(new Date(Date.UTC(2021, i, 15)))));
  } catch {
    return nomesDeMeses('pt-BR');
  }
}

export function nomesDiasSemana(locale: string, inicioSemana: number, estilo: 'short' | 'narrow' = 'short'): string[] {
  const nomes: string[] = [];
  try {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: estilo, timeZone: 'UTC' });
    // 2021-08-01 foi domingo.
    for (let i = 0; i < 7; i++) {
      const dia = (inicioSemana + i) % 7;
      nomes.push(fmt.format(new Date(Date.UTC(2021, 7, 1 + dia))).replace(/\.$/, ''));
    }
    return nomes;
  } catch {
    return nomesDiasSemana('pt-BR', inicioSemana, estilo);
  }
}

export function capitalizar(texto: string): string {
  return texto ? texto.charAt(0).toLocaleUpperCase() + texto.slice(1) : texto;
}
