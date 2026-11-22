/** Contratos públicos do `<ui-calendario>`. */

/** Evento exibido num dia do calendário. */
export interface EventoCalendario {
  /** Data no formato `AAAA-MM-DD` (aceita também ISO completo; só a parte da data conta). */
  data: string;
  /** Texto do evento (renderizado sempre como texto, nunca como HTML). */
  titulo: string;
  /** Identificador livre devolvido nos eventos `ui-evento-click`. */
  id?: string | number;
  /** Categoria livre; vira o atributo `data-tipo` do marcador para estilização externa. */
  tipo?: string;
  /** Cor CSS do marcador (ex.: `#d95b43`, `var(--minha-cor)`). Padrão: cor primária. */
  cor?: string;
}

/** Dia do mês (1–31), mês (1–12) e ano, sem fuso horário. */
export interface DataSimples {
  ano: number;
  mes: number;
  dia: number;
}

/** Célula da grade mensal. */
export interface DiaGrade extends DataSimples {
  /** `AAAA-MM-DD`. */
  iso: string;
  /** `true` se o dia pertence ao mês exibido. */
  doMes: boolean;
  /** 0 = domingo … 6 = sábado. */
  diaSemana: number;
}

export type ModoSelecaoCalendario = 'unico' | 'nenhum';
export type ExibicaoCalendario = 'completo' | 'compacto';

export interface DetalheDiaCalendario {
  data: string;
  eventos: EventoCalendario[];
}

export interface DetalheMesCalendario {
  /** `AAAA-MM`. */
  mes: string;
}

export interface DetalheEventoCalendario {
  evento: EventoCalendario;
  data: string;
}
