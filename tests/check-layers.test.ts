import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error módulo .mjs sem declarações
import { classificar, extrairImports, semTextos, verificar, verificarEntradaSemLeaflet } from '../scripts/check-layers.mjs';

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

describe('check-layers: núcleo puro da prancha (espaço plano)', () => {
  const ler = (conteudos: Record<string, string>) => (f: string) => conteudos[f] ?? '';

  it('espaco/, prancha/ e os feature_* do núcleo não podem importar leaflet nem usar o DOM', () => {
    for (const f of [
      src('gerencigeo-canvas', 'espaco', 'espaco_plano.ts'),
      src('gerencigeo-canvas', 'prancha', 'elemento_geometria.ts'),
      src('gerencigeo-canvas', 'feature_snap.ts'),
      src('gerencigeo-canvas', 'feature_historico.ts')
    ]) {
      expect(verificar([f], ler({ [f]: "import L from 'leaflet';" })), f).toHaveLength(1);
      expect(verificar([f], ler({ [f]: 'const w = window.innerWidth;' })), f).toHaveLength(1);
    }
  });

  it('a palavra window dentro de um texto não é o global (ModoCaixa = "window" | "crossing")', () => {
    const f = src('gerencigeo-canvas', 'feature_caixa.ts');
    expect(verificar([f], ler({ [f]: "export type ModoCaixa = 'window' | 'crossing';\nconst m = \"document\";\nconst t = `localStorage`;" }))).toEqual([]);
    expect(semTextos("a = 'window'; b = document;")).toBe("a = ''; b = document;");
  });
});

describe('check-layers: utilitário L2 importado sem extensão', () => {
  it('cores-utils sem .ts continua L2 (L2 pode importá-lo; L3 também)', () => {
    expect(classificar(src('components', 'ui-cores', 'cores-utils'))).toBe(2);
    const f = src('gerencigeo-canvas', 'prancha', 'exportar_svg.ts');
    expect(verificar([f], (() => "import { escaparHtml } from '../../components/ui-cores/cores-utils';") as never)).toEqual([]);
  });
});

describe('check-layers: <ui-canvas-prancha> (L4 sem Leaflet e isolado)', () => {
  const ler = (conteudos: Record<string, string>) => (f: string) => conteudos[f] ?? '';
  const f = src('components', 'ui-canvas-prancha', 'prancha-x.ts');

  it('é L4 e o entrypoint prancha.ts é L5', () => {
    expect(classificar(f)).toBe(4);
    expect(classificar(src('prancha.ts'))).toBe(5);
  });

  it('não importa leaflet (nem só o tipo em runtime) nem outro componente L4; pode usar L1, L2, L3 e a própria pasta', () => {
    expect(verificar([f], ler({ [f]: "import L from 'leaflet';" }))).toHaveLength(1);
    expect(verificar([f], ler({ [f]: "import { UICamadas } from '../ui-camadas';" }))).toHaveLength(1);
    expect(verificar([f], ler({ [f]: "import { x } from '../ui-canvas-cad/cad-snap';" }))).toHaveLength(1);
    expect(verificar([f], ler({ [f]: [
      "import type L from 'leaflet';",
      "import { a } from './prancha-y';",
      "import { b } from '../../core/listener-bag';",
      "import { c } from '../../gerencigeo-canvas/prancha/elemento_snap';",
      "import { d } from '../ui-botao';"
    ].join('\n') }))).toEqual([]);
  });

  it('outros L4 continuam podendo importar L4 (a regra é só da prancha)', () => {
    const cad = src('components', 'ui-canvas-cad', 'x.ts');
    expect(verificar([cad], ler({ [cad]: "import { y } from '../ui-camadas';" }))).toEqual([]);
  });

  it('o entrypoint real `src/prancha.ts` não alcança leaflet', () => {
    expect(verificarEntradaSemLeaflet(path.resolve(__dirname, '..', 'src', 'prancha.ts'))).toEqual([]);
  });

  it('<ui-editor-prancha> é L4 (pode compor a prancha) e o núcleo `prancha-nucleo.ts` é L5', () => {
    const ed = src('components', 'ui-editor-prancha', 'ui-editor-prancha.ts');
    expect(classificar(ed)).toBe(4);
    expect(classificar(src('prancha-nucleo.ts'))).toBe(5);
    expect(verificar([ed], ler({ [ed]: "import { x } from '../ui-canvas-prancha/prancha-paineis';" }))).toEqual([]);
  });

  it('o núcleo `src/prancha-nucleo.ts` não alcança leaflet nem nenhum componente (components/)', () => {
    const entrada = path.resolve(__dirname, '..', 'src', 'prancha-nucleo.ts');
    expect(verificarEntradaSemLeaflet(entrada)).toEqual([]);
    const vistos = new Set<string>();
    const fila = [entrada];
    const alcancados: string[] = [];
    while (fila.length > 0) {
      const arq = fila.pop()!;
      if (vistos.has(arq)) continue;
      vistos.add(arq);
      alcancados.push(arq.split(path.sep).join('/'));
      const conteudo = fs.readFileSync(arq, 'utf-8');
      for (const esp of extrairImports(conteudo)) {
        if (!esp.startsWith('.')) continue;
        const base = path.resolve(path.dirname(arq), esp);
        const real = ['.ts', '/index.ts', ''].map((x) => base + x).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
        if (real) fila.push(real);
      }
    }
    // utilitários L2 que moram em components/ (cores-utils, avaliador) são puros e permitidos; nenhum custom element
    const deComponentes = alcancados.filter((a) => a.includes('/src/components/') && !a.endsWith('cores-utils.ts') && !a.endsWith('avaliador-expressao.ts'));
    expect(deComponentes).toEqual([]);
    expect(alcancados.some((a) => a.includes('/ui-canvas-prancha/'))).toBe(false);
  });
});
