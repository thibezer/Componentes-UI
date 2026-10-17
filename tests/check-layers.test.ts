import { describe, it, expect } from 'vitest';
import path from 'node:path';
// @ts-expect-error módulo .mjs sem declarações
import { classificar, extrairImports, verificar } from '../scripts/check-layers.mjs';

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

  it('proíbe código em tokens (L0)', () => {
    const f = src('tokens', 'x.ts');
    expect(verificar([f], ler({ [f]: '' }))).toHaveLength(1);
  });
});
