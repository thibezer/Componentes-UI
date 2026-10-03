/* ====================================================
   UI Components Kit - Utilitários de Acessibilidade
   Associação automática entre rótulos e controles nativos
   encapsulados no Shadow DOM, sem IDs manuais no consumidor
   ==================================================== */

let contadorIds = 0;

/**
 * Gera um identificador único e estável para a vida do elemento.
 * O contador garante unicidade no documento; o sufixo aleatório evita
 * colisões entre múltiplas cópias da biblioteca carregadas na mesma página.
 */
export function gerarIdUnico(prefixo = 'ui'): string {
  contadorIds += 1;
  return `${prefixo}-${contadorIds.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Texto de um nó ignorando a subárvore do próprio componente (ex.: <option> filhos). */
function textoSemElemento(no: Node, ignorar: Node): string {
  if (no === ignorar) return '';
  if (no.nodeType === 3) return no.textContent ?? '';
  let texto = '';
  no.childNodes.forEach((filho) => {
    texto += textoSemElemento(filho, ignorar);
  });
  return texto;
}

/**
 * Resolve o rótulo fornecido de fora do Shadow DOM:
 * `aria-label` no host, `<label for="id-do-host">` ou `<label>` envolvendo o host.
 * Usado quando o componente não recebe o atributo `label`, para que o controle
 * nativo interno nunca fique sem nome acessível.
 */
export function obterRotuloExterno(
  host: HTMLElement,
  internals?: { labels?: NodeList } | null
): string {
  const ariaLabel = host.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const rotulos = new Set<Node>();
  try {
    internals?.labels?.forEach((l) => rotulos.add(l));
  } catch {
    // ElementInternals.labels indisponível (polyfill/SSR)
  }

  if (host.id) {
    const raiz = host.getRootNode() as Document | ShadowRoot;
    raiz.querySelectorAll?.('label[for]').forEach((l) => {
      if ((l as HTMLLabelElement).htmlFor === host.id) rotulos.add(l);
    });
  }

  const rotuloPai = host.closest('label');
  if (rotuloPai) rotulos.add(rotuloPai);

  return Array.from(rotulos)
    .map((l) => textoSemElemento(l, host).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Indica se um clique no host veio de um `<label>` externo (ativação de rótulo),
 * e não de uma interação dentro do Shadow DOM — cujo evento também é
 * redirecionado (retargeted) para o host.
 */
export function cliqueVeioDeRotuloExterno(host: HTMLElement, evento: Event): boolean {
  return evento.composedPath()[0] === host;
}
