import type { UIRadio } from './ui-radio';

export class RadioGrupoRegistry {
  private static registry = new WeakMap<Node, Map<string, Set<UIRadio>>>();

  public static getScopeNode(radio: HTMLElement): Node {
    return radio.closest('form') || radio.getRootNode() || document;
  }

  public static registrar(radio: UIRadio): void {
    const nome = radio.name;
    if (nome) {
      const scope = this.getScopeNode(radio);
      if (!this.registry.has(scope)) {
        this.registry.set(scope, new Map());
      }
      const scopeMap = this.registry.get(scope)!;
      if (!scopeMap.has(nome)) {
        scopeMap.set(nome, new Set());
      }
      scopeMap.get(nome)!.add(radio);
    }
  }

  public static desregistrar(radio: UIRadio): void {
    const nome = radio.name;
    if (nome) {
      const scope = this.getScopeNode(radio);
      const scopeMap = this.registry.get(scope);
      if (scopeMap && scopeMap.has(nome)) {
        const group = scopeMap.get(nome)!;
        group.delete(radio);
        if (group.size === 0) {
          scopeMap.delete(nome);
        }
        if (scopeMap.size === 0) {
          this.registry.delete(scope);
        }
      }
    }
  }

  public static obterRadiosDoGrupo(radio: UIRadio): UIRadio[] {
    const nome = radio.name;
    if (!nome) return [];
    const scope = this.getScopeNode(radio);
    const scopeMap = this.registry.get(scope);
    if (!scopeMap || !scopeMap.has(nome)) return [];
    return Array.from(scopeMap.get(nome)!);
  }

  public static desmarcarOutros(radio: UIRadio): void {
    const grupo = this.obterRadiosDoGrupo(radio);
    grupo.forEach(el => {
      if (el !== radio) {
        el.removeAttribute('marcado');
        el.removeAttribute('checked');
        el.syncState();
      }
    });
  }

  public static tratarNavegacaoTeclado(e: KeyboardEvent, radioAtual: UIRadio): void {
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      const radios = this.obterRadiosDoGrupo(radioAtual);
      const enabledRadios = radios.filter(r => !r.disabled);
      if (enabledRadios.length <= 1) return;

      const currentIndex = enabledRadios.indexOf(radioAtual);
      let nextIndex = currentIndex;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % enabledRadios.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + enabledRadios.length) % enabledRadios.length;
      }

      if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < enabledRadios.length) {
        const nextRadio = enabledRadios[nextIndex];
        nextRadio.selecionar();
        nextRadio.focus();
      }
    }
  }
}
