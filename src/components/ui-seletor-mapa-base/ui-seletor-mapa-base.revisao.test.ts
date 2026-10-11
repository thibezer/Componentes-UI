import { describe, it, expect, afterEach } from 'vitest';
import './ui-seletor-mapa-base';
import type { UISeletorMapaBase } from './ui-seletor-mapa-base';

afterEach(() => { document.body.innerHTML = ''; });

function criar(): UISeletorMapaBase {
  const el = document.createElement('ui-seletor-mapa-base') as UISeletorMapaBase;
  el.definirMapasBase([
    { id: 'osm', nome: 'OSM', thumbnailUrl: 'https://exemplo.test/a.png' },
    { id: 'dark', nome: 'Dark' },
    { id: 'sat', nome: 'Sat' }
  ]);
  el.setAttribute('mapa-base-ativo', 'dark');
  document.body.appendChild(el);
  return el;
}
const sr = (el: UISeletorMapaBase) => el.shadowRoot!;

describe('ui-seletor-mapa-base: revisão', () => {
  it('desabilitado trava o gatilho, fecha o popover e impede abrir', () => {
    const el = criar();
    el.abrir();
    expect(el.aberto).toBe(true);
    el.desabilitado = true;
    expect(el.aberto).toBe(false);
    expect((sr(el).getElementById('basemap-trigger') as HTMLButtonElement).disabled).toBe(true);
    el.abrir();
    el.alternar();
    expect(el.aberto).toBe(false);
    el.desabilitado = false;
    el.abrir();
    expect(el.aberto).toBe(true);
  });

  it('selecionar id fora da lista não muda o mapa nem dispara evento', () => {
    const el = criar();
    let eventos = 0;
    el.addEventListener('ui-mapa-base-alterado', () => eventos++);
    el.selecionar('inexistente');
    expect(el.mapaBaseAtivo).toBe('dark');
    expect(eventos).toBe(0);
    el.selecionar('sat');
    expect(el.mapaBaseAtivo).toBe('sat');
    expect(eventos).toBe(1);
  });

  it('abrir pelo teclado foca o mapa ativo e as setas/Home/End navegam', () => {
    const el = criar();
    const gatilho = sr(el).getElementById('basemap-trigger') as HTMLButtonElement;
    gatilho.click(); // click sintético: detail === 0, como Enter/Espaço
    const itens = Array.from(sr(el).querySelectorAll<HTMLElement>('.ui-basemap-item'));
    expect(sr(el).activeElement).toBe(itens[1]);
    const lista = sr(el).getElementById('basemap-list')!;
    const tecla = (key: string) => lista.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    itens[1].focus();
    tecla('ArrowDown');
    expect(sr(el).activeElement).toBe(itens[2]);
    tecla('Home');
    expect(sr(el).activeElement).toBe(itens[0]);
    tecla('End');
    expect(sr(el).activeElement).toBe(itens[2]);
    tecla('ArrowUp');
    expect(sr(el).activeElement).toBe(itens[1]);
  });

  it('miniaturas externas não enviam referrer', () => {
    const el = criar();
    const img = sr(el).querySelector('img.ui-basemap-item-preview') as HTMLImageElement;
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
  });
});
