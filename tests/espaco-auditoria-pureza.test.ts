// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error módulo .mjs sem declarações
import { extrairImports } from '../scripts/check-layers.mjs';

/*
 * Prancha, Fase 0: trava a auditoria de pureza (docs/canvas-prancha.md, "Auditoria"). Os módulos abaixo formam o núcleo
 * que a `<ui-canvas-prancha>` (sem Leaflet) vai reaproveitar; hoje já não importam `leaflet` nem usam globais de
 * navegador. Se um deles ganhar uma dependência de Leaflet/DOM antes da Fase 1 (que os põe em `PUROS_SEM_DOM` do
 * `check-layers`), este teste acusa.
 */

const RAIZ = path.resolve(__dirname, '..', 'src', 'gerencigeo-canvas');

/** "Já é puro" (Fase 0) e os módulos novos da Fase 1 (espaço, histórico, prancha): todos em `PUROS_SEM_DOM`. */
const NUCLEO_PURO = [
  'feature_types.ts', 'feature_metricas.ts', 'feature_formas.ts', 'feature_algoritmos.ts', 'feature_curvas.ts',
  'feature_edicao_ops.ts', 'feature_snap.ts', 'feature_caixa.ts', 'feature_amostra.ts', 'feature_desenho.ts',
  'feature_versoes.ts', 'feature_selecao.ts', 'feature_cluster.ts', 'feature_indice.ts', 'feature_simplificacao.ts',
  'feature_lod.ts', 'motor/tipos-linha.ts', 'motor/estilo.ts', 'motor/geometria-px.ts', 'renderers/renderizador_formas.ts',
  'feature_historico.ts',
  'espaco/espaco_tipos.ts', 'espaco/espaco_geografico.ts', 'espaco/espaco_plano.ts', 'espaco/espaco_matriz.ts', 'espaco/index.ts',
  'prancha/tipos.ts', 'prancha/elemento_geometria.ts', 'prancha/elemento_validacao.ts', 'prancha/elemento_criacao.ts',
  'prancha/elemento_transformacao.ts', 'prancha/elemento_consulta.ts', 'prancha/elemento_snap.ts', 'prancha/elemento_edicao.ts',
  'prancha/elemento_predefinicoes.ts', 'prancha/index.ts',
  // Fase 2: aparência, pintor e SVG (e o utilitário L2 de cores que o SVG usa para escapar texto)
  'prancha/aparencia_estilo.ts', 'prancha/pintura_formas.ts', 'prancha/pintura_plano.ts', 'prancha/pintura_canvas.ts',
  'prancha/exportar_svg.ts', '../components/ui-cores/cores-utils.ts',
  // Fase 3
  'prancha/guias_inteligentes.ts',
  // pendências da Fase 3 e Fase 4
  'prancha/cantos_vivos.ts', 'prancha/camadas.ts', 'prancha/organizacao.ts', 'prancha/operacoes_caminho.ts',
  // Fase 5: Pathfinder (booleanas genéricas) e efeitos
  'prancha/pathfinder.ts', 'booleanas/index.ts', 'booleanas/tipos.ts', 'booleanas/segmentos.ts', 'booleanas/classificacao.ts',
  'booleanas/montagem.ts',
  // Fase 6
  'prancha/propriedades.ts'
];

/** "Separar a parte pura da parte Leaflet": hoje importam `leaflet` (a Fase 1 extrai a lógica pura deles). */
const ACOPLADOS_LEAFLET = ['feature_desenho_controle.ts', 'feature_editor_vertices.ts', 'layer_hit_test.ts', 'feature_popup.ts', 'feature_cursores.ts'];

const GLOBAIS_DOM = ['window', 'document', 'localStorage', 'sessionStorage', 'requestAnimationFrame', 'ResizeObserver', 'HTMLElement'];

/** Código sem comentários e sem literais de texto (o `'window'` de `ModoCaixa` é um valor, não o global). */
function codigoSemComentariosNemTextos(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''");
}

/** Globais de navegador usados, descontando nomes declarados no próprio módulo (ex.: `const window = ...`). */
function globaisUsados(fonte: string): string[] {
  const codigo = codigoSemComentariosNemTextos(fonte);
  return GLOBAIS_DOM.filter((g) => {
    if (!new RegExp(`\\b${g}\\b`).test(codigo)) return false;
    return !new RegExp(`\\b(?:const|let|var)\\s+${g}\\b`).test(codigo);
  });
}

const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf-8');
const importaLeaflet = (fonte: string): boolean => (extrairImports(fonte) as string[]).some((e) => /^leaflet(\/|$)/.test(e));

describe('auditoria de pureza do núcleo reaproveitável (Fases 0 e 1)', () => {
  for (const rel of NUCLEO_PURO) {
    it(`${rel}: sem leaflet e sem globais de navegador`, () => {
      const fonte = ler(rel);
      expect(importaLeaflet(fonte)).toBe(false);
      expect(globaisUsados(fonte)).toEqual([]);
    });
  }

  it('o núcleo puro só importa (em runtime) outros módulos do núcleo puro', () => {
    const conjunto = new Set(NUCLEO_PURO.map((r) => path.join(RAIZ, r)));
    const fora: string[] = [];
    for (const rel of NUCLEO_PURO) {
      const origem = path.join(RAIZ, rel);
      for (const esp of extrairImports(ler(rel)) as string[]) {
        if (!esp.startsWith('.')) continue;
        const alvo = path.resolve(path.dirname(origem), esp);
        const real = [alvo, `${alvo}.ts`].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
        if (!real || !conjunto.has(real)) fora.push(`${rel} → ${esp}`);
      }
    }
    expect(fora).toEqual([]);
  });

  it('os módulos interativos/visuais ainda dependem do Leaflet (a separar na Fase 1)', () => {
    for (const rel of ACOPLADOS_LEAFLET) expect(importaLeaflet(ler(rel)), rel).toBe(true);
  });

  it('falso positivo da Fase 0 resolvido: feature_caixa.ts não declara mais `window`; o valor `\'window\'` é só texto', () => {
    // Fase 1: a variável local virou `inteira` e o check-layers passou a ignorar literais de texto (semTextos)
    const fonte = ler('feature_caixa.ts');
    expect(/\bconst\s+window\b/.test(fonte)).toBe(false);
    expect(fonte).toContain("'window'");
    expect(globaisUsados(fonte)).toEqual([]);
  });
});
