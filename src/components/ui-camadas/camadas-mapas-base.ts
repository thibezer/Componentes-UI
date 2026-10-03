/* ====================================================
   UI Camadas - Seletor de Mapas Base (Basemaps)
   Renderização e gerenciamento da grade de mapas base
   ==================================================== */

import { MapaBaseItem } from './tipos';
import { ICONES } from './camadas-icones';
import { escapeHtml } from './camadas-utils';

export const MAPAS_BASE_PADRAO: MapaBaseItem[] = [
  {
    id: 'none',
    nome: 'Sem Mapa',
    descricao: 'Tela CAD neutra com grade quadriculada'
  },
  {
    id: 'google_satelite_puro',
    nome: 'Google Puro',
    descricao: 'Satélite limpo sem ruas ou rótulos',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'google_satelite',
    nome: 'Google Híbrido',
    descricao: 'Satélite com nomes de ruas e divisas',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'satelite',
    nome: 'Esri Satélite',
    descricao: 'Imagens orbitais de alta resolução',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'osm',
    nome: 'OpenStreetMap',
    descricao: 'Mapa viário e urbano colaborativo',
    thumbnailUrl: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'topografia',
    nome: 'Topografia',
    descricao: 'Curvas de nível e relevo sombreado',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'dark',
    nome: 'Dark Canvas',
    descricao: 'Mapa escuro de alto contraste para CAD',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=160&auto=format&fit=crop&q=80'
  }
];

export function renderizarGridMapasBase(
  mapasBase: MapaBaseItem[] = MAPAS_BASE_PADRAO,
  mapaBaseAtivo: string = 'satelite'
): string {
  if (!mapasBase || mapasBase.length === 0) return '';

  const cardsHtml = mapasBase
    .map((item) => {
      const isAtivo = mapaBaseAtivo === item.id;
      const safeId = escapeHtml(item.id);
      const safeNome = escapeHtml(item.nome);
      const safeDesc = escapeHtml(item.descricao || item.nome);

      let previewHtml = '';
      if (item.thumbnailUrl) {
        previewHtml = `<img class="ui-basemap-preview" src="${escapeHtml(item.thumbnailUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-basemap-thumb />`;
      } else {
        previewHtml = `<div class="ui-basemap-preview-none">${ICONES.gradeCad}</div>`;
      }

      return `
        <div class="ui-basemap-card ${isAtivo ? 'active' : ''}" data-basemap-id="${safeId}" role="button" tabindex="0" aria-pressed="${isAtivo}" title="${safeDesc}">
          ${previewHtml}
          <span>${safeNome}</span>
        </div>
      `;
    })
    .join('');

  return `
    <div class="ui-basemap-section">
      <div class="ui-basemap-title">Mapa Base</div>
      <div class="ui-basemap-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}
