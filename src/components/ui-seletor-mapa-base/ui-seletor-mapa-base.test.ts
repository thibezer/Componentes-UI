import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index';
import { UISeletorMapaBase } from './ui-seletor-mapa-base';

describe('UISeletorMapaBase (<ui-seletor-mapa-base>)', () => {
  let element: UISeletorMapaBase;

  beforeEach(() => {
    element = document.createElement('ui-seletor-mapa-base') as UISeletorMapaBase;
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  it('deve ser instanciado e ter o shadowRoot definido', () => {
    expect(element).toBeDefined();
    expect(element.shadowRoot).not.toBeNull();
  });

  it('deve ter o mapa padrão como satelite e sincronizar texto no gatilho', () => {
    expect(element.mapaBaseAtivo).toBe('satelite');
    const label = element.shadowRoot?.querySelector('#basemap-label');
    expect(label?.textContent).toBe('Esri Satélite');
  });

  it('deve abrir e fechar o popover ao alternar', () => {
    expect(element.aberto).toBe(false);
    element.alternar();
    expect(element.aberto).toBe(true);

    const popover = element.shadowRoot?.querySelector('#basemap-popover');
    expect(popover?.classList.contains('aberto')).toBe(true);

    element.fechar();
    expect(element.aberto).toBe(false);
    expect(popover?.classList.contains('aberto')).toBe(false);
  });

  it('deve disparar evento ui-mapa-base-alterado ao selecionar', () => {
    let eventoRecebido: any = null;
    element.addEventListener('ui-mapa-base-alterado', (e: any) => {
      eventoRecebido = e.detail;
    });

    element.selecionar('osm');
    expect(element.mapaBaseAtivo).toBe('osm');
    expect(eventoRecebido).not.toBeNull();
    expect(eventoRecebido.mapaBaseId).toBe('osm');
    expect(eventoRecebido.item.nome).toBe('OpenStreetMap');
    expect(element.aberto).toBe(false);
  });

  it('deve permitir definir mapas base customizados', () => {
    element.definirMapasBase([
      { id: 'custom_1', nome: 'Meu Mapa 1' },
      { id: 'custom_2', nome: 'Meu Mapa 2' }
    ]);

    expect(element.mapasBase.length).toBe(2);
    const items = element.shadowRoot?.querySelectorAll('.ui-basemap-item');
    expect(items?.length).toBe(2);
  });
});
