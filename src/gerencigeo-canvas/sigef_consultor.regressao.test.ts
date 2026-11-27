import { describe, it, expect } from 'vitest';
import { SIGEF_WMS_URL, SIGEF_WMS_CAMADA } from './sigef_config';
import { montarUrlConsultaSigef, extrairCodigoParcelaSigef } from './sigef_consultor';
import { WmsLayerRenderer } from './renderers/wms_renderer';
import type { CanvasLayerDef } from './types';

describe('SIGEF: servidor oficial do INCRA (Geoportal)', () => {
  it('consulta o GeoServer do Geoportal, não o i3Geo desativado (acervofundiario)', () => {
    const url = montarUrlConsultaSigef(10, 20, { x: 800, y: 600 }, '-50,-24,-49,-23');
    expect(url.startsWith(`${SIGEF_WMS_URL}?`)).toBe(true);
    expect(url).not.toContain('acervofundiario');
    expect(url).not.toContain('certificada_sigef_particular_pr');
    expect(url).toContain(`QUERY_LAYERS=${SIGEF_WMS_CAMADA}`);
    expect(url).toContain('INFO_FORMAT=application/json');
    expect(url).toContain('X=10&Y=20&WIDTH=800&HEIGHT=600');
    expect(url).toContain('BBOX=-50,-24,-49,-23');
  });

  it('a camada WMS sem `dados` usa o Geoportal por padrão', () => {
    const def = { id: 'sigef', nome: 'SIGEF', tipo: 'wms' } as unknown as CanvasLayerDef;
    const layer: any = new WmsLayerRenderer().render(def, {} as any, {} as any);
    expect(layer._url).toBe(SIGEF_WMS_URL);
    expect(layer.wmsParams.layers).toBe(SIGEF_WMS_CAMADA);
  });

  it('respeita url/layers informados em `dados`', () => {
    const def = { id: 'sigef', tipo: 'wms', dados: { url: 'https://x.test/wms', layers: 'a:b' } } as unknown as CanvasLayerDef;
    const layer: any = new WmsLayerRenderer().render(def, {} as any, {} as any);
    expect(layer._url).toBe('https://x.test/wms');
    expect(layer.wmsParams.layers).toBe('a:b');
  });
});

describe('SIGEF: código da parcela', () => {
  it('prioriza parcela_codigo e ignora o id interno "sigef_geo.N" do GeoServer', () => {
    expect(extrairCodigoParcelaSigef({ id: 'sigef_geo.123', properties: { parcela_codigo: 'abc-uuid' } })).toBe('abc-uuid');
  });

  it('usa co_parcela / id_parcela quando não há parcela_codigo', () => {
    expect(extrairCodigoParcelaSigef({ id: 'sigef_geo.1', properties: { co_parcela: 'co-1' } })).toBe('co-1');
    expect(extrairCodigoParcelaSigef({ properties: { id_parcela: 'id-1' } })).toBe('id-1');
  });

  it('só aceita feature.id quando não é a chave interna sigef_geo.*', () => {
    expect(extrairCodigoParcelaSigef({ id: 'uuid-direto', properties: {} })).toBe('uuid-direto');
    expect(extrairCodigoParcelaSigef({ id: 'sigef_geo.999', properties: {} })).toBe('');
  });

  it('entradas hostis devolvem string vazia sem lançar', () => {
    expect(extrairCodigoParcelaSigef(null)).toBe('');
    expect(extrairCodigoParcelaSigef(undefined)).toBe('');
    expect(extrairCodigoParcelaSigef({})).toBe('');
    expect(extrairCodigoParcelaSigef({ properties: null, id: null })).toBe('');
  });
});
