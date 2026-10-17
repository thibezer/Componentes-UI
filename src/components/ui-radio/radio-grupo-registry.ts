import type { UIRadio } from './ui-radio';

interface Registro {
  scope: Node;
  nome: string;
}

/**
 * Grupos de radios por nome, dentro do escopo do formulário (ou da raiz, sem formulário).
 * O registro de cada radio é guardado ao registrar: assim o cancelamento usa o nome e o escopo de ANTES,
 * mesmo que o radio já tenha saído do formulário (disconnectedCallback roda depois da remoção) ou mudado de nome.
 */
export class RadioGrupoRegistry {
  private static registry = new WeakMap<Node, Map<string, Set<UIRadio>>>();
  private static registros = new WeakMap<UIRadio, Registro>();

  public static getScopeNode(radio: HTMLElement): Node {
    return radio.closest('form') || radio.getRootNode() || document;
  }

  /** Registra (ou re-registra, se o nome ou o escopo mudaram) o radio no grupo do seu nome atual. */
  public static registrar(radio: UIRadio): void {
    this.desregistrar(radio);
    const nome = radio.name;
    if (!nome) return;

    const scope = this.getScopeNode(radio);
    let porNome = this.registry.get(scope);
    if (!porNome) {
      porNome = new Map();
      this.registry.set(scope, porNome);
    }
    let grupo = porNome.get(nome);
    if (!grupo) {
      grupo = new Set();
      porNome.set(nome, grupo);
    }
    grupo.add(radio);
    this.registros.set(radio, { scope, nome });
  }

  public static desregistrar(radio: UIRadio): void {
    const anterior = this.registros.get(radio);
    if (!anterior) return;
    this.registros.delete(radio);

    const porNome = this.registry.get(anterior.scope);
    const grupo = porNome?.get(anterior.nome);
    if (!porNome || !grupo) return;
    grupo.delete(radio);
    if (grupo.size === 0) porNome.delete(anterior.nome);
    if (porNome.size === 0) this.registry.delete(anterior.scope);
  }

  /** Radios do mesmo grupo que `radio`, usando o registro (não o nome atual, que pode ainda não ter sido registrado). */
  public static obterRadiosDoGrupo(radio: UIRadio): UIRadio[] {
    const registro = this.registros.get(radio);
    if (!registro) return [];
    const grupo = this.registry.get(registro.scope)?.get(registro.nome);
    return grupo ? Array.from(grupo) : [];
  }

  public static desmarcarOutros(radio: UIRadio): void {
    this.obterRadiosDoGrupo(radio).forEach((el) => {
      if (el !== radio) {
        el.removeAttribute('marcado');
        el.removeAttribute('checked');
        el.syncState();
      }
    });
  }

  /** Reavalia o tabindex (roving) dos radios; use depois de entrar, sair ou mudar de grupo. */
  public static atualizarGrupo(radios: UIRadio[]): void {
    radios.forEach((r) => r.atualizarTabindex());
  }

  public static tratarNavegacaoTeclado(e: KeyboardEvent, radioAtual: UIRadio): void {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) return;
    e.preventDefault();
    const habilitados = this.obterRadiosDoGrupo(radioAtual).filter((r) => !r.disabled && r.isConnected);
    if (habilitados.length <= 1) return;

    const atual = habilitados.indexOf(radioAtual);
    const avanca = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const proximo = (atual + (avanca ? 1 : -1) + habilitados.length) % habilitados.length;
    if (proximo !== atual) {
      const alvo = habilitados[proximo];
      alvo.selecionar();
      alvo.focus();
    }
  }
}
