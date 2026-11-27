import { describe, it, expect, vi, afterEach } from 'vitest';
import '../src/index';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import type { SigefParcelasDetail } from '../src/gerencigeo-canvas/sigef_dados';

const GEOJSON = { features: [{ id: 'sigef_geo.1', properties: { parcela_codigo: 'uuid-1', nome_area: 'Fazenda A' } }] };

async function montar(atributos: Record<string, string> = {}): Promise<UICanvasCAD> {
  const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  document.body.appendChild(el);
  await new Promise((r) => setTimeout(r, 20));
  return el;
}

afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });

describe('<ui-canvas-cad sem-popup-sigef>: o app monta o popup do SIGEF', () => {
  it('sem o atributo, o popup do kit continua sendo o padrão', async () => {
    const el = await montar();
    const core: any = el.getController().core;
    expect(core.sigefPopup).toBe(true);
    expect(el.hasAttribute('sem-popup-sigef')).toBe(false);
  });

  it('com o atributo desliga o popup do kit e emite ui-sigef-parcelas (consultando → concluida)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(GEOJSON) }));
    const el = await montar({ 'sem-popup-sigef': '' });
    const core: any = el.getController().core;
    expect(core.sigefPopup).toBe(false);

    const recebidos: SigefParcelasDetail[] = [];
    el.addEventListener('ui-sigef-parcelas', (e) => recebidos.push((e as CustomEvent<SigefParcelasDetail>).detail));
    const map = el.getController().getMap();
    expect(map).toBeTruthy();
    await core.consultarSigef({ latlng: { lat: -23.6, lng: -53.3 }, containerPoint: { x: 5, y: 6 } });

    expect(recebidos.map((d) => d.estado)).toEqual(['consultando', 'concluida']);
    expect(recebidos[1].parcelas[0]).toMatchObject({ codigo: 'uuid-1', nome: 'Fazenda A' });
    expect(document.querySelector('.compact-sigef-popup, .leaflet-popup')).toBeNull();
  });

  it('o atributo pode ser ligado e desligado depois de montado', async () => {
    const el = await montar();
    const core: any = el.getController().core;
    el.setAttribute('sem-popup-sigef', '');
    expect(core.sigefPopup).toBe(false);
    el.removeAttribute('sem-popup-sigef');
    expect(core.sigefPopup).toBe(true);
  });
});
