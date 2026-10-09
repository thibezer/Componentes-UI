import { ListenerBag } from '../../core/listener-bag';

export interface ContextoPainelControles {
  shadow: ShadowRoot;
  listeners: ListenerBag;
  host: HTMLElement;
  onToggleExpandirTodas: () => void;
  onFiltrar: (termo: string) => void;
  onAplicar: () => void;
  onDesfazer: () => void;
  onAlternarDensidade?: () => void;
  onAlternarFlutuante?: () => void;
  onAlternarColapsoHorizontal?: () => void;
}

export function conectarPainelControles(ctx: ContextoPainelControles): void {
  const {
    shadow,
    listeners,
    host,
    onToggleExpandirTodas,
    onFiltrar,
    onAplicar,
    onDesfazer,
    onAlternarDensidade,
    onAlternarFlutuante,
    onAlternarColapsoHorizontal
  } = ctx;

  const btnFlutuante = shadow.getElementById('btn-flutuante');
  if (btnFlutuante && onAlternarFlutuante) {
    listeners.add(btnFlutuante, 'click', onAlternarFlutuante);
  }

  const btnColapsarHorizontal = shadow.getElementById('btn-colapsar-horizontal');
  if (btnColapsarHorizontal && onAlternarColapsoHorizontal) {
    listeners.add(btnColapsarHorizontal, 'click', onAlternarColapsoHorizontal);
  }

  const faixaEstreita = shadow.getElementById('faixa-estreita');
  if (faixaEstreita && onAlternarColapsoHorizontal) {
    listeners.add(faixaEstreita, 'click', onAlternarColapsoHorizontal);
  }

  const btnExpandirFaixa = shadow.getElementById('btn-expandir-faixa');
  if (btnExpandirFaixa && onAlternarColapsoHorizontal) {
    listeners.add(btnExpandirFaixa, 'click', (e: Event) => {
      e.stopPropagation();
      onAlternarColapsoHorizontal();
    });
  }

  const btnDensidade = shadow.getElementById('btn-densidade');
  if (btnDensidade && onAlternarDensidade) {
    listeners.add(btnDensidade, 'click', onAlternarDensidade);
  }

  const btnExpandirTudo = shadow.getElementById('btn-expandir-tudo');
  if (btnExpandirTudo) {
    listeners.add(btnExpandirTudo, 'click', onToggleExpandirTodas);
  }

  const btnFechar = shadow.getElementById('btn-fechar');
  if (btnFechar) {
    listeners.add(btnFechar, 'click', () => {
      host.dispatchEvent(new CustomEvent('ui-fechar', { bubbles: true, composed: true }));
    });
  }

  const filtroInput = shadow.getElementById('filtro-input') as HTMLInputElement | null;
  if (filtroInput) {
    listeners.add(filtroInput, 'input', () => {
      const termo = (filtroInput.value || '').trim().toLowerCase();
      onFiltrar(termo);
    });
  }

  const btnAplicar = shadow.getElementById('btn-aplicar');
  if (btnAplicar) {
    listeners.add(btnAplicar, 'click', onAplicar);
  }

  const btnDesfazer = shadow.getElementById('btn-desfazer');
  if (btnDesfazer) {
    listeners.add(btnDesfazer, 'click', onDesfazer);
  }

  const linkAjuda = shadow.getElementById('link-ajuda');
  if (linkAjuda) {
    listeners.add(linkAjuda, 'click', (e: Event) => {
      e.preventDefault(); // href="#" só existe para o link ser focável pelo teclado
      host.dispatchEvent(new CustomEvent('ui-ajuda', { bubbles: true, composed: true }));
    });
  }
}

export function sincronizarPainelControles(shadow: ShadowRoot, host: HTMLElement): void {
  const headerTitulo = shadow.getElementById('header-titulo-texto');
  if (headerTitulo) {
    headerTitulo.textContent = host.getAttribute('titulo') || 'Propriedades';
  }

  const btnFechar = shadow.getElementById('btn-fechar');
  if (btnFechar) {
    btnFechar.style.display = host.hasAttribute('fechavel') ? 'inline-flex' : 'none';
  }

  const btnFlutuante = shadow.getElementById('btn-flutuante');
  if (btnFlutuante) {
    const isFlutuante = host.hasAttribute('flutuante');
    btnFlutuante.title = isFlutuante ? 'Acoplar painel (Dock)' : 'Desacoplar / Modo flutuante (CAD)';
    btnFlutuante.classList.toggle('ui-prop__btn-icone--ativo', isFlutuante);
  }

  const btnColapsarHorizontal = shadow.getElementById('btn-colapsar-horizontal');
  if (btnColapsarHorizontal) {
    const isColapsado = host.hasAttribute('colapsado');
    btnColapsarHorizontal.title = isColapsado ? 'Expandir painel' : 'Recolher para coluna estreita';
    btnColapsarHorizontal.classList.toggle('ui-prop__btn-icone--ativo', isColapsado);
  }

  const btnDensidade = shadow.getElementById('btn-densidade');
  if (btnDensidade) {
    const densidadeAtual = host.getAttribute('densidade') || 'padrão';
    btnDensidade.title = `Compressão vertical: ${densidadeAtual} (clique para alternar)`;
  }

  const filtroCont = shadow.getElementById('filtro-container');
  if (filtroCont) {
    filtroCont.style.display = host.hasAttribute('filtro') ? 'flex' : 'none';
  }

  const footer = shadow.getElementById('footer');
  if (footer) {
    footer.style.display = host.getAttribute('modo-aplicar') === 'manual' ? 'flex' : 'none';
  }
}
