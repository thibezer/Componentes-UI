/**
 * Utilitários auxiliares para o ecossistema Canvas/Mapa do GerenciGeo
 */
export declare const escapeHtml: (unsafe: string | null | undefined) => string;
export declare const formatUTM: (val: number | null | undefined, casas?: number) => string;
export interface CoordenadaGeo {
    lat: number;
    lon: number;
}
/**
 * Converte e valida coordenadas geográficas (Lat/Lon) em graus decimais WGS-84.
 * - Trata números e strings no formato brasileiro (vírgula como separador decimal: "-23,7661")
 * - Filtra valores inválidos, NaN, Null Island (0, 0)
 * - Identifica e rejeita coordenadas planas métricas (UTM/SIRGAS2000 acima de 90°/180°)
 */
export declare const parseCoordenada: (rawLat: any, rawLon: any) => CoordenadaGeo | null;
