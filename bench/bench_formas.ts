import '../src/canvas';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { CanvasFormas } from '../src/gerencigeo-canvas/renderers/canvas_formas_leaflet';
import type L from 'leaflet';

/*
 * Benchmark de desenho do canvas CAD no navegador (Fase 0 do motor de formas).
 * Mede a MUDANÇA DE VISTA: pan + reconciliação + redesenho, forçado de forma síncrona (rAF por canal de mensagens,
 * definido no HTML, e `getImageData` para esperar a rasterização). Dados sintéticos com semente fixa:
 * 50% polígonos de 14 vértices (~90 m), 25% linhas de 8 vértices, 25% pontos, 5 camadas, bloco de ~13 km.
 * Sem mapa base. Uso: `await __bench.rodar({ tamanhos: [1000, 5000], zooms: [12, 15, 18] })`.
 */

const CENTRO: [number, number] = [-23.5, -46.6];
const MEIO_LAT = 0.06;
const MEIO_LON = 0.065;
const CAMADAS = 5;
const COR_CAMADA = ['#38bdf8', '#f97316', '#22c55e', '#e11d48', '#a855f7'];
const DESLOCAMENTO_PX = 120;

declare global {
  interface Window { __bench: typeof api; __rafOcioso: () => boolean }
}

type Par = [number, number];
interface Gerada { id: string; camadaId: string; centro: Par; geometria: unknown }

function semente(n: number) {
  let s = n >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Mesma distribuição do app: tipos e vértices fixos, posições pela semente. */
export function gerarDados(n: number, seed = 20260101, raioPoligonoM = 45): Gerada[] {
  const rnd = semente(seed);
  const mLat = 1 / 111320;
  const mLon = 1 / (111320 * Math.cos((CENTRO[0] * Math.PI) / 180));
  const saida: Gerada[] = [];
  for (let i = 0; i < n; i++) {
    const lat = CENTRO[0] + (rnd() * 2 - 1) * MEIO_LAT;
    const lon = CENTRO[1] + (rnd() * 2 - 1) * MEIO_LON;
    const camadaId = `bench-${i % CAMADAS}`;
    const tipo = i % 4;
    let geometria: unknown;
    if (tipo < 2) {
      const anel: Par[] = [];
      for (let v = 0; v < 14; v++) {
        const ang = (v / 14) * Math.PI * 2;
        const r = raioPoligonoM * (0.7 + rnd() * 0.3);
        anel.push([lat + Math.sin(ang) * r * mLat, lon + Math.cos(ang) * r * mLon]);
      }
      geometria = { tipo: 'Polygon', aneis: [anel] };
    } else if (tipo === 2) {
      const coords: Par[] = [];
      let la = lat;
      let lo = lon;
      for (let v = 0; v < 8; v++) {
        coords.push([la, lo]);
        la += (rnd() - 0.5) * 40 * mLat;
        lo += (rnd() - 0.2) * 40 * mLon;
      }
      geometria = { tipo: 'LineString', coordenadas: coords };
    } else {
      geometria = { tipo: 'Point', coordenada: [lat, lon] };
    }
    saida.push({ id: `f${i}`, camadaId, centro: [lat, lon], geometria });
  }
  return saida;
}

const tarefa = (): Promise<void> => new Promise((res) => {
  const c = new MessageChannel();
  c.port1.onmessage = () => res();
  c.port2.postMessage(0);
});

/** Espera o rAF simulado esvaziar (duas vezes seguidas, porque um quadro pode agendar outro). */
async function assentar(): Promise<void> {
  let calmas = 0;
  for (let i = 0; i < 200 && calmas < 2; i++) {
    await tarefa();
    calmas = window.__rafOcioso() ? calmas + 1 : 0;
  }
}

function rasterizar(el: UICanvasCAD): number {
  const canvases = el.shadowRoot?.querySelectorAll('canvas') ?? [];
  let n = 0;
  canvases.forEach((c) => {
    if (c.width === 0 || c.height === 0) return;
    n++;
    try { c.getContext('2d')?.getImageData(0, 0, 1, 1); } catch { /* canvas contaminado: ignora */ }
  });
  return n;
}

const mediana = (xs: number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  return o.length === 0 ? NaN : o[Math.floor(o.length / 2)];
};
const arred = (x: number): number => Math.round(x * 10) / 10;

async function criarCanvas(renderizador: 'leaflet' | 'canvas'): Promise<UICanvasCAD> {
  const palco = document.getElementById('palco')!;
  palco.innerHTML = '';
  const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
  el.setAttribute('sem-camadas-padrao', '');
  el.setAttribute('renderizador', renderizador);
  palco.appendChild(el);
  await customElements.whenDefined('ui-canvas-cad');
  el.inicializarAgora();
  await assentar();
  return el;
}

function carregar(el: UICanvasCAD, dados: Gerada[]): number {
  const t0 = performance.now();
  for (let c = 0; c < CAMADAS; c++) {
    const id = `bench-${c}`;
    const feicoes = dados.filter((d) => d.camadaId === id).map((d) => ({
      id: d.id, geometria: d.geometria, propriedades: { n: d.id }
    }));
    el.definirFeicoes(id, feicoes, {
      nome: `Camada ${c}`, zIndex: 600 + c * 10,
      estilo: { corPrimaria: COR_CAMADA[c], espessuraLinha: 1.5, tamanhoMarcador: 6 }
    });
  }
  return performance.now() - t0;
}

function contadores(el: UICanvasCAD): { camadasLeaflet: number; canvases: number; marcasLOD: number; desenhadas: number } {
  const map = el.getMap() as (L.Map & { _layers?: Record<string, unknown> }) | null;
  const camadasLeaflet = map?._layers ? Object.keys(map._layers).length : 0;
  const canvases = Array.from(el.shadowRoot?.querySelectorAll('canvas') ?? []).filter((c) => c.width > 0).length;
  let marcasLOD = 0;
  let desenhadas = 0;
  for (let c = 0; c < CAMADAS; c++) {
    const e = el.estatisticasFeicoes(`bench-${c}`);
    marcasLOD += e?.marcasLOD ?? 0;
    desenhadas += e?.materializadas ?? 0;
  }
  return { camadasLeaflet, canvases, marcasLOD, desenhadas };
}

interface LinhaVista { formas: number; zoom: number; medianaMs: number; minMs: number; maxMs: number; camadasLeaflet: number; canvases: number; marcasLOD: number; desenhadas: number }
interface LinhaOp { formas: number; operacao: string; sincronoMs: number; totalMs: number; itens: number }

async function medirVistas(el: UICanvasCAD, n: number, zooms: number[], repeticoes: number): Promise<LinhaVista[]> {
  const map = el.getMap()!;
  const linhas: LinhaVista[] = [];
  for (const zoom of zooms) {
    map.setView(CENTRO, zoom, { animate: false });
    await assentar();
    rasterizar(el);
    const tempos: number[] = [];
    for (let r = 0; r < repeticoes + 2; r++) {
      const sinal = r % 2 === 0 ? 1 : -1;
      const t0 = performance.now();
      map.panBy([sinal * DESLOCAMENTO_PX, 0], { animate: false });
      await assentar();
      rasterizar(el);
      const dt = performance.now() - t0;
      if (r >= 2) tempos.push(dt);
    }
    const c = contadores(el);
    linhas.push({
      formas: n, zoom, medianaMs: arred(mediana(tempos)), minMs: arred(Math.min(...tempos)), maxMs: arred(Math.max(...tempos)),
      camadasLeaflet: c.camadasLeaflet, canvases: c.canvases, marcasLOD: c.marcasLOD, desenhadas: c.desenhadas
    });
  }
  return linhas;
}

async function medirOperacoes(el: UICanvasCAD, dados: Gerada[], n: number): Promise<LinhaOp[]> {
  const map = el.getMap()!;
  map.setView(CENTRO, 14, { animate: false });
  await assentar();
  rasterizar(el);
  const b = map.getBounds();
  const naTela = dados.filter((d) => b.contains(d.centro));
  const linhas: LinhaOp[] = [];

  const medir = async (operacao: string, itens: number, acao: () => void): Promise<void> => {
    const t0 = performance.now();
    acao();
    const sincronoMs = performance.now() - t0;
    await assentar();
    rasterizar(el);
    linhas.push({ formas: n, operacao, sincronoMs: arred(sincronoMs), totalMs: arred(performance.now() - t0), itens });
  };

  const um = naTela[Math.floor(naTela.length / 2)];
  if (um) {
    await medir('selecionar 1', 1, () => el.selecionarFeicoes([{ camadaId: um.camadaId, id: um.id }]));
    await medir('limpar seleção (1)', 1, () => el.limparSelecaoFeicoes());
  }
  const muitas = naTela.slice(0, 2000);
  await medir('selecionar 2000', muitas.length, () => el.selecionarFeicoes(muitas.map((d) => ({ camadaId: d.camadaId, id: d.id }))));
  await medir('limpar seleção (2000)', muitas.length, () => el.limparSelecaoFeicoes());
  await medir('ocultar camada', 1, () => el.setLayerVisibility('bench-0', false));
  await medir('exibir camada', 1, () => el.setLayerVisibility('bench-0', true));
  return linhas;
}

function tabela(vistas: LinhaVista[], ops: LinhaOp[]): string {
  const l1 = ['formas | zoom | mediana ms | min | max | camadas Leaflet | canvases | desenhadas | marcas LOD'];
  for (const v of vistas) l1.push(`${v.formas} | ${v.zoom} | ${v.medianaMs} | ${v.minMs} | ${v.maxMs} | ${v.camadasLeaflet} | ${v.canvases} | ${v.desenhadas} | ${v.marcasLOD}`);
  const l2 = ['formas | operação | síncrono ms | total ms | itens'];
  for (const o of ops) l2.push(`${o.formas} | ${o.operacao} | ${o.sincronoMs} | ${o.totalMs} | ${o.itens}`);
  return `${l1.join('\n')}\n\n${l2.join('\n')}`;
}

const api = {
  gerarDados,
  /** `await __bench.rodar({ tamanhos: [1000, 20000], zooms: [12, 15, 18], repeticoes: 5, operacoes: true, raioPoligonoM: 45, renderizador: 'canvas' })` */
  async rodar(cfg: { tamanhos?: number[]; zooms?: number[]; repeticoes?: number; operacoes?: boolean; raioPoligonoM?: number; renderizador?: 'leaflet' | 'canvas' } = {}) {
    const tamanhos = cfg.tamanhos ?? [1000, 5000, 20000];
    const zooms = cfg.zooms ?? [12, 15, 18];
    const repeticoes = cfg.repeticoes ?? 5;
    const vistas: LinhaVista[] = [];
    const ops: LinhaOp[] = [];
    const cargas: Array<{ formas: number; carregarMs: number }> = [];
    const saida = document.getElementById('saida');
    for (const n of tamanhos) {
      const dados = gerarDados(n, 20260101, cfg.raioPoligonoM ?? 45);
      const el = await criarCanvas(cfg.renderizador ?? 'leaflet');
      const carregarMs = arred(carregar(el, dados));
      await assentar();
      cargas.push({ formas: n, carregarMs });
      vistas.push(...(await medirVistas(el, n, zooms, repeticoes)));
      if (cfg.operacoes !== false) ops.push(...(await medirOperacoes(el, dados, n)));
      if (saida) saida.textContent = tabela(vistas, ops);
      el.destroy();
    }
    const texto = tabela(vistas, ops);
    if (saida) saida.textContent = texto;
    return { cargas, vistas, ops, texto };
  },
  intercalado,
  limites,
  protocoloGPU,
  contadores
};

// ---------------------------------------------------------------- medições intercaladas (comparação justa)

interface ConfigIntercalada { nome: string; renderizador: 'leaflet' | 'canvas'; limiteRepintar?: number }
interface OpcoesIntercalado { tamanhos?: number[]; zooms?: number[]; voltas?: number; repeticoes?: number; operacoes?: boolean }

const fmt = (x: number): string => (Number.isFinite(x) ? String(Math.round(x)) : '-');

/**
 * Roda as configurações alternadas na mesma página (config A, B, C, A, B, C...), `voltas` vezes por tamanho: a carga da
 * máquina muda ao longo de minutos e rodadas separadas não se comparam. Devolve uma tabela Markdown.
 */
async function medirIntercalado(configs: ConfigIntercalada[], cfg: OpcoesIntercalado, titulo: string): Promise<string> {
  const tamanhos = cfg.tamanhos ?? [1000, 20000, 50000, 100000];
  const zooms = cfg.zooms ?? [12, 15, 18];
  const voltas = cfg.voltas ?? 2;
  const saida = document.getElementById('saida');
  const limiteOriginal = CanvasFormas.limiteRepintar;
  const vistas = new Map<string, { itens: number; ms: Record<string, number[]> }>();
  const ops = new Map<string, Record<string, number[]>>();
  const montar = (): string => {
    const cab = `| Formas | zoom | itens/camada | ${configs.map((c) => c.nome).join(' | ')} |`;
    const sep = `|---|---|---|${configs.map(() => '---').join('|')}|`;
    const linhas = [...vistas].map(([k, v]) => {
      const [n, z] = k.split('|');
      return `| ${n} | ${z} | ${fmt(v.itens / CAMADAS)} | ${configs.map((c) => (v.ms[c.nome] ?? []).map(fmt).join(', ')).join(' | ')} |`;
    });
    let texto = `${titulo}\nMediana em ms de cada volta (${voltas} ${voltas === 1 ? 'volta' : 'voltas'}, configurações alternadas). Data: ${new Date().toLocaleString('pt-BR')}. ` +
      `UA: ${navigator.userAgent}\n\n${[cab, sep, ...linhas].join('\n')}`;
    if (ops.size > 0) {
      const cabO = `| Formas | operação (síncrono, ms) | ${configs.map((c) => c.nome).join(' | ')} |`;
      const sepO = `|---|---|${configs.map(() => '---').join('|')}|`;
      const linhasO = [...ops].map(([k, v]) => {
        const [n, op] = k.split('|');
        return `| ${n} | ${op} | ${configs.map((c) => (v[c.nome] ?? []).map((x) => String(arred(x))).join(', ')).join(' | ')} |`;
      });
      texto += `\n\n${[cabO, sepO, ...linhasO].join('\n')}`;
    }
    return texto;
  };
  try {
    for (const n of tamanhos) {
      for (let volta = 0; volta < voltas; volta++) {
        for (const c of configs) {
          CanvasFormas.limiteRepintar = c.limiteRepintar ?? limiteOriginal;
          if (saida) saida.textContent = `${montar()}\n\nmedindo ${n} formas, volta ${volta + 1}/${voltas}, ${c.nome}…`;
          const r = await api.rodar({ tamanhos: [n], zooms, repeticoes: cfg.repeticoes ?? 5, operacoes: !!cfg.operacoes && volta === 0, renderizador: c.renderizador });
          for (const v of r.vistas) {
            const k = `${n}|${v.zoom}`;
            const linha = vistas.get(k) ?? { itens: 0, ms: {} };
            if (c.renderizador === 'canvas') linha.itens = v.desenhadas + v.marcasLOD;
            (linha.ms[c.nome] ??= []).push(v.medianaMs);
            vistas.set(k, linha);
          }
          for (const o of r.ops) {
            const k = `${n}|${o.operacao}`;
            const linha = ops.get(k) ?? {};
            (linha[c.nome] ??= []).push(o.sincronoMs);
            ops.set(k, linha);
          }
        }
      }
    }
  } finally {
    CanvasFormas.limiteRepintar = limiteOriginal;
  }
  const texto = montar();
  if (saida) saida.textContent = texto;
  return texto;
}

/** Canvas (limite padrão) × leaflet, intercalados. `await __bench.intercalado({ tamanhos: [1000, 20000, 50000, 100000] })` */
function intercalado(cfg: OpcoesIntercalado = {}): Promise<string> {
  return medirIntercalado(
    [{ nome: 'canvas', renderizador: 'canvas' }, { nome: 'leaflet', renderizador: 'leaflet' }],
    { operacoes: true, ...cfg },
    `## Canvas (limiteRepintar = ${CanvasFormas.limiteRepintar}) × leaflet`
  );
}

/**
 * Escolha do limite de repintura: sempre deslocar (0), sempre repintar (∞) e leaflet, intercalados. O ponto de equilíbrio
 * entre as duas primeiras colunas, em "itens/camada", é o limite. `await __bench.limites()`
 */
function limites(cfg: OpcoesIntercalado = {}): Promise<string> {
  return medirIntercalado(
    [
      { nome: 'sempre desloca', renderizador: 'canvas', limiteRepintar: 0 },
      { nome: 'sempre repinta', renderizador: 'canvas', limiteRepintar: Number.POSITIVE_INFINITY },
      { nome: 'leaflet', renderizador: 'leaflet' }
    ],
    cfg,
    '## Limite de repintura: deslocar × repintar × leaflet'
  );
}

/** As duas medições em sequência (~15–25 min). Recarregue a página antes: a aba acumula memória entre rodadas. */
async function protocoloGPU(cfg: OpcoesIntercalado = {}): Promise<string> {
  const a = await intercalado(cfg);
  const b = await limites(cfg);
  const texto = `${a}\n\n${b}`;
  const saida = document.getElementById('saida');
  if (saida) saida.textContent = texto;
  return texto;
}

window.__bench = api;
const saidaInicial = document.getElementById('saida');
if (saidaInicial) saidaInicial.textContent = 'Pronto. Use os botões acima ou o console: await __bench.protocoloGPU(), __bench.intercalado(), __bench.limites(), __bench.rodar({ ... })';

// botões da página (opcionais: o HTML antigo sem eles continua funcionando pelo console)
const ocupados = new Set<HTMLButtonElement>();
function botao(id: string, acao: () => Promise<unknown>): void {
  const b = document.getElementById(id) as HTMLButtonElement | null;
  if (!b) return;
  b.onclick = async () => {
    if (ocupados.size > 0) return; // uma medição por vez
    ocupados.add(b);
    document.querySelectorAll<HTMLButtonElement>('#acoes button[data-medicao]').forEach((x) => { x.disabled = true; });
    try { await acao(); } catch (e) {
      const s = document.getElementById('saida');
      if (s) s.textContent = `Falhou: ${String(e)}`;
    } finally {
      ocupados.delete(b);
      document.querySelectorAll<HTMLButtonElement>('#acoes button[data-medicao]').forEach((x) => { x.disabled = false; });
    }
  };
}
botao('b-protocolo', () => api.protocoloGPU());
botao('b-intercalado', () => api.intercalado());
botao('b-limites', () => api.limites());
botao('b-rapido', () => api.intercalado({ tamanhos: [1000, 20000], voltas: 1, operacoes: false }));
const copiar = document.getElementById('b-copiar');
if (copiar) copiar.onclick = () => {
  const texto = document.getElementById('saida')?.textContent ?? '';
  navigator.clipboard?.writeText(texto).then(
    () => { copiar.textContent = 'Copiado'; setTimeout(() => { copiar.textContent = 'Copiar resultado'; }, 1500); },
    () => { copiar.textContent = 'Sem permissão: selecione o texto'; }
  );
};
