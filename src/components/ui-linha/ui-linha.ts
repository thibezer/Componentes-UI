import estilos from './ui-linha.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { aplicarAlturaControle } from '../../core/altura-controle';

export type AlinhamentoLinha = 'inicio' | 'centro' | 'fim' | 'esticar';
export type JustificacaoLinha = 'inicio' | 'centro' | 'fim' | 'entre' | 'ao-redor';
export type EspacoLinha = 'nenhum' | 'xs' | 'sm' | 'md' | 'lg';

/**
 * Contêiner de controles na mesma linha: um único lugar define altura, alinhamento, espaço e quebra, e todos os
 * filhos (`ui-botao`, `ui-campo-texto`, `ui-lista-flutuante`, `ui-segmented`, `ui-badge[controle]`...) se alinham sozinhos.
 *
 * A altura segue o contrato `--ui-campo-altura` (ver `core/altura-controle.ts`): `tamanho`/`altura` aqui valem para
 * todos os filhos; um filho com `tamanho`/`altura` próprio vence só ele.
 *
 * @element ui-linha
 *
 * @attr {string} tamanho - Altura dos controles filhos: `sm` (26px), `md` (34px), `lg` (42px); aceita também `compacta`, `padrao`, `relaxada`.
 * @attr {string} densidade - Sinônimo de `tamanho`.
 * @attr {string} altura - Altura explícita dos controles filhos (px, rem ou em); vence `tamanho`.
 * @attr {string} alinhar - Alinhamento vertical: `centro` (padrão), `inicio`, `fim`, `esticar`.
 * @attr {string} justificar - Distribuição horizontal: `inicio` (padrão), `centro`, `fim`, `entre`, `ao-redor`.
 * @attr {string} espaco - Espaço entre os filhos: `nenhum`, `xs`, `sm` (padrão), `md`, `lg`.
 * @attr {boolean} sem-quebra - Não quebra para a linha de baixo (por padrão a linha quebra).
 * @attr {boolean} inline - Ocupa só a largura do conteúdo (`inline-flex`).
 *
 * @slot - Os controles da linha. Qualquer filho com o atributo `expandir` ocupa o espaço restante.
 *
 * @cssprop --ui-linha-espaco - Espaço entre os filhos (substitui `espaco`).
 * @cssprop --ui-linha-campo-base - Largura-base de campos e listas antes de quebrar (padrão `12rem`).
 * @cssprop --ui-campo-altura - Altura dos controles filhos (definida por `tamanho`/`altura`).
 */
export class UILinha extends SafeHTMLElement {
  static get observedAttributes() {
    return ['tamanho', 'size', 'densidade', 'altura', 'height'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${estilos}</style><slot></slot>`;
  }

  connectedCallback() {
    aplicarAlturaControle(this);
  }

  attributeChangedCallback(_name: string, old: string | null, value: string | null) {
    if (old === value) return;
    aplicarAlturaControle(this);
  }

  private lerTexto(nome: string): string | null {
    return this.getAttribute(nome);
  }

  private definirTexto(nome: string, valor: string | null | undefined) {
    if (valor === null || valor === undefined || valor === '') this.removeAttribute(nome);
    else this.setAttribute(nome, String(valor));
  }

  get tamanho(): string | null { return this.lerTexto('tamanho'); }
  set tamanho(v: string | null) { this.definirTexto('tamanho', v); }

  get altura(): string | null { return this.lerTexto('altura'); }
  set altura(v: string | number | null) { this.definirTexto('altura', v === null ? null : String(v)); }

  get alinhar(): AlinhamentoLinha | null { return this.lerTexto('alinhar') as AlinhamentoLinha | null; }
  set alinhar(v: AlinhamentoLinha | null) { this.definirTexto('alinhar', v); }

  get justificar(): JustificacaoLinha | null { return this.lerTexto('justificar') as JustificacaoLinha | null; }
  set justificar(v: JustificacaoLinha | null) { this.definirTexto('justificar', v); }

  get espaco(): EspacoLinha | null { return this.lerTexto('espaco') as EspacoLinha | null; }
  set espaco(v: EspacoLinha | null) { this.definirTexto('espaco', v); }

  get semQuebra(): boolean { return this.hasAttribute('sem-quebra'); }
  set semQuebra(v: boolean) { this.toggleAttribute('sem-quebra', Boolean(v)); }
}

definirCustomElement('ui-linha', UILinha);
