import { ListenerBag } from '../../core/listener-bag';

export interface ContextoPainelControles {
  shadow: ShadowRoot;
  listeners: ListenerBag;
  host: HTMLElement;
  onToggleExpandirTodas: () => void;
  onFiltrar: (termo: string) => void;
  onAplicar: () => void;
  onDesfazer: () => void;
}

export function conectarPainelControles(ctx: ContextoPainelControles): void {
  const { shadow, listeners, host, onToggleExpandirTodas, onFiltrar, onAplicar, onDesfazer } = ctx;

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
    listeners.add(linkAjuda, 'click', () => {
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

  const filtroCont = shadow.getElementById('filtro-container');
  if (filtroCont) {
    filtroCont.style.display = host.hasAttribute('filtro') ? 'flex' : 'none';
  }

  const footer = shadow.getElementById('footer');
  if (footer) {
    footer.style.display = host.getAttribute('modo-aplicar') === 'manual' ? 'flex' : 'none';
  }
}
