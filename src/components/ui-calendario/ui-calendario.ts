import estilos from './ui-calendario.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { ListenerBag } from '../../core/listener-bag';
import { escolherInteiro, escolherOpcao } from '../../core/opcoes';
import {
  agruparEventosPorDia,
  capitalizar,
  diasNoMes,
  formatarIso,
  formatarMes,
  hojeLocal,
  lerIso,
  lerMes,
  montarGradeMes,
  nomesDeMeses,
  nomesDiasSemana,
  somarMeses
} from './calendario-datas';
import { proximaDataFoco } from './calendario-teclado';
import { ATRIBUTOS_OBSERVADOS_CALENDARIO, criarCelulaDia, criarTemplateCalendario } from './calendario-template';
import type {
  DataSimples,
  DetalheDiaCalendario,
  DetalheEventoCalendario,
  DetalheMesCalendario,
  EventoCalendario,
  ExibicaoCalendario,
  ModoSelecaoCalendario
} from './tipos';

export type {
  DataSimples,
  DetalheDiaCalendario,
  DetalheEventoCalendario,
  DetalheMesCalendario,
  DiaGrade,
  EventoCalendario,
  ExibicaoCalendario,
  ModoSelecaoCalendario
} from './tipos';

const SELECOES = ['unico', 'nenhum'] as const;
const EXIBICOES = ['completo', 'compacto'] as const;
const VARIANTES = ['moldura', 'simples'] as const;

/**
 * Calendário mensal com todos os dias do mês, eventos por dia e navegação por teclado.
 *
 * Atributos: `mes` (`AAAA-MM`), `valor` (`AAAA-MM-DD` selecionado), `titulo`, `locale` (padrão `pt-BR`),
 * `inicio-semana` (0 = domingo, 1 = segunda), `selecao` (`unico` | `nenhum`), `exibicao` (`completo` | `compacto`),
 * `variante` (`moldura` | `simples`), `max-eventos` (chips por dia, padrão 3), `eventos` (JSON opcional).
 * Propriedade: `eventos: EventoCalendario[]`. Métodos: `mesAnterior()`, `proximoMes()`, `irPara(data)`, `hoje()`.
 *
 * Eventos: `ui-change` ({ data, eventos }), `ui-mes-change` ({ mes }), `ui-evento-click` ({ evento, data }).
 * Cor da moldura: `--ui-calendario-cor`. Cor de cada evento: `EventoCalendario.cor`.
 *
 * @csspart base - Cartão inteiro.
 * @csspart cabecalho - Faixa colorida com título e navegação.
 * @csspart titulo - Texto do título.
 * @csspart nav - Grupo de botões de navegação.
 * @csspart nav-botao - Botões anterior/próximo.
 * @csspart hoje-botao - Botão "Hoje".
 * @csspart corpo - Área clara com seletores e grade.
 * @csspart seletores - Linha com os selects de mês e ano.
 * @csspart select - Selects de mês e ano.
 * @csspart semana - Linha com os nomes dos dias da semana.
 * @csspart grade - Grade de dias.
 * @csspart dia - Cada dia (também `dia-fora`, `dia-hoje`, `dia-selecionado`, `dia-com-eventos`).
 * @csspart numero - Número do dia.
 * @csspart evento - Marcador de evento.
 * @csspart mais - Indicador "+N".
 */
export class UICalendario extends SafeHTMLElement {
  static get observedAttributes() {
    return ATRIBUTOS_OBSERVADOS_CALENDARIO;
  }

  private raiz: HTMLDivElement;
  private tituloEl: HTMLSpanElement;
  private selectMes: HTMLSelectElement;
  private selectAno: HTMLSelectElement;
  private semanaEl: HTMLDivElement;
  private gradeEl: HTMLDivElement;
  private listeners = new ListenerBag();

  private _ano: number;
  private _mes: number;
  private _foco: DataSimples;
  private _eventos: EventoCalendario[] = [];
  private _porDia = new Map<string, EventoCalendario[]>();
  private _eventosAttr = true;
  private _conectado = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${estilos}</style>${criarTemplateCalendario()}`;
    this.raiz = shadow.querySelector('.ui-calendario')!;
    this.tituloEl = shadow.querySelector('.ui-calendario__titulo')!;
    this.selectMes = shadow.querySelector('[data-seletor="mes"]')!;
    this.selectAno = shadow.querySelector('[data-seletor="ano"]')!;
    this.semanaEl = shadow.querySelector('.ui-calendario__semana')!;
    this.gradeEl = shadow.querySelector('.ui-calendario__grade')!;

    const hoje = hojeLocal();
    this._ano = hoje.ano;
    this._mes = hoje.mes;
    this._foco = hoje;
  }

  connectedCallback() {
    this.listeners.cleanup();
    this.listeners.add(this.raiz, 'click', this.aoClicar);
    this.listeners.add(this.gradeEl, 'keydown', this.aoTeclar);
    this.listeners.add(this.selectMes, 'change', this.aoMudarSeletor);
    this.listeners.add(this.selectAno, 'change', this.aoMudarSeletor);
    this._conectado = true;
    this.lerAtributosIniciais();
    this.renderizar();
  }

  disconnectedCallback() {
    this.listeners.cleanup();
    this._conectado = false;
  }

  attributeChangedCallback(nome: string, antigo: string | null, novo: string | null) {
    if (antigo === novo) return;
    if (nome === 'mes') {
      const m = lerMes(novo);
      if (m && (m.ano !== this._ano || m.mes !== this._mes)) {
        this._ano = m.ano;
        this._mes = m.mes;
        this._foco = this.focoDentroDoMes(this._foco);
      }
    } else if (nome === 'valor' || nome === 'value') {
      const d = lerIso(novo);
      if (d) {
        this._foco = d;
        this._ano = d.ano;
        this._mes = d.mes;
      }
    } else if (nome === 'eventos' && this._eventosAttr) {
      this._eventos = this.lerEventosDoAtributo(novo);
      this._porDia = agruparEventosPorDia(this._eventos);
    }
    if (this._conectado) this.renderizar();
  }

  // === API pública ===
  get eventos(): EventoCalendario[] {
    return this._eventos;
  }

  set eventos(lista: EventoCalendario[]) {
    this._eventosAttr = false;
    this._eventos = Array.isArray(lista) ? lista : [];
    this._porDia = agruparEventosPorDia(this._eventos);
    if (this._conectado) this.renderizar();
  }

  get valor(): string {
    return this.getAttribute('valor') || this.getAttribute('value') || '';
  }

  set valor(v: string) {
    if (v) this.setAttribute('valor', v);
    else this.removeAttribute('valor');
  }

  /** Mês exibido (`AAAA-MM`). */
  get mes(): string {
    return formatarMes(this._ano, this._mes);
  }

  set mes(v: string) {
    this.setAttribute('mes', v);
  }

  mesAnterior(): void {
    this.mudarMes(-1);
  }

  proximoMes(): void {
    this.mudarMes(1);
  }

  /** Vai para o mês da data informada (`AAAA-MM-DD` ou `AAAA-MM`) e foca o dia. */
  irPara(data: string): void {
    const d = lerIso(data);
    if (d) {
      this.definirFoco(d, false);
      return;
    }
    const m = lerMes(data);
    if (m) this.definirFoco({ ano: m.ano, mes: m.mes, dia: 1 }, false);
  }

  /** Vai para o mês atual, foca e seleciona o dia de hoje. */
  hoje(): void {
    const h = hojeLocal();
    this.definirFoco(h, false);
    this.selecionar(h);
  }

  // === Estado derivado dos atributos ===
  private get inicioSemana(): number {
    return escolherInteiro(this.getAttribute('inicio-semana'), 0, 6, 0);
  }

  private get locale(): string {
    return this.getAttribute('locale') || 'pt-BR';
  }

  private get selecao(): ModoSelecaoCalendario {
    return escolherOpcao(this.getAttribute('selecao'), SELECOES, 'unico');
  }

  private get exibicao(): ExibicaoCalendario {
    return escolherOpcao(this.getAttribute('exibicao'), EXIBICOES, 'completo');
  }

  private lerAtributosIniciais() {
    const m = lerMes(this.getAttribute('mes')) || lerMes(this.getAttribute('valor') || this.getAttribute('value'));
    if (m) {
      this._ano = m.ano;
      this._mes = m.mes;
    }
    const v = lerIso(this.getAttribute('valor') || this.getAttribute('value'));
    this._foco = this.focoDentroDoMes(v || this._foco);
    if (this._eventosAttr && this.hasAttribute('eventos')) {
      this._eventos = this.lerEventosDoAtributo(this.getAttribute('eventos'));
      this._porDia = agruparEventosPorDia(this._eventos);
    }
  }

  private lerEventosDoAtributo(texto: string | null): EventoCalendario[] {
    if (!texto) return [];
    try {
      const dados: unknown = JSON.parse(texto);
      return Array.isArray(dados) ? (dados as EventoCalendario[]) : [];
    } catch {
      return [];
    }
  }

  /** Mantém o foco dentro do mês exibido (hoje, se for o mês atual; senão dia 1). */
  private focoDentroDoMes(d: DataSimples): DataSimples {
    if (d.ano === this._ano && d.mes === this._mes) return d;
    const hoje = hojeLocal();
    if (hoje.ano === this._ano && hoje.mes === this._mes) return hoje;
    return { ano: this._ano, mes: this._mes, dia: 1 };
  }

  // === Mutações de estado ===
  private mudarMes(delta: number) {
    const novo = somarMeses({ ano: this._ano, mes: this._mes, dia: this._foco.dia }, delta);
    this.definirFoco(novo, false);
  }

  private definirFoco(d: DataSimples, focarElemento: boolean) {
    const mudouMes = d.ano !== this._ano || d.mes !== this._mes;
    this._ano = d.ano;
    this._mes = d.mes;
    this._foco = d;
    if (mudouMes) this.setAttribute('mes', formatarMes(d.ano, d.mes));
    this.renderizar();
    if (focarElemento) this.focarCelula();
    if (mudouMes) {
      this.dispatchEvent(new CustomEvent<DetalheMesCalendario>('ui-mes-change', {
        detail: { mes: formatarMes(d.ano, d.mes) },
        bubbles: true,
        composed: true
      }));
    }
  }

  private selecionar(d: DataSimples) {
    if (this.selecao === 'nenhum') return;
    const iso = formatarIso(d);
    this.setAttribute('valor', iso);
    this._foco = d;
    this.renderizar();
    this.dispatchEvent(new CustomEvent<DetalheDiaCalendario>('ui-change', {
      detail: { data: iso, eventos: this._porDia.get(iso) ?? [] },
      bubbles: true,
      composed: true
    }));
  }

  private focarCelula() {
    const celula = this.gradeEl.querySelector<HTMLElement>(`[data-data="${formatarIso(this._foco)}"]`);
    celula?.focus();
  }

  // === Handlers ===
  private aoClicar = (e: Event) => {
    const alvo = e.target as HTMLElement | null;
    if (!alvo || typeof alvo.closest !== 'function') return;

    const acao = alvo.closest<HTMLElement>('[data-acao]')?.dataset.acao;
    if (acao === 'anterior') return this.mesAnterior();
    if (acao === 'proximo') return this.proximoMes();
    if (acao === 'hoje') return this.hoje();

    const celula = alvo.closest<HTMLElement>('.ui-calendario__dia');
    if (!celula) return;
    const d = lerIso(celula.dataset.data);
    if (!d) return;

    const chip = alvo.closest<HTMLElement>('.ui-calendario__evento');
    if (chip) {
      const evento = (this._porDia.get(formatarIso(d)) ?? [])[Number(chip.dataset.indice)];
      if (evento) {
        this.dispatchEvent(new CustomEvent<DetalheEventoCalendario>('ui-evento-click', {
          detail: { evento, data: formatarIso(d) },
          bubbles: true,
          composed: true
        }));
        return;
      }
    }

    if (d.ano !== this._ano || d.mes !== this._mes) this.definirFoco(d, false);
    this.selecionar(d);
    this.focarCelula();
  };

  private aoTeclar = (e: Event) => {
    const ev = e as KeyboardEvent;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.selecionar(this._foco);
      this.focarCelula();
      return;
    }
    const proxima = proximaDataFoco(ev.key, this._foco, this.inicioSemana, ev.shiftKey);
    if (!proxima) return;
    ev.preventDefault();
    this.definirFoco(proxima, true);
  };

  private aoMudarSeletor = () => {
    const mes = escolherInteiro(this.selectMes.value, 1, 12, this._mes);
    const ano = escolherInteiro(this.selectAno.value, 1, 9999, this._ano);
    const dia = Math.min(this._foco.dia, diasNoMes(ano, mes));
    this.definirFoco({ ano, mes, dia }, false);
  };

  // === Renderização ===
  private renderizar() {
    const doc = this.ownerDocument;
    const locale = this.locale;
    const inicio = this.inicioSemana;
    const hojeIso = formatarIso(hojeLocal());
    const valor = lerIso(this.valor);
    const valorIso = valor ? formatarIso(valor) : '';
    const focoIso = formatarIso(this._foco);
    const maxEventos = escolherInteiro(this.getAttribute('max-eventos'), 1, 6, 3);
    const meses = nomesDeMeses(locale);

    this.raiz.dataset.exibicao = this.exibicao;
    this.raiz.dataset.variante = escolherOpcao(this.getAttribute('variante'), VARIANTES, 'moldura');

    const titulo = this.getAttribute('titulo') || '';
    this.tituloEl.textContent = titulo;
    this.tituloEl.hidden = !titulo;

    // Seletores de mês e ano
    this.selectMes.replaceChildren(...meses.map((nome, i) => {
      const o = doc.createElement('option');
      o.value = String(i + 1);
      o.textContent = nome;
      return o;
    }));
    this.selectMes.value = String(this._mes);
    const anos: HTMLOptionElement[] = [];
    for (let a = Math.max(1, this._ano - 10); a <= Math.min(9999, this._ano + 10); a++) {
      const o = doc.createElement('option');
      o.value = String(a);
      o.textContent = String(a);
      anos.push(o);
    }
    this.selectAno.replaceChildren(...anos);
    this.selectAno.value = String(this._ano);

    // Cabeçalho da semana
    this.semanaEl.replaceChildren(...nomesDiasSemana(locale, inicio).map((nome) => {
      const s = doc.createElement('span');
      s.className = 'ui-calendario__semana-dia';
      s.textContent = capitalizar(nome);
      return s;
    }));

    // Grade
    const dias = montarGradeMes(this._ano, this._mes, inicio);
    const fmtDia = this.criarFormatadorDia(locale);
    this.gradeEl.setAttribute('aria-label', `${meses[this._mes - 1]} de ${this._ano}`);
    const linhas: HTMLElement[] = [];
    for (let l = 0; l < dias.length / 7; l++) {
      const linha = doc.createElement('div');
      linha.className = 'ui-calendario__linha';
      linha.setAttribute('role', 'row');
      dias.slice(l * 7, l * 7 + 7).forEach((dia) => {
        const eventos = this._porDia.get(dia.iso) ?? [];
        const partes = [fmtDia(dia)];
        if (eventos.length) partes.push(eventos.length === 1 ? '1 evento' : `${eventos.length} eventos`);
        if (dia.iso === hojeIso) partes.push('hoje');
        linha.appendChild(criarCelulaDia(doc, {
          dia,
          eventos,
          maxEventos,
          hoje: dia.iso === hojeIso,
          selecionado: dia.iso === valorIso,
          foco: dia.iso === focoIso,
          rotulo: partes.join(', ')
        }));
      });
      linhas.push(linha);
    }
    this.gradeEl.replaceChildren(...linhas);
  }

  private criarFormatadorDia(locale: string): (d: DataSimples) => string {
    try {
      const fmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
      return (d) => fmt.format(new Date(Date.UTC(d.ano, d.mes - 1, d.dia)));
    } catch {
      return (d) => formatarIso(d);
    }
  }
}

definirCustomElement('ui-calendario', UICalendario);
