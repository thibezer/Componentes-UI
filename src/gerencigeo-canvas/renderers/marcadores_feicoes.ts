import L from 'leaflet';
import type { Feicao } from '../feature_types';
import type { LayerStyleDef } from '../types';
import { COR_PADRAO, COR_SELECAO, corSegura, type EstiloVetor } from '../motor/estilo';
import { escapeHtml } from '../utils';

/*
 * Ícones dos marcadores DOM das feições (ponto com ícone SVG, texto/selo e cluster). Compartilhados pelo renderizador
 * Leaflet e pelo Canvas: ícone, texto, cluster e rótulo continuam marcadores DOM nos dois caminhos porque dependem de
 * CSS e de arraste.
 */

export const ICONES_FEICAO: Record<string, string> = {
  tower: '<path d="M12 2 L8 22 M12 2 L16 22 M9.5 12 H14.5 M8.7 17 H15.3 M12 2 L9.5 12 L14.5 12 Z" />',
  tree: '<path d="M12 22 V14 M12 3 L5 14 H19 Z" />',
  warning: '<path d="M12 3 L22 20 H2 Z M12 9 V14 M12 17 V17.5" />',
  water: '<path d="M12 3 C12 3 5 11 5 15.5 A7 7 0 0 0 19 15.5 C19 11 12 3 12 3 Z" />',
  boundary: '<path d="M12 2 L22 12 L12 22 L2 12 Z" />'
};

export function iconeSvg(f: Feicao, estiloCamada: LayerStyleDef, selecionada = false): L.DivIcon {
  const e = f.estilo ?? {};
  // o tamanho entra em atributos HTML: só número finito (o dado vem do consumidor, sem garantia de tipo)
  const bruto = e.tamanhoIcone ?? estiloCamada.tamanhoMarcador;
  const tam = typeof bruto === 'number' && Number.isFinite(bruto) && bruto > 0 ? bruto : 22;
  const cor = selecionada ? COR_SELECAO : corSegura(e.corTraco ?? e.corPreenchimento ?? estiloCamada.corPrimaria, COR_PADRAO);
  const rot = Number.isFinite(e.rotacaoIcone) ? e.rotacaoIcone : 0;
  const caminho = ICONES_FEICAO[e.icone ?? ''] ?? '';
  return L.divIcon({
    className: `custom-leaflet-marker${selecionada ? ' cad-feicao-selecionada' : ''}`,
    iconSize: [tam, tam],
    html:
      `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="${cor}" fill-opacity="0.25" ` +
      `stroke="${cor}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" ` +
      `style="transform:rotate(${rot}deg);overflow:visible;display:block${selecionada ? `;filter:drop-shadow(0 0 3px ${COR_SELECAO})` : ''}">${caminho}</svg>`
  });
}

export function iconeTexto(f: Feicao, estiloCamada: LayerStyleDef, selecionada = false): L.DivIcon {
  const e = f.estilo ?? {};
  const texto = f.geometria.tipo === 'Text' ? f.geometria.texto : '';
  const cor = selecionada ? COR_SELECAO : corSegura(e.corTraco ?? estiloCamada.corPrimaria, '#ffffff');
  const tam = Number.isFinite(e.tamanhoFonte) ? e.tamanhoFonte : 13;
  const rot = Number.isFinite(e.rotacaoIcone) ? e.rotacaoIcone : 0;
  const base = `display:inline-block;white-space:nowrap;transform:translate(-50%,-50%) rotate(${rot}deg);color:${cor};font-size:${tam}px;font-weight:600;`;

  // selo (fundo + borda): substitui o halo. Cores só passam por `corSegura`; números só se finitos
  const fundo = corSegura(e.corFundo, '');
  if (fundo) {
    const borda = corSegura(e.corBorda, '');
    const opacidade = typeof e.opacidadeFundo === 'number' && Number.isFinite(e.opacidadeFundo) ? Math.min(1, Math.max(0, e.opacidadeFundo)) : 0.85;
    const raio = typeof e.raioBorda === 'number' && Number.isFinite(e.raioBorda) ? Math.min(50, Math.max(0, e.raioBorda)) : 4;
    const bordaCss = selecionada ? `1px solid ${COR_SELECAO}` : borda ? `1px solid ${borda}` : 'none';
    return L.divIcon({
      className: `custom-leaflet-marker cad-feicao-texto cad-feicao-selo${selecionada ? ' cad-feicao-selecionada' : ''}`,
      iconSize: undefined,
      html:
        `<span style="${base}position:relative;padding:2px 6px;border-radius:${raio}px;border:${bordaCss}">` +
        `<span style="position:absolute;top:0;right:0;bottom:0;left:0;border-radius:inherit;background:${fundo};opacity:${opacidade}"></span>` +
        `<span style="position:relative">${escapeHtml(texto)}</span></span>`
    });
  }

  const halo = e.halo
    ? 'text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;'
    : '';
  return L.divIcon({
    className: `custom-leaflet-marker cad-feicao-texto${selecionada ? ' cad-feicao-selecionada' : ''}`,
    iconSize: undefined,
    html: `<span style="${base}${halo}">${escapeHtml(texto)}</span>`
  });
}

/** Bolinha numerada do agrupamento de pontos. */
export function iconeCluster(n: number, estiloCamada: LayerStyleDef): L.DivIcon {
  const tam = n < 10 ? 30 : n < 100 ? 38 : 46;
  const cor = corSegura(estiloCamada.corPrimaria, COR_PADRAO);
  return L.divIcon({
    className: 'custom-leaflet-marker cad-feicao-cluster',
    iconSize: [tam, tam],
    html:
      `<div style="width:${tam}px;height:${tam}px;border-radius:50%;background:${cor};opacity:.9;` +
      `border:2px solid rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;` +
      `color:#fff;font:700 12px sans-serif;text-shadow:0 0 2px #000">${n}</div>`
  });
}

/** Opções de `L.Path` a partir do estilo resolvido pelo motor (mesma tradução nos dois renderizadores). */
export function opcoesPath(e: EstiloVetor, interativo: boolean): L.PathOptions {
  return {
    color: e.cor,
    stroke: e.traco,
    weight: e.peso,
    opacity: e.opacidadeTraco ?? 1,
    dashArray: e.dash,
    dashOffset: e.deslocamentoDash ? String(e.deslocamentoDash) : undefined,
    fill: e.preencher,
    fillColor: e.corPreenchimento,
    fillOpacity: e.opacidadePreenchimento,
    lineCap: e.terminacao ?? 'round',
    lineJoin: e.juncao ?? 'round',
    interactive: interativo
  };
}
