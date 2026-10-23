import { describe, it, expect } from 'vitest';
import path from 'node:path';
// @ts-expect-error módulo .mjs sem declarações
import { classificar, extrairImports, verificar, verificarEntradaSemLeaflet } from '../scripts/check-layers.mjs';

const src = (...p: string[]) => path.resolve(__dirname, '..', 'src', ...p);

describe('check-layers: classificação', () => {
  it('não confunde prefixos de diretório (core × cores.ts, ui-tabela × ui-tabela-propriedades)', () => {
    expect(classificar(src('core', 'ssr-safe.ts'))).toBe(1);
    expect(classificar(src('cores.ts'))).toBe(5);
    expect(classificar(src('components', 'ui-tabela', 'x.ts'))).toBe(4);
    expect(classificar(src('components', 'ui-tabela-propriedades', 'x.ts'))).toBe(4);
    expect(classificar(src('components', 'ui-botao', 'x.ts'))).toBe(3);
    expect(classificar(src('gerencigeo-canvas', 'a.ts'))).toBe(2);
    expect(classificar(src('tokens', 'colors.css'))).toBe(0);
  });

  it('trata os utilitários puros declarados como L2', () => {
    expect(classificar(src('components', 'ui-cores', 'cores-utils.ts'))).toBe(2);
    expect(classificar(src('components', 'ui-tabela-propriedades', 'avaliador-expressao.ts'))).toBe(2);
  });
});

describe('check-layers: extração de imports', () => {
  it('pega import estático, de efeito colateral, re-export e dinâmico; ignora comentários e import type', () => {
    const codigo = `
      import { a } from '../x';
      import '../efeito';
      export * from '../reexport';
      const m = await import('../dinamico');
      import type { T } from '../so-tipo';
      // import { z } from '../comentado';
      /* import '../bloco'; */
    `;
    expect(extrairImports(codigo).sort()).toEqual(['../dinamico', '../efeito', '../reexport', '../x']);
  });
});

describe('check-layers: verificação', () => {
  const ler = (conteudos: Record<string, string>) => (f: string) => conteudos[f] ?? '';

  it('aponta L1 → L3, inclusive por import de efeito colateral', () => {
    const f = src('core', 'a.ts');
    const v = verificar([f], ler({ [f]: "import '../components/ui-botao';" }));
    expect(v).toHaveLength(1);
    expect(v[0].motivo).toContain('L1');
  });

  it('aponta L3 → L4 e L3 → L2 e L4 → L5', () => {
    const l3 = src('components', 'ui-botao', 'a.ts');
    const l4 = src('components', 'ui-camadas', 'a.ts');
    expect(verificar([l3], ler({ [l3]: "import { X } from '../ui-camadas';" }))).toHaveLength(1);
    expect(verificar([l3], ler({ [l3]: "import { X } from '../../gerencigeo-canvas/layer_manager';" }))).toHaveLength(1);
    expect(verificar([l4], ler({ [l4]: "import { X } from '../../index';" }))).toHaveLength(1);
  });

  it('aceita dependências para camadas inferiores e import type', () => {
    const l4 = src('components', 'ui-camadas', 'a.ts');
    const conteudo = "import { a } from '../../core/ssr-safe';\nimport { b } from '../ui-botao';\nimport type { C } from '../../index';";
    expect(verificar([l4], ler({ [l4]: conteudo }))).toEqual([]);
  });

  it('ignora arquivos de teste e pacotes externos', () => {
    const t = src('core', 'a.test.ts');
    expect(verificar([t], ler({ [t]: "import '../components/ui-botao';" }))).toEqual([]);
    const f = src('core', 'b.ts');
    expect(verificar([f], ler({ [f]: "import L from 'leaflet';" }))).toEqual([]);
  });

  it('módulos puros do motor (motor/, feature_lod, feature_simplificacao, feature_indice) não importam leaflet nem usam DOM', () => {
    const lod = src('gerencigeo-canvas', 'feature_lod.ts');
    const motor = src('gerencigeo-canvas', 'motor', 'vista.ts');
    expect(verificar([lod], ler({ [lod]: "import L from 'leaflet';" }))).toHaveLength(1);
    expect(verificar([motor], ler({ [motor]: "import type L from \"leaflet\";\nconst x = window.innerWidth;" })).length).toBeGreaterThanOrEqual(1);
    expect(verificar([motor], ler({ [motor]: 'const el = document.createElement("a");' }))).toHaveLength(1);
    // comentário que cita window/document não conta; renderers (que usam Leaflet) seguem livres
    expect(verificar([lod], ler({ [lod]: '// sem window nem document\nexport const x = 1;' }))).toEqual([]);
    const renderer = src('gerencigeo-canvas', 'renderers', 'feicoes_renderer.ts');
    expect(verificar([renderer], ler({ [renderer]: "import L from 'leaflet'; document.body;" }))).toEqual([]);
  });

  it('proíbe código em tokens (L0)', () => {
    const f = src('tokens', 'x.ts');
    expect(verificar([f], ler({ [f]: '' }))).toHaveLength(1);
  });
});

describe('check-layers: entrypoint sem Leaflet (motor)', () => {
  const fs = (arquivos: Record<string, string>) => ({
    ler: (f: string) => arquivos[f] ?? null,
    resolver: (base: string) => [`${base}.ts`, base].find((c) => c in arquivos) ?? null
  });
  const raiz = path.resolve(__dirname, '..', 'src');

  it('acusa um arquivo alcançado (mesmo indiretamente) que importa leaflet em runtime', () => {
    const entrada = path.join(raiz, 'motor.ts');
    const { ler, resolver } = fs({
      [entrada]: "export * from './a';",
      [path.join(raiz, 'a.ts')]: ["import { b } from './b';", 'export const a = b;'].join('\n'),
      [path.join(raiz, 'b.ts')]: ["import L from 'leaflet';", 'export const b = L;'].join('\n')
    });
    const v = verificarEntradaSemLeaflet(entrada, ler, resolver);
    expect(v).toHaveLength(1);
    expect(v[0].arquivo).toBe(path.join(raiz, 'b.ts'));
  });

  it('import type de leaflet não conta (some na compilação); ciclos não travam', () => {
    const entrada = path.join(raiz, 'motor.ts');
    const { ler, resolver } = fs({
      [entrada]: "export * from './a';",
      [path.join(raiz, 'a.ts')]: ["import type L from 'leaflet';", "import './b';"].join('\n'),
      [path.join(raiz, 'b.ts')]: "import './a';"
    });
    expect(verificarEntradaSemLeaflet(entrada, ler, resolver)).toEqual([]);
  });

  it('o entrypoint real `src/motor.ts` não alcança leaflet', () => {
    expect(verificarEntradaSemLeaflet(path.join(raiz, 'motor.ts'))).toEqual([]);
  });

  it('classifica motor.ts como L5 e gerencigeo-canvas/motor como L2', () => {
    expect(classificar(src('motor.ts'))).toBe(5);
    expect(classificar(src('gerencigeo-canvas', 'motor', 'motor-formas.ts'))).toBe(2);
  });
});
