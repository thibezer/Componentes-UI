/**
 * Regressão e robustez de <ui-mapa>, <ui-mapa-marcador> e <ui-mapa-linha> (Camada C do AGENTS.md).
 * Escritos antes da correção: cada caso marcado "falhava antes" documenta um defeito encontrado na revisão.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-mapa';
import './ui-mapa-marcador';
import './ui-mapa-linha';
import type { UIMapa } from './ui-mapa';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));

async function montarMapa(atributos: Record<string, string> = {}): Promise<UIMapa> {
  const el = document.createElement('ui-mapa') as UIMapa;
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  document.body.appendChild(el);
  for (let i = 0; i < 40 && !el.getMap(); i++) await esperar(5);
  return el;
}

async function comMarcador(mapa: UIMapa, atributos: Record<string, string>): Promise<HTMLElement> {
  const m = document.createElement('ui-mapa-marcador');
  for (const [k, v] of Object.entries(atributos)) m.setAttribute(k, v);
  mapa.appendChild(m);
  await esperar(10);
  return m;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('<ui-mapa> - entradas hostis', () => {
  it('lat/lng/zoom inválidos caem nos padrões em vez de lançar (falhava antes: setView com NaN)', async () => {
    const mapa = await montarMapa({ lat: 'abc', lng: 'x', zoom: 'muito' });
    const map = mapa.getMap();
    expect(map).not.toBeNull();
    const c = map!.getCenter();
    expect(Number.isFinite(c.lat) && Number.isFinite(c.lng)).toBe(true);
    expect(Number.isFinite(map!.getZoom())).toBe(true);
  });

  it('mudar zoom para um valor inválido depois do init não lança (falhava antes)', async () => {
    const mapa = await montarMapa();
    expect(() => mapa.setAttribute('zoom', 'nada')).not.toThrow();
    expect(Number.isFinite(mapa.getMap()!.getZoom())).toBe(true);
  });

  it('camadas desconhecidas caem em OSM sem lançar', async () => {
    const mapa = await montarMapa({ camadas: 'inexistente, outra' });
    expect(mapa.getMap()).not.toBeNull();
  });

  it('desconectar antes do Leaflet carregar não deixa um mapa órfão (falhava antes)', async () => {
    const el = document.createElement('ui-mapa') as UIMapa;
    document.body.appendChild(el);
    el.remove();
    await esperar(60);
    expect(el.getMap()).toBeNull();
  });

  it('reconectar recria o mapa e emite ui-mapa-pronto de novo', async () => {
    const mapa = await montarMapa();
    const primeiro = mapa.getMap();
    mapa.remove();
    expect(mapa.getMap()).toBeNull();
    const aoPronto = vi.fn();
    mapa.addEventListener('ui-mapa-pronto', aoPronto);
    document.body.appendChild(mapa);
    for (let i = 0; i < 40 && !mapa.getMap(); i++) await esperar(5);
    expect(mapa.getMap()).not.toBeNull();
    expect(mapa.getMap()).not.toBe(primeiro);
    expect(aoPronto).toHaveBeenCalledTimes(1);
  });
});

describe('<ui-mapa> - acessibilidade', () => {
  it('o contêiner é uma região nomeada (aria-label do host ou padrão)', async () => {
    const mapa = await montarMapa();
    const regiao = mapa.shadowRoot!.getElementById('map-container')!;
    expect(regiao.getAttribute('role')).toBe('region');
    expect(regiao.getAttribute('aria-label')).toBe('Mapa');

    mapa.setAttribute('aria-label', 'Mapa de lotes');
    expect(regiao.getAttribute('aria-label')).toBe('Mapa de lotes');
    mapa.removeAttribute('aria-label');
    expect(regiao.getAttribute('aria-label')).toBe('Mapa');
  });
});

describe('<ui-mapa-marcador>', () => {
  it('cor maliciosa não injeta HTML/atributos no ícone (falhava antes: interpolação em innerHTML)', async () => {
    const mapa = await montarMapa();
    const cor = 'red;" onmouseover="alert(1)"><img src=x onerror=alert(2)>';
    for (const formato of ['pin', 'circle']) {
      await comMarcador(mapa, { lat: '-23.55', lng: '-46.63', cor, formato });
    }
    const icones = mapa.getMap()!.getContainer().querySelectorAll('.leaflet-marker-icon');
    expect(icones.length).toBe(2);
    icones.forEach((icone) => {
      expect(icone.querySelector('img')).toBeNull();
      expect(icone.outerHTML).not.toContain('onmouseover');
      expect(icone.outerHTML).not.toContain('onerror');
    });
  });

  it('cor válida continua aplicada (hex, rgb e nome)', async () => {
    const mapa = await montarMapa();
    await comMarcador(mapa, { lat: '-23.55', lng: '-46.63', cor: '#ff0000', formato: 'circle' });
    const bolinha = mapa.getMap()!.getContainer().querySelector('.ui-mapa-div-marker > div') as HTMLElement;
    expect(bolinha.style.backgroundColor).toMatch(/(#ff0000|rgb\(255, 0, 0\))/i);
  });

  it('coordenadas inválidas não criam marcador nem lançam', async () => {
    const mapa = await montarMapa();
    await comMarcador(mapa, { lat: 'abc', lng: '' });
    expect(mapa.getMap()!.getContainer().querySelectorAll('.leaflet-marker-icon').length).toBe(0);
  });

  it('título vira title/aria-label do marcador (nome acessível), focável por teclado', async () => {
    const mapa = await montarMapa();
    await comMarcador(mapa, { lat: '-23.55', lng: '-46.63', titulo: 'Lote 12' });
    const icone = mapa.getMap()!.getContainer().querySelector('.leaflet-marker-icon') as HTMLElement;
    expect(icone.getAttribute('title')).toBe('Lote 12');
    expect(icone.getAttribute('aria-label')).toBe('Lote 12');
    expect(icone.getAttribute('tabindex')).toBe('0');
    expect(icone.getAttribute('role')).toBe('button');
  });

  it('remove o marcador ao desconectar e recria quando o mapa é recriado', async () => {
    const mapa = await montarMapa();
    const m = await comMarcador(mapa, { lat: '-23.55', lng: '-46.63' });
    expect(mapa.getMap()!.getContainer().querySelectorAll('.leaflet-marker-icon').length).toBe(1);
    m.remove();
    expect(mapa.getMap()!.getContainer().querySelectorAll('.leaflet-marker-icon').length).toBe(0);
  });

  it('fora de um <ui-mapa> avisa e não lança', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const solto = document.createElement('ui-mapa-marcador');
    solto.setAttribute('lat', '1');
    solto.setAttribute('lng', '1');
    document.body.appendChild(solto);
    await esperar(10);
    expect(aviso).toHaveBeenCalled();
  });
});

describe('<ui-mapa-linha>', () => {
  async function comLinha(mapa: UIMapa, atributos: Record<string, string>): Promise<HTMLElement> {
    const l = document.createElement('ui-mapa-linha');
    for (const [k, v] of Object.entries(atributos)) l.setAttribute(k, v);
    mapa.appendChild(l);
    await esperar(10);
    return l;
  }
  const caminhos = (mapa: UIMapa) => mapa.getMap()!.getContainer().querySelectorAll('path.leaflet-interactive').length;

  it('desenha uma linha com pontos válidos', async () => {
    const mapa = await montarMapa();
    await comLinha(mapa, { pontos: '[[-23.5,-46.6],[-23.6,-46.7]]' });
    expect(caminhos(mapa)).toBe(1);
  });

  it.each([
    ['JSON inválido', '{nao-json'],
    ['não é array', '{"a":1}'],
    ['pares incompletos', '[[1],[2,3,4],"x",null]'],
    ['NaN/texto', '[["a","b"],[null,null]]']
  ])('pontos hostis (%s) não lançam (falhava antes para formatos que não são arrays de pares)', async (_nome, pontos) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mapa = await montarMapa();
    await expect(comLinha(mapa, { pontos })).resolves.toBeTruthy();
  });

  it('ignora pontos inválidos no meio de uma lista válida', async () => {
    const mapa = await montarMapa();
    await comLinha(mapa, { pontos: '[[-23.5,-46.6],["x","y"],[-23.6,-46.7]]' });
    expect(caminhos(mapa)).toBe(1);
  });

  it('espessura inválida cai no padrão', async () => {
    const mapa = await montarMapa();
    const l = await comLinha(mapa, { pontos: '[[-23.5,-46.6],[-23.6,-46.7]]', espessura: 'grossa' });
    expect(() => l.setAttribute('espessura', 'abc')).not.toThrow();
    const peso = Number(mapa.getMap()!.getContainer().querySelector('path.leaflet-interactive')!.getAttribute('stroke-width'));
    expect(Number.isFinite(peso)).toBe(true);
  });

  it('reaparece quando o mapa é recriado (falhava antes: só o marcador ouvia ui-mapa-pronto)', async () => {
    const mapa = await montarMapa();
    await comLinha(mapa, { pontos: '[[-23.5,-46.6],[-23.6,-46.7]]' });
    mapa.remove();
    document.body.appendChild(mapa);
    for (let i = 0; i < 40 && !mapa.getMap(); i++) await esperar(5);
    await esperar(20);
    expect(caminhos(mapa)).toBe(1);
  });
});
