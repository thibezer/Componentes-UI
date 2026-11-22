// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error módulo .mjs sem declarações
import { globParaRegex, coberto } from '../scripts/check-bundle.mjs';
// @ts-expect-error módulo .mjs sem declarações
import { limparPasta } from '../scripts/limpar-dist.mjs';

/*
 * Empacotamento (Camada D): o campo `sideEffects`, os globs que o conferem e a limpeza do dist. O teste do dist de verdade
 * (esbuild sobre `prancha/nucleo`, orçamento de tamanho) é `npm run check:bundle`, que precisa do build e roda no `gate:full`.
 */

const RAIZ = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf-8')) as { sideEffects: string[]; exports: Record<string, unknown>; scripts: Record<string, string> };

describe('sideEffects do package.json', () => {
  it('é uma lista (as tags se registram por efeito colateral; `false` puro quebraria o registro)', () => {
    expect(Array.isArray(pkg.sideEffects)).toBe(true);
    expect(pkg.sideEffects).toContain('**/*.css');
  });

  it('cobre os chunks de componente e todos os entrypoints que registram tags', () => {
    for (const f of ['dist/ui-camadas-AbCd1234.js', 'dist/ui-editor-prancha-AbCd1234.cjs', 'dist/index.js', 'dist/prancha.js', 'dist/prancha.cjs', 'dist/register.js', 'dist/camadas.js', 'dist/tabela.cjs', 'dist/ui-kit.css']) {
      expect(coberto(f, pkg.sideEffects), f).toBe(true);
    }
  });

  it('NÃO cobre o núcleo puro, o motor, o core nem os chunks de base (podem ser eliminados)', () => {
    for (const f of ['dist/prancha-nucleo.js', 'dist/prancha-nucleo.cjs', 'dist/motor.js', 'dist/core.js', 'dist/kit-base-AbCd1234.js', 'dist/feature_historico-AbCd1234.js', 'dist/geometria-px-AbCd1234.js']) {
      expect(coberto(f, pkg.sideEffects), f).toBe(false);
    }
  });

  it('o núcleo está no export map e o `gate:full` roda o teste de empacotamento', () => {
    expect(pkg.exports['./prancha/nucleo']).toBeDefined();
    expect(pkg.scripts['gate:full']).toContain('check:bundle');
    expect(pkg.scripts.prebuild).toContain('limpar-dist');
  });
});

describe('globParaRegex', () => {
  it('*, ** e ? e escapa o resto; entrada com ./ ou sem', () => {
    expect(globParaRegex('./dist/ui-*.js').test('dist/ui-x-1.js')).toBe(true);
    expect(globParaRegex('./dist/ui-*.js').test('dist/sub/ui-x.js')).toBe(false);
    expect(globParaRegex('**/*.css').test('dist/a/b.css')).toBe(true);
    expect(globParaRegex('dist/a?.js').test('dist/ab.js')).toBe(true);
    expect(globParaRegex('dist/a.js').test('dist/aXjs')).toBe(false);
    expect(coberto('./dist/index.js', ['./dist/index.js'])).toBe(true);
    expect(coberto('dist/x.js', [])).toBe(false);
  });
});

describe('limparPasta (o rmSync do Node 24 no Windows não apagava nada em silêncio)', () => {
  it('esvazia a pasta com subpastas e devolve quantos arquivos removeu; pasta inexistente = 0', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
    fs.mkdirSync(path.join(tmp, 'a', 'b'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'x.js'), '1');
    fs.writeFileSync(path.join(tmp, 'a', 'y.js'), '1');
    fs.writeFileSync(path.join(tmp, 'a', 'b', 'z.js'), '1');
    expect(limparPasta(tmp)).toBe(3);
    expect(fs.readdirSync(tmp)).toEqual([]);
    expect(limparPasta(path.join(tmp, 'nao-existe'))).toBe(0);
    fs.rmdirSync(tmp);
  });
});
