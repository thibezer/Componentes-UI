import type { DiaGrade, EventoCalendario } from './tipos';

export const ATRIBUTOS_OBSERVADOS_CALENDARIO = [
  'mes',
  'valor',
  'value',
  'titulo',
  'locale',
  'inicio-semana',
  'selecao',
  'exibicao',
  'variante',
  'eventos',
  'max-eventos'
];

export function criarTemplateCalendario(): string {
  return `
    <div class="ui-calendario" part="base">
      <div class="ui-calendario__cabecalho" part="cabecalho">
        <span class="ui-calendario__titulo" part="titulo"></span>
        <div class="ui-calendario__nav" part="nav">
          <button type="button" class="ui-calendario__nav-btn" data-acao="anterior" part="nav-botao" aria-label="Mês anterior">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
          </button>
          <button type="button" class="ui-calendario__hoje" data-acao="hoje" part="hoje-botao">Hoje</button>
          <button type="button" class="ui-calendario__nav-btn" data-acao="proximo" part="nav-botao" aria-label="Próximo mês">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
      <div class="ui-calendario__corpo" part="corpo">
        <div class="ui-calendario__seletores" part="seletores">
          <select class="ui-calendario__select" data-seletor="mes" part="select" aria-label="Mês"></select>
          <select class="ui-calendario__select" data-seletor="ano" part="select" aria-label="Ano"></select>
        </div>
        <div class="ui-calendario__semana" part="semana" aria-hidden="true"></div>
        <div class="ui-calendario__grade" part="grade" role="grid"></div>
      </div>
    </div>
  `;
}


interface OpcoesCelula {
  dia: DiaGrade;
  eventos: EventoCalendario[];
  maxEventos: number;
  hoje: boolean;
  selecionado: boolean;
  foco: boolean;
  rotulo: string;
}

function corSegura(cor: unknown): string | null {
  if (typeof cor !== 'string') return null;
  const c = cor.trim();
  // Aceita só valores de cor; bloqueia ';', '{', '}', 'url(' e comentários para não escapar do atributo style.
  if (!c || /[;{}<>\\]|url\(|\/\*/i.test(c)) return null;
  return c;
}

export function criarCelulaDia(doc: Document, o: OpcoesCelula): HTMLButtonElement {
  const { dia, eventos } = o;
  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.className = 'ui-calendario__dia';
  btn.setAttribute('role', 'gridcell');
  btn.dataset.data = dia.iso;
  btn.tabIndex = o.foco ? 0 : -1;
  btn.setAttribute('aria-label', o.rotulo);
  if (!dia.doMes) btn.classList.add('ui-calendario__dia--fora');
  if (dia.diaSemana === 0 || dia.diaSemana === 6) btn.classList.add('ui-calendario__dia--fim-semana');
  if (o.hoje) { btn.classList.add('ui-calendario__dia--hoje'); btn.setAttribute('aria-current', 'date'); }
  if (o.selecionado) btn.classList.add('ui-calendario__dia--selecionado');
  btn.setAttribute('aria-selected', o.selecionado ? 'true' : 'false');
  if (eventos.length) btn.classList.add('ui-calendario__dia--com-eventos');
  btn.setAttribute('part', ['dia', !dia.doMes ? 'dia-fora' : '', o.hoje ? 'dia-hoje' : '', o.selecionado ? 'dia-selecionado' : '', eventos.length ? 'dia-com-eventos' : ''].filter(Boolean).join(' '));

  const numero = doc.createElement('span');
  numero.className = 'ui-calendario__numero';
  numero.setAttribute('part', 'numero');
  numero.textContent = String(dia.dia);
  btn.appendChild(numero);

  if (eventos.length === 0) return btn;

  const visiveis = eventos.slice(0, o.maxEventos);
  const extras = eventos.length - visiveis.length;

  const lista = doc.createElement('span');
  lista.className = 'ui-calendario__eventos';
  visiveis.forEach((ev, i) => {
    const chip = doc.createElement('span');
    chip.className = 'ui-calendario__evento';
    chip.setAttribute('part', 'evento');
    chip.dataset.indice = String(i);
    if (ev.tipo) chip.dataset.tipo = String(ev.tipo);
    const cor = corSegura(ev.cor);
    if (cor) chip.style.setProperty('--ui-calendario-evento-cor', cor);
    chip.textContent = typeof ev.titulo === 'string' ? ev.titulo : '';
    chip.title = chip.textContent;
    lista.appendChild(chip);
  });
  if (extras > 0) {
    const mais = doc.createElement('span');
    mais.className = 'ui-calendario__mais';
    mais.setAttribute('part', 'mais');
    mais.textContent = `+${extras}`;
    lista.appendChild(mais);
  }
  btn.appendChild(lista);

  const pontos = doc.createElement('span');
  pontos.className = 'ui-calendario__pontos';
  pontos.setAttribute('aria-hidden', 'true');
  eventos.slice(0, 3).forEach((ev) => {
    const p = doc.createElement('span');
    p.className = 'ui-calendario__ponto';
    const cor = corSegura(ev.cor);
    if (cor) p.style.setProperty('--ui-calendario-evento-cor', cor);
    pontos.appendChild(p);
  });
  btn.appendChild(pontos);

  return btn;
}
