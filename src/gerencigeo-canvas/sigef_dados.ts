/**
 * Dados do SIGEF (parcelas certificadas do INCRA): URL da consulta, proxy e normalização das parcelas.
 * Funções puras, sem DOM e sem Leaflet: o kit busca e organiza os dados; quem monta o popup é o consumidor
 * (evento `ui-sigef-parcelas` do `<ui-canvas-cad>` com o atributo `sem-popup-sigef`).
 */
import { SIGEF_WMS_URL, SIGEF_WMS_CAMADA } from './sigef_config';

export { SIGEF_WMS_URL, SIGEF_WMS_CAMADA };

/** Uma parcela certificada devolvida pelo Geoportal do INCRA. */
export interface ParcelaSigef {
  /** UUID oficial da parcela (`parcela_codigo`); vazio se o INCRA não o informou. Abre `sigef.incra.gov.br/geo/parcela/detalhe/<codigo>/`. */
  codigo: string;
  /** `nome_area` ou `nome_imovel`; "Imóvel Sem Nome" se nenhum veio. */
  nome: string;
  /** Propriedades originais do GeoServer (área, matrícula, situação, ART, RT, data de submissão...). */
  props: Record<string, any>;
  /** Geometria GeoJSON da parcela, quando o GeoServer a devolve. */
  geometria: any | null;
}

export type EstadoConsultaSigef = 'consultando' | 'concluida' | 'erro';

/** `detail` do evento `ui-sigef-parcelas` (emitido com o atributo `sem-popup-sigef`). */
export interface SigefParcelasDetail {
  estado: EstadoConsultaSigef;
  /** Ponto clicado no mapa. */
  latlng: { lat: number; lng: number };
  /** Ponto clicado em pixels do container do mapa. */
  ponto: { x: number; y: number };
  /** Parcelas sob o ponto (só em `concluida`; vazio nos demais). Vazia em `concluida` = nenhum imóvel certificado ali. */
  parcelas: ParcelaSigef[];
  /** Motivo da falha (só em `erro`). */
  mensagem?: string;
}

/** URL do GetFeatureInfo (GeoJSON) do Geoportal para o pixel (x, y) do mapa. */
export function montarUrlConsultaSigef(x: number, y: number, size: { x: number; y: number }, bbox: string): string {
  return `${SIGEF_WMS_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FORMAT=image/png&TRANSPARENT=true`
    + `&QUERY_LAYERS=${SIGEF_WMS_CAMADA}&LAYERS=${SIGEF_WMS_CAMADA}&FEATURE_COUNT=10&INFO_FORMAT=application/json`
    + `&X=${x}&Y=${y}&WIDTH=${size.x}&HEIGHT=${size.y}&SRS=EPSG:4326&BBOX=${bbox}`;
}

/** Em localhost a consulta passa pela API local (`<apiBase>/proxy/sigef`); fora dele, pelo `api.php` da própria origem. */
export function urlProxySigef(targetUrl: string, apiBaseUrl: string, origem: string = typeof window !== 'undefined' ? window.location.origin : ''): string {
  const local = origem.includes('localhost') || origem.includes('127.0.0.1') || origem.includes('[::1]');
  return local
    ? `${apiBaseUrl}/proxy/sigef?url=${encodeURIComponent(targetUrl)}`
    : `${origem}/api.php?action=proxy_sigef&url=${encodeURIComponent(targetUrl)}`;
}

/**
 * UUID oficial da parcela. O `id` da feição do GeoServer é a chave interna `sigef_geo.N`, que não abre no SIGEF:
 * só vale como último recurso e quando não tiver esse prefixo.
 */
export function extrairCodigoParcelaSigef(feature: any): string {
  const props = feature?.properties ?? {};
  const id = feature?.id;
  const idUtil = id != null && !String(id).startsWith('sigef_geo.') ? String(id) : '';
  return String(props.parcela_codigo || props.co_parcela || props.id_parcela || idUtil || '').trim();
}

/** Parcelas de uma resposta GeoJSON do Geoportal (o ponto pode cair em mais de uma). Sem duplicadas, nunca lança. */
export function extrairParcelasSigef(data: unknown): ParcelaSigef[] {
  const features = data && typeof data === 'object' && Array.isArray((data as any).features) ? (data as any).features : [];
  const vistos = new Set<string>();
  const parcelas: ParcelaSigef[] = [];
  features.forEach((feat: any, i: number) => {
    const props = feat?.properties;
    if (!props || typeof props !== 'object' || Object.keys(props).length === 0) return;
    const codigo = extrairCodigoParcelaSigef(feat);
    const chave = codigo || `sem-id-${i}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    parcelas.push({
      codigo,
      nome: String(props.nome_area || props.nome_imovel || 'Imóvel Sem Nome'),
      props,
      geometria: feat.geometry ?? null,
    });
  });
  return parcelas;
}
