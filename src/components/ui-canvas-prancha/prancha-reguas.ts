import type { Par } from '../../gerencigeo-canvas/feature_types';
import { deMm, type UnidadePrancha } from '../../gerencigeo-canvas/espaco/espaco_plano';
import type { ContextoPrancha2D } from '../../gerencigeo-canvas/prancha/pintura_canvas';
import type { CoresInterfacePrancha } from './prancha-cores';
import type { VistaPrancha } from './prancha-vista';

/*
 * Réguas (px CSS): marcas na unidade de exibição (`unidade`; o dado é sempre mm), com o passo escolhido entre 1, 2 e 5 ×
 * 10ⁿ para os números ficarem a ≥ 50 px; a posição do ponteiro aparece como um traço.
 */

type Ctx = ContextoPrancha2D & { clearRect?(x: number, y: number, w: number, h: number): void; fillText?(t: string, x: number, y: number): void; font?: string };

/** Passo (na unidade de exibição) entre números da régua para caberem a pelo menos `minimoPx`. */
export function passoDaRegua(pxPorUnidade: number, minimoPx = 50): number {
  if (!(pxPorUnidade > 0) || !Number.isFinite(pxPorUnidade)) return 1;
  const bruto = minimoPx / pxPorUnidade;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  for (const m of [1, 2, 5, 10]) if (m * potencia >= bruto) return m * potencia;
  return 10 * potencia;
}

export interface CenaRegua {
  orientacao: 'horizontal' | 'vertical';
  vista: VistaPrancha;
  unidade: UnidadePrancha;
  /** Tamanho da régua (px CSS): comprimento e espessura. */
  comprimento: number;
  espessura: number;
  cores: CoresInterfacePrancha;
  ponteiro: Par | null;
  /** Deslocamento da régua em relação à área de desenho (a régua horizontal começa depois do canto). */
  deslocamento: number;
}

export function pintarRegua(ctx: Ctx, cena: CenaRegua): void {
  const { vista, cores, comprimento, espessura } = cena;
  const h = cena.orientacao === 'horizontal';
  ctx.save();
  ctx.setTransform(vista.dpr, 0, 0, vista.dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = cores.regua;
  ctx.fillRect(0, 0, h ? comprimento : espessura, h ? espessura : comprimento);
  const mmPorUnidade = 1 / deMm(1, cena.unidade);
  const pxPorUnidade = vista.zoom * mmPorUnidade;
  const passo = passoDaRegua(pxPorUnidade);
  const sub = passo / (passo * pxPorUnidade >= 100 ? 10 : 5);
  const origem = (h ? vista.pan[0] : vista.pan[1]) + cena.deslocamento;
  const inicio = Math.floor(-origem / pxPorUnidade / sub) * sub;
  const fim = (comprimento - origem) / pxPorUnidade;
  ctx.beginPath();
  const rotulos: Array<[string, number]> = [];
  for (let u = inicio, k = 0; u <= fim && k < 5000; u += sub, k++) {
    const pos = Math.round(origem + u * pxPorUnidade) + 0.5;
    const maior = Math.abs(u / passo - Math.round(u / passo)) < 1e-6;
    const tam = maior ? espessura : espessura * 0.3;
    if (h) { ctx.moveTo(pos, espessura); ctx.lineTo(pos, espessura - tam); } else { ctx.moveTo(espessura, pos); ctx.lineTo(espessura - tam, pos); }
    if (maior) rotulos.push([String(Math.round(u * 1000) / 1000), pos]);
  }
  ctx.strokeStyle = cores.textoRegua;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.stroke();
  if (typeof ctx.fillText === 'function') {
    ctx.font = '9px sans-serif';
    ctx.fillStyle = cores.textoRegua;
    for (const [t, pos] of rotulos) {
      if (h) ctx.fillText(t, pos + 2, 9);
      else ctx.fillText(t, 1, pos + 10);
    }
  }
  if (cena.ponteiro) {
    const p = vista.paraTela(cena.ponteiro);
    const pos = Math.round((h ? p[0] : p[1]) + cena.deslocamento) + 0.5;
    ctx.beginPath();
    if (h) { ctx.moveTo(pos, 0); ctx.lineTo(pos, espessura); } else { ctx.moveTo(0, pos); ctx.lineTo(espessura, pos); }
    ctx.strokeStyle = cores.selecao;
    ctx.stroke();
  }
  ctx.restore();
}
