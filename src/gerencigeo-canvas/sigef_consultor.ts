import L from 'leaflet';
import { escapeHtml } from './utils';
import { liberarPopups } from './popup_gate';
import { montarUrlConsultaSigef, urlProxySigef, extrairParcelasSigef, type ParcelaSigef, type SigefParcelasDetail } from './sigef_dados';

export interface SigefConsultorState {
  currentAbortController?: AbortController;
}

/** Pixel do container do mapa onde o clique ocorreu (0,0 se o evento não traz coordenadas válidas). */
export function pontoDoClique(map: L.Map, e: L.LeafletMouseEvent): { x: number; y: number } {
  try {
    if (e.containerPoint) return { x: Math.round(e.containerPoint.x), y: Math.round(e.containerPoint.y) };
    if (e.layerPoint) {
      const cp = map.layerPointToContainerPoint(e.layerPoint);
      return { x: Math.round(cp.x), y: Math.round(cp.y) };
    }
  } catch {
    // evento sem ponto utilizável
  }
  return { x: 0, y: 0 };
}

export interface ConsultaSigefOpcoes {
  signal?: AbortSignal;
  /** Padrão 8000 ms. */
  timeoutMs?: number;
}

/**
 * Consulta as parcelas SIGEF sob o pixel `ponto` do mapa e devolve os dados (sem popup, sem DOM).
 * Rejeita com `AbortError` se `signal` abortar, e com mensagem clara em timeout, erro HTTP ou resposta inválida.
 * Lista vazia = nenhum imóvel certificado naquele ponto.
 */
export async function consultarSigefParcelas(
  map: L.Map,
  ponto: { x: number; y: number },
  apiBaseUrl: string,
  opcoes: ConsultaSigefOpcoes = {}
): Promise<ParcelaSigef[]> {
  const { signal, timeoutMs = 8000 } = opcoes;
  const size = map.getSize();
  const sw = map.getBounds().getSouthWest();
  const ne = map.getBounds().getNorthEast();
  const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
  const alvo = montarUrlConsultaSigef(Math.round(ponto.x), Math.round(ponto.y), size, bbox);

  const controller = new AbortController();
  let expirou = false;
  const timer = setTimeout(() => { expirou = true; controller.abort(); }, timeoutMs);
  const repassar = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', repassar, { once: true });
  }

  try {
    const res = await fetch(urlProxySigef(alvo, apiBaseUrl), { signal: controller.signal });
    const texto = await res.text();
    let dados: any = null;
    try { dados = JSON.parse(texto); } catch { /* corpo não-JSON */ }
    if (!res.ok) {
      const detalhe = dados?.detail || dados?.error;
      throw new Error(typeof detalhe === 'string' && detalhe ? detalhe : `HTTP ${res.status}`);
    }
    if (!dados || (dados.error && !Array.isArray(dados.features))) {
      throw new Error(typeof dados?.error === 'string' ? dados.error : 'O INCRA devolveu uma resposta inesperada.');
    }
    return extrairParcelasSigef(dados);
  } catch (err: any) {
    if (err?.name === 'AbortError' && expirou) {
      throw new Error(`Tempo limite de consulta ao INCRA esgotado (${Math.round(timeoutMs / 1000)}s).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', repassar);
  }
}

/**
 * Consulta do popup interno do kit (padrão do `<ui-canvas-cad>`): mostra a primeira parcela com links de shapefile
 * e o botão de importar (evento `gerencigeo:importar_vizinho_sigef`). Quem quer montar o próprio popup usa o
 * atributo `sem-popup-sigef` e o evento `ui-sigef-parcelas` (`SigefParcelasDetail`).
 */
export async function consultarSigefNoPonto(
  map: L.Map,
  e: L.LeafletMouseEvent,
  apiBaseUrl: string,
  state: SigefConsultorState
): Promise<void> {
  const ponto = pontoDoClique(map, e);

  const mapContainer = map.getContainer();
  mapContainer.style.cursor = 'wait';

  const loadingPopup = L.popup({
    className: 'compact-sigef-popup',
    maxWidth: 250
  })
    .setLatLng(e.latlng)
    .setContent(`
      <div style="font-family:var(--ui-fonte-base, sans-serif); display:flex; align-items:center; gap:8px; color:rgba(255,255,255,0.9); font-size:12px;">
        <svg style="animation:spin 1s linear infinite; width:14px; height:14px; flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" stroke-width="4" fill="none"></circle>
          <path fill="#00f5a0" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Consultando...
      </div>
    `);
  // a consulta SIGEF é um pedido explícito (clique com a camada ativa): o popup abre mesmo com o portão fechado
  liberarPopups(map, () => loadingPopup.openOn(map));

  if (state.currentAbortController) {
    state.currentAbortController.abort();
  }
  state.currentAbortController = new AbortController();
  const abortSignal = state.currentAbortController.signal;

  try {
    const parcelas = await consultarSigefParcelas(map, ponto, apiBaseUrl, { signal: abortSignal });

    if (parcelas.length > 0) {
      const props = parcelas[0].props;
      const rawUuid = parcelas[0].codigo;
      const nomeArea = parcelas[0].nome;

      if (rawUuid) {
        const safeUuid = encodeURIComponent(rawUuid);
        const downloadUrl = `https://sigef.incra.gov.br/geo/exportar/parcela/shp/${safeUuid}/`;
        const sigefConsultarUrl = `https://sigef.incra.gov.br/geo/parcela/detalhe/${safeUuid}/`;

        const popupContainer = document.createElement('div');
        popupContainer.style.cssText = 'font-family:var(--ui-fonte-base, sans-serif); color:rgba(255, 255, 255, 0.9); line-height:1.4; min-width:180px;';
        popupContainer.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding-bottom:5px; border-bottom:1px solid rgba(255, 255, 255, 0.1);">
            <span style="font-weight:700; font-size:11px; color:#10b981; text-transform:uppercase; letter-spacing:0.5px;">SIGEF</span>
            <span style="font-size:10px; color:rgba(255, 255, 255, 0.5);">${escapeHtml(props.situacao_informada || props.status || 'Certificada')}</span>
          </div>
          <div style="font-weight:700; font-size:12px; margin-bottom:4px; color:#ffffff; word-break:break-word;">${escapeHtml(nomeArea)}</div>
          <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:2px;">Cód: <span style="font-family:var(--ui-fonte-codigo, monospace);">${escapeHtml(props.codigo_imovel || 'N/A')}</span></div>
          <div style="display:flex; gap:12px; font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:6px;">
            <span>Mat: <strong style="color:#ffffff;">${escapeHtml(props.registro_matricula || props.matricula || 'N/A')}</strong></span>
            <span>${escapeHtml(props.data_submissao || '')}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:5px; padding-top:6px; border-top:1px solid rgba(255, 255, 255, 0.1);">
            <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; justify-content:center; gap:5px; padding:5px 8px; background:rgba(16, 185, 129, 0.15); border:1px solid rgba(16, 185, 129, 0.3); color:#34d399; font-size:11px; font-weight:700; border-radius:5px; text-decoration:none; cursor:pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Baixar Shapefile
            </a>
            <button class="btn-importar-confrontante-sigef" style="display:flex; align-items:center; justify-content:center; gap:5px; padding:5px 8px; background:rgba(14, 165, 233, 0.15); border:1px solid rgba(14, 165, 233, 0.3); color:#38bdf8; font-size:11px; font-weight:700; border-radius:5px; cursor:pointer; width:100%; text-align:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Importar Confrontante (CSV)
            </button>
            <a href="${sigefConsultarUrl}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; justify-content:center; gap:4px; padding:4px 6px; background:rgba(255, 255, 255, 0.05); border:1px solid rgba(255, 255, 255, 0.1); color:rgba(255, 255, 255, 0.7); font-size:10px; font-weight:600; border-radius:5px; text-decoration:none; cursor:pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Abrir no SIGEF
            </a>
          </div>
        `;

        const btnImportar = popupContainer.querySelector('.btn-importar-confrontante-sigef');
        if (btnImportar) {
          btnImportar.addEventListener('click', () => {
            window.dispatchEvent(
              new CustomEvent('gerencigeo:importar_vizinho_sigef', {
                detail: { uuid: rawUuid, nome: nomeArea }
              })
            );
          });
        }

        loadingPopup.setContent(popupContainer);
      } else {
        loadingPopup.setContent(`
          <div style="font-family:var(--ui-fonte-base, sans-serif); font-size:12px; color:#b45309; padding:2px 0;">
            Lote identificado, mas código da parcela indisponível.
          </div>
        `);
      }
    } else {
      loadingPopup.setContent(`
        <div style="font-family:var(--ui-fonte-base, sans-serif); font-size:12px; color:rgba(255, 255, 255, 0.7); padding:2px 0;">
          Nenhum imóvel SIGEF certificado neste ponto.
        </div>
      `);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      loadingPopup.setContent(`
        <div style="font-family:var(--ui-fonte-base, sans-serif); font-size:12px; color:#f59e0b; padding:2px 0;">
          Consulta cancelada ou tempo limite de resposta esgotado.
        </div>
      `);
    } else {
      console.warn('Erro ao consultar SIGEF:', err);
      loadingPopup.setContent(`
        <div style="font-family:var(--ui-fonte-base, sans-serif); font-size:12px; color:#f59e0b; padding:2px 0;">
          Serviço de consulta SIGEF indisponível nesta área.
        </div>
      `);
    }
  } finally {
    mapContainer.style.cursor = '';
  }
}

/**
 * Consulta para o consumidor montar o próprio popup (atributo `sem-popup-sigef`): não abre popup nenhum e avisa
 * `aoParcelas` em cada etapa (`consultando` → `concluida` | `erro`). Um clique novo cancela o anterior em silêncio.
 */
export async function consultarSigefParaEvento(
  map: L.Map,
  e: L.LeafletMouseEvent,
  apiBaseUrl: string,
  state: SigefConsultorState,
  aoParcelas: (detalhe: SigefParcelasDetail) => void
): Promise<void> {
  const ponto = pontoDoClique(map, e);
  const latlng = { lat: e.latlng.lat, lng: e.latlng.lng };

  state.currentAbortController?.abort();
  const controle = new AbortController();
  state.currentAbortController = controle;
  const substituida = () => state.currentAbortController !== controle;

  aoParcelas({ estado: 'consultando', latlng, ponto, parcelas: [] });
  try {
    const parcelas = await consultarSigefParcelas(map, ponto, apiBaseUrl, { signal: controle.signal });
    if (substituida()) return;
    aoParcelas({ estado: 'concluida', latlng, ponto, parcelas });
  } catch (err: any) {
    if (substituida() || err?.name === 'AbortError') return;
    aoParcelas({ estado: 'erro', latlng, ponto, parcelas: [], mensagem: String(err?.message || err || 'Falha na consulta ao SIGEF.') });
  } finally {
    if (state.currentAbortController === controle) state.currentAbortController = undefined;
  }
}
