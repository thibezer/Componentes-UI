/*
 * Estado do snap: ligado/desligado (tecla S, botão ou API) e o desligamento temporário enquanto
 * Alt está pressionado. O motor de busca está em gerencigeo-canvas/feature_snap.ts.
 */

import { focoEmCampoDeTexto } from '../../core/alvo-digitavel';

export interface ContextoControleSnap {
  /** Chamado quando o estado efetivo ou o ligado/desligado muda. */
  aoMudar: (estado: { ativo: boolean; ligado: boolean; temporario: boolean }) => void;
  /** A tecla S só vale quando isto devolve `true` (ex.: mouse sobre o canvas ou foco dentro dele). Sem a função, vale sempre. */
  aplica?: () => boolean;
  /** Alvo dos listeners de teclado (padrão: window). */
  alvo?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}


export class ControleSnap {
  private _ligado = true;
  private _altSegurado = false;
  /** Tecla S alterna o snap. Desligável para quem já trata a tecla (ex.: atalhos próprios do app). */
  public atalhoS = true;
  private conectado = false;

  constructor(private contexto: ContextoControleSnap) {}

  /** Snap valendo agora: ligado e sem Alt. */
  public get ativo(): boolean {
    return this._ligado && !this._altSegurado;
  }

  public get ligado(): boolean {
    return this._ligado;
  }

  public definir(ligado: boolean): void {
    if (this._ligado === ligado) return;
    this._ligado = ligado;
    this.notificar();
  }

  public alternar(): void {
    this.definir(!this._ligado);
  }

  public conectar(): void {
    if (this.conectado) return;
    this.conectado = true;
    const alvo = this.contexto.alvo ?? window;
    alvo.addEventListener('keydown', this.aoTeclaBaixo as EventListener);
    alvo.addEventListener('keyup', this.aoTeclaCima as EventListener);
    alvo.addEventListener('blur', this.aoPerderFoco);
  }

  public desconectar(): void {
    if (!this.conectado) return;
    this.conectado = false;
    const alvo = this.contexto.alvo ?? window;
    alvo.removeEventListener('keydown', this.aoTeclaBaixo as EventListener);
    alvo.removeEventListener('keyup', this.aoTeclaCima as EventListener);
    alvo.removeEventListener('blur', this.aoPerderFoco);
    this._altSegurado = false;
  }

  private definirAlt(segurado: boolean): void {
    if (this._altSegurado === segurado) return;
    this._altSegurado = segurado;
    this.notificar();
  }

  private aoTeclaBaixo = (e: KeyboardEvent): void => {
    if (e.key === 'Alt') {
      this.definirAlt(true);
      return;
    }
    if (this.atalhoS && (e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey && !focoEmCampoDeTexto(e)
      && (this.contexto.aplica?.() ?? true)) {
      this.alternar();
    }
  };

  private aoTeclaCima = (e: KeyboardEvent): void => {
    if (e.key === 'Alt') this.definirAlt(false);
  };

  /** Alt+Tab e afins: sem isto o Alt "ficaria preso" e o snap sumiria. */
  private aoPerderFoco = (): void => {
    this.definirAlt(false);
  };

  private notificar(): void {
    this.contexto.aoMudar({ ativo: this.ativo, ligado: this._ligado, temporario: this._altSegurado });
  }
}
