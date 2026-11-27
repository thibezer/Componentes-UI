import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  extrairParcelasSigef, extrairCodigoParcelaSigef, montarUrlConsultaSigef, urlProxySigef,
  SIGEF_WMS_URL, SIGEF_WMS_CAMADA,
} from './sigef_dados';
import { consultarSigefParcelas } from './sigef_consultor';
import { MapaCore } from './mapa_core';

const GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      id: 'sigef_geo.1',
      geometry: { type: 'Polygon', coordinates: [[[-53.3, -23.6], [-53.29, -23.6], [-53.29, -23.59], [-53.3, -23.6]]] },
      properties: { parcela_codigo: 'uuid-1', nome_area: 'Fazenda A', area_hectares: 4.8421, registro_matricula: '24949' },
    },
    { id: 'sigef_geo.2', properties: { parcela_codigo: 'uuid-1', nome_area: 'duplicada' } },
    { id: 'sigef_geo.3', properties: { co_parcela: 'uuid-3', nome_imovel: 'Sítio B' } },
  ],
};

const mapaFalso = () => ({
  getSize: () => ({ x: 800, y: 600 }),
  getBounds: () => ({ getSouthWest: () => ({ lat: -24, lng: -54 }), getNorthEast: () => ({ lat: -23, lng: -53 }) }),
  latLngToContainerPoint: () => ({ x: 100.4, y: 200.6 }),
  getContainer: () => document.createElement('div'),
});

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('sigef_dados: URL e proxy', () => {
  it('monta o GetFeatureInfo do Geoportal em JSON', () => {
    const url = montarUrlConsultaSigef(10, 20, { x: 800, y: 600 }, '-54,-24,-53,-23');
    expect(url.startsWith(`${SIGEF_WMS_URL}?`)).toBe(true);
    expect(url).toContain(`QUERY_LAYERS=${SIGEF_WMS_CAMADA}`);
    expect(url).toContain('INFO_FORMAT=application/json');
    expect(url).not.toContain('acervofundiario');
  });

  it('usa o proxy da API em localhost e o api.php fora dele', () => {
    expect(urlProxySigef('https://x/y?a=1', '/api', 'http://localhost:5173')).toBe('/api/proxy/sigef?url=' + encodeURIComponent('https://x/y?a=1'));
    expect(urlProxySigef('https://x/y', '/api', 'http://127.0.0.1:8000')).toContain('/api/proxy/sigef?url=');
    expect(urlProxySigef('https://x/y', '/api', 'https://meusite.com')).toBe('https://meusite.com/api.php?action=proxy_sigef&url=' + encodeURIComponent('https://x/y'));
  });
});

describe('sigef_dados: extração das parcelas', () => {
  it('normaliza o código (parcela_codigo/co_parcela/id_parcela), o nome, a geometria e remove duplicadas', () => {
    const p = extrairParcelasSigef(GEOJSON);
    expect(p.map((x) => x.codigo)).toEqual(['uuid-1', 'uuid-3']);
    expect(p[0].nome).toBe('Fazenda A');
    expect(p[0].geometria).toMatchObject({ type: 'Polygon' });
    expect(p[0].props.registro_matricula).toBe('24949');
    expect(p[1].nome).toBe('Sítio B');
    expect(p[1].geometria).toBeNull();
  });

  it('ignora o id interno sigef_geo.N como código', () => {
    expect(extrairCodigoParcelaSigef({ id: 'sigef_geo.9', properties: {} })).toBe('');
    expect(extrairCodigoParcelaSigef({ id: 'uuid-direto', properties: {} })).toBe('uuid-direto');
    expect(extrairCodigoParcelaSigef({ id: 'sigef_geo.9', properties: { parcela_codigo: 'ok' } })).toBe('ok');
  });

  it('entradas hostis devolvem lista vazia sem lançar', () => {
    for (const entrada of [null, undefined, 'texto', 42, {}, { features: null }, { features: [null, 1, {}, { properties: null }] }]) {
      expect(extrairParcelasSigef(entrada)).toEqual([]);
    }
    expect(extrairCodigoParcelaSigef(null)).toBe('');
  });

  it('feição sem código mantém nome e propriedades (código vazio)', () => {
    const p = extrairParcelasSigef({ features: [{ properties: { nome_area: 'Sem código' } }] });
    expect(p).toHaveLength(1);
    expect(p[0].codigo).toBe('');
    expect(p[0].nome).toBe('Sem código');
  });
});

describe('consultarSigefParcelas', () => {
  it('consulta o proxy e devolve as parcelas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(GEOJSON) });
    vi.stubGlobal('fetch', fetchMock);
    const parcelas = await consultarSigefParcelas(mapaFalso() as any, { x: 10, y: 20 }, '/api');
    expect(parcelas).toHaveLength(2);
    const chamada = String(fetchMock.mock.calls[0][0]);
    expect(decodeURIComponent(chamada)).toContain('geoportal.incra.gov.br');
    expect(decodeURIComponent(chamada)).toContain('X=10&Y=20&WIDTH=800&HEIGHT=600');
  });

  it('erro HTTP vira exceção com o detalhe do servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => JSON.stringify({ detail: 'Falha de comunicação com o INCRA.' }) }));
    await expect(consultarSigefParcelas(mapaFalso() as any, { x: 1, y: 1 }, '/api')).rejects.toThrow('Falha de comunicação com o INCRA.');
  });

  it('resposta {error} sem features vira exceção (não "nenhum imóvel")', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ error: 'Resposta não é JSON' }) }));
    await expect(consultarSigefParcelas(mapaFalso() as any, { x: 1, y: 1 }, '/api')).rejects.toThrow();
  });

  it('timeout aborta com mensagem clara', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_u: string, init: any) => new Promise((_r, rej) => {
      init.signal.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' })));
    })));
    const p = consultarSigefParcelas(mapaFalso() as any, { x: 1, y: 1 }, '/api', { timeoutMs: 500 });
    const esperado = expect(p).rejects.toThrow(/Tempo limite/);
    await vi.advanceTimersByTimeAsync(600);
    await esperado;
    vi.useRealTimers();
  });

  it('abort do chamador rejeita com AbortError', async () => {
    vi.stubGlobal('fetch', vi.fn((_u: string, init: any) => new Promise((_r, rej) => {
      init.signal.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' })));
    })));
    const ctrl = new AbortController();
    const p = consultarSigefParcelas(mapaFalso() as any, { x: 1, y: 1 }, '/api', { signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('MapaCore: popup do SIGEF externo (o app monta o popup)', () => {
  const clique = { latlng: { lat: -23.6, lng: -53.3 }, containerPoint: { x: 10, y: 20 } } as any;

  it('com sigefPopup=false não abre popup e avisa consultando → concluida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(GEOJSON) }));
    const core = new MapaCore({}) as any;
    core.map = mapaFalso();
    core.sigefPopup = false;
    const eventos: any[] = [];
    core.aoParcelasSigef = (d: any) => eventos.push(d);
    await core.consultarSigef(clique);
    expect(eventos.map((e) => e.estado)).toEqual(['consultando', 'concluida']);
    expect(eventos[1].parcelas).toHaveLength(2);
    expect(eventos[1].latlng).toEqual({ lat: -23.6, lng: -53.3 });
  });

  it('falha de rede avisa estado erro com mensagem', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede caiu')));
    const core = new MapaCore({}) as any;
    core.map = mapaFalso();
    core.sigefPopup = false;
    const eventos: any[] = [];
    core.aoParcelasSigef = (d: any) => eventos.push(d);
    await core.consultarSigef(clique);
    expect(eventos.map((e) => e.estado)).toEqual(['consultando', 'erro']);
    expect(eventos[1].mensagem).toContain('rede caiu');
  });

  it('novo clique cancela a consulta anterior sem avisar cancelamento como erro', async () => {
    let resolver: (v: any) => void = () => {};
    const fetchMock = vi.fn()
      .mockImplementationOnce((_u: string, init: any) => new Promise((_r, rej) => {
        init.signal.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' })));
      }))
      .mockImplementationOnce(() => new Promise((r) => { resolver = r; }));
    vi.stubGlobal('fetch', fetchMock);
    const core = new MapaCore({}) as any;
    core.map = mapaFalso();
    core.sigefPopup = false;
    const eventos: any[] = [];
    core.aoParcelasSigef = (d: any) => eventos.push(d);
    const a = core.consultarSigef(clique);
    const b = core.consultarSigef(clique);
    resolver({ ok: true, status: 200, text: async () => JSON.stringify(GEOJSON) });
    await Promise.all([a, b]);
    expect(eventos.filter((e) => e.estado === 'erro')).toHaveLength(0);
    expect(eventos.filter((e) => e.estado === 'concluida')).toHaveLength(1);
  });
});
