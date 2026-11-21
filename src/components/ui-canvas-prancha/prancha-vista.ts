import type { Par } from '../../gerencigeo-canvas/feature_types';
import { compor, escala, translacao, type Matriz2D } from '../../gerencigeo-canvas/espaco/espaco_matriz';
import type { CaixaMm } from '../../gerencigeo-canvas/prancha/tipos';

/*
 * Vista da prancha (sem DOM): zoom (px de tela por mm) e pan (posição em px da origem da folha na área de desenho).
 * Converte tela ↔ folha e dá as matrizes que o pintor usa (CSS px e px do dispositivo, com o devicePixelRatio).
 */

/** px por mm a 100% (96 dpi). */
export const PX_POR_MM_100 = 96 / 25.4;
export const ZOOM_MINIMO = PX_POR_MM_100 * 0.02;
export const ZOOM_MAXIMO = PX_POR_MM_100 * 64;

const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export class VistaPrancha {
  public zoom = PX_POR_MM_100;
  public pan: Par = [0, 0];
  public largura = 0;
  public altura = 0;
  public dpr = 1;

  public get zoomPercentual(): number {
    return (this.zoom / PX_POR_MM_100) * 100;
  }

  /** Folha (mm) → px CSS da área de desenho. */
  public matrizTela(): Matriz2D {
    return compor(escala(this.zoom), translacao(this.pan[0], this.pan[1]));
  }

  /** Folha (mm) → px do dispositivo (com o dpr): a matriz do pintor. */
  public matrizDispositivo(): Matriz2D {
    return compor(escala(this.zoom), translacao(this.pan[0], this.pan[1]), escala(this.dpr));
  }

  public paraFolha(x: number, y: number): Par {
    return [(x - this.pan[0]) / this.zoom, (y - this.pan[1]) / this.zoom];
  }

  public paraTela(p: Par): Par {
    return [p[0] * this.zoom + this.pan[0], p[1] * this.zoom + this.pan[1]];
  }

  /** Muda o tamanho da área de desenho (px CSS) e o dpr; valores inválidos são ignorados. */
  public redimensionar(largura: number, altura: number, dpr = 1): void {
    if (fin(largura) && largura >= 0) this.largura = largura;
    if (fin(altura) && altura >= 0) this.altura = altura;
    if (fin(dpr) && dpr > 0) this.dpr = Math.min(dpr, 4);
  }

  /** Zoom absoluto mantendo parado o ponto de tela `foco` (padrão: o centro). Devolve se mudou. */
  public definirZoom(zoom: number, foco?: Par): boolean {
    if (!fin(zoom) || zoom <= 0) return false;
    const z = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, zoom));
    if (z === this.zoom) return false;
    const f: Par = foco && fin(foco[0]) && fin(foco[1]) ? foco : [this.largura / 2, this.altura / 2];
    const p = this.paraFolha(f[0], f[1]);
    this.zoom = z;
    this.pan = [f[0] - p[0] * z, f[1] - p[1] * z];
    return true;
  }

  public zoomRelativo(fator: number, foco?: Par): boolean {
    return fin(fator) && fator > 0 ? this.definirZoom(this.zoom * fator, foco) : false;
  }

  public deslocar(dx: number, dy: number): boolean {
    if (!fin(dx) || !fin(dy) || (dx === 0 && dy === 0)) return false;
    this.pan = [this.pan[0] + dx, this.pan[1] + dy];
    return true;
  }

  /** Zoom absoluto mantendo o CENTRO da caixa (mm) no centro da área de desenho (usado no teto de zoom do enquadramento). */
  public definirZoomCentrado(zoom: number, c: CaixaMm): boolean {
    if (!fin(zoom) || zoom <= 0 || !c || ![c.x, c.y, c.largura, c.altura].every(fin)) return false;
    this.zoom = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, zoom));
    this.pan = [this.largura / 2 - (c.x + c.largura / 2) * this.zoom, this.altura / 2 - (c.y + c.altura / 2) * this.zoom];
    return true;
  }

  /** Enquadra a caixa (mm) com `margem` px em volta. Sem tamanho de área de desenho, não faz nada. */
  public enquadrar(c: CaixaMm, margem = 24): boolean {
    if (!c || ![c.x, c.y, c.largura, c.altura].every(fin) || this.largura <= 0 || this.altura <= 0) return false;
    const w = Math.max(c.largura, 1e-6);
    const h = Math.max(c.altura, 1e-6);
    const livreX = Math.max(1, this.largura - 2 * margem);
    const livreY = Math.max(1, this.altura - 2 * margem);
    this.zoom = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, Math.min(livreX / w, livreY / h)));
    this.pan = [this.largura / 2 - (c.x + w / 2) * this.zoom, this.altura / 2 - (c.y + h / 2) * this.zoom];
    return true;
  }
}
