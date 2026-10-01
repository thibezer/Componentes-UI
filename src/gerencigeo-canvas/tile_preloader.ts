import L from 'leaflet';

export function preCarregarTilesRegiao(map: L.Map | null, bounds: L.LatLngBounds): void {
  if (!map) return;

  const currentZoom = Math.floor(map.getZoom());
  const minZoom = Math.max(currentZoom, 12);
  const maxZoom = Math.min(currentZoom + 1, 19);

  const expandedBounds = bounds.pad(0.2);
  const subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
  let tileCount = 0;
  const MAX_TILES = 32;

  for (let z = minZoom; z <= maxZoom && tileCount < MAX_TILES; z++) {
    const nw = expandedBounds.getNorthWest();
    const se = expandedBounds.getSouthEast();

    const tileMinX = lonToTileX(nw.lng, z);
    const tileMaxX = lonToTileX(se.lng, z);
    const tileMinY = latToTileY(nw.lat, z);
    const tileMaxY = latToTileY(se.lat, z);

    for (let x = tileMinX; x <= tileMaxX && tileCount < MAX_TILES; x++) {
      for (let y = tileMinY; y <= tileMaxY && tileCount < MAX_TILES; y++) {
        const subdomain = subdomains[(x + y) % subdomains.length];
        const url = `https://${subdomain}.google.com/vt/lyrs=s,h&x=${x}&y=${y}&z=${z}`;

        const img = new Image();
        img.src = url;
        tileCount++;
      }
    }
  }
}

function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
}
