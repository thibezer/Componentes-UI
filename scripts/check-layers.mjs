import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Verificador do DAG de camadas L0 → L5 descrito em AGENTS.md.
 * Resolve cada import (estático, de efeito colateral, re-export e dinâmico) para o arquivo/diretório de destino
 * e classifica a camada do destino; uma camada só pode importar camadas inferiores.
 */

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(RAIZ, 'src');
const norm = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();
const em = (...partes) => norm(path.join(SRC_DIR, ...partes));

const ATOMICOS_L3 = [
    'ui-botao', 'ui-icone', 'ui-texto', 'ui-badge', 'ui-avatar', 'ui-skeleton', 'ui-stat', 'ui-card',
    'ui-campo-texto', 'ui-area-texto', 'ui-checkbox', 'ui-radio', 'ui-switch', 'ui-segmented', 'ui-calendario', 'ui-alerta', 'ui-tooltip',
    'ui-modal', 'ui-drawer', 'ui-lista-flutuante', 'ui-cores', 'ui-linha'
];
const WORKSTATION_L4 = [
    'ui-canvas-cad', 'ui-camadas', 'ui-tabela-propriedades', 'ui-tabela', 'ui-barra-ferramentas',
    'ui-mapa', 'ui-seletor-mapa-base', 'ui-canvas-prancha', 'ui-editor-prancha'
];
const ENTRYPOINTS_L5 = [
    'index', 'register', 'botao', 'camadas', 'canvas', 'tabela', 'forms', 'tools',
    'campo-texto', 'card', 'cores', 'data', 'feedback', 'mapa', 'modal', 'seletor-mapa-base', 'motor', 'prancha', 'prancha-nucleo'
];

/**
 * Componentes L4 que não podem importar `leaflet` nem outros componentes L4 (a composição com `ui-camadas`,
 * `ui-tabela-propriedades` e `ui-barra-ferramentas` é por eventos e `ui-bus`, ver docs/canvas-prancha.md).
 */
const L4_SEM_LEAFLET_ISOLADOS = ['ui-canvas-prancha'];

/** Utilitários puros declarados como L2 que ainda moram em diretórios de componentes (ver AGENTS.md §1). */
const UTILITARIOS_L2 = [
    'components/ui-tabela-propriedades/avaliador-expressao.ts',
    'components/ui-cores/cores-utils.ts'
];

const dentro = (p, dir) => p === dir || p.startsWith(`${dir}/`);

/** Classifica um caminho absoluto numa camada (0–5) ou null se estiver fora do mapa. */
export function classificar(abs) {
    const p = norm(abs);
    // o import costuma vir sem extensão ('../ui-cores/cores-utils'): também casa sem o .ts
    if (UTILITARIOS_L2.some((u) => p === em(u) || p === em(u.replace(/\.ts$/, '')) || dentro(p, em(u)))) return 2;
    if (dentro(p, em('tokens')) || p === norm(path.join(RAIZ, 'ui-tokens.css'))) return 0;
    if (dentro(p, em('core'))) return 1;
    if (dentro(p, em('gerencigeo-canvas'))) return 2;
    if (ATOMICOS_L3.some((d) => dentro(p, em('components', d)))) return 3;
    if (WORKSTATION_L4.some((d) => dentro(p, em('components', d)))) return 4;
    if (ENTRYPOINTS_L5.some((e) => p === em(`${e}`) || p === em(`${e}.ts`))) return 5;
    return null;
}

const NOMES = ['L0 (tokens)', 'L1 (core)', 'L2 (gerencigeo-canvas)', 'L3 (componentes atômicos)', 'L4 (workstation)', 'L5 (entrypoints)'];

const PADROES_IMPORT = [
    /\b(?:import|export)\s[^'";]*?\sfrom\s*['"]([^'"]+)['"]/g, // import x from / export * from
    /\bimport\s*['"]([^'"]+)['"]/g,                             // import 'x' (efeito colateral)
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,                   // import('x')
    /@import\s+(?:url\()?['"]([^'"]+)['"]/g                     // @import 'x' em CSS
];

export function extrairImports(conteudo) {
    const semComentarios = conteudo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    // import/export type são apagados na compilação: não criam acoplamento em runtime nem afetam o tree-shaking
    const runtime = semComentarios.replace(/\b(?:import|export)\s+type\s[^;]*?from\s*['"][^'"]+['"]/g, '');
    const saida = new Set();
    for (const padrao of PADROES_IMPORT) {
        for (const m of runtime.matchAll(padrao)) saida.add(m[1]);
    }
    return [...saida];
}

function resolverDestino(arquivo, especificador) {
    if (!especificador.startsWith('.')) return null; // pacote externo
    return path.resolve(path.dirname(arquivo), especificador);
}

function listar(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const cheio = path.join(dir, e.name);
        return e.isDirectory() ? listar(cheio) : [cheio];
    });
}

const ehTeste = (f) => /\.(test|spec)\.tsx?$/.test(f);

/**
 * Módulos do motor de formas que precisam rodar em Node/SSR e em Web Worker: nada de `leaflet`, `window`, `document`.
 * Tudo em `gerencigeo-canvas/motor/` entra aqui; os demais são os `feature_*.ts` puros já extraídos.
 */
const PUROS_SEM_DOM = [
    'gerencigeo-canvas/motor',
    // núcleo de espaço e da prancha (canvas de elementos gráficos em mm): docs/canvas-prancha.md
    'gerencigeo-canvas/espaco',
    // booleanas de polígonos (Pathfinder), genéricas: docs/canvas-prancha.md, Fase 5
    'gerencigeo-canvas/booleanas',
    'gerencigeo-canvas/prancha',
    'gerencigeo-canvas/feature_types.ts',
    'gerencigeo-canvas/feature_metricas.ts',
    'gerencigeo-canvas/feature_formas.ts',
    'gerencigeo-canvas/feature_algoritmos.ts',
    'gerencigeo-canvas/feature_curvas.ts',
    'gerencigeo-canvas/feature_edicao_ops.ts',
    'gerencigeo-canvas/feature_snap.ts',
    'gerencigeo-canvas/feature_caixa.ts',
    'gerencigeo-canvas/feature_amostra.ts',
    'gerencigeo-canvas/feature_desenho.ts',
    'gerencigeo-canvas/feature_versoes.ts',
    'gerencigeo-canvas/feature_selecao.ts',
    'gerencigeo-canvas/feature_cluster.ts',
    'gerencigeo-canvas/feature_historico.ts',
    'gerencigeo-canvas/feature_lod.ts',
    'gerencigeo-canvas/feature_simplificacao.ts',
    'gerencigeo-canvas/feature_indice.ts',
    'gerencigeo-canvas/renderers/renderizador_formas.ts',
    'components/ui-cores/cores-utils.ts'
];
const ehPuroSemDom = (abs) => PUROS_SEM_DOM.some((p) => dentro(norm(abs), em(p)));
const GLOBAIS_DOM = /\b(window|document|localStorage|sessionStorage|requestAnimationFrame|ResizeObserver|HTMLElement)\b/;
/** Troca literais de texto por vazios: `'window'` (um valor, como o `ModoCaixa`) não é o global de navegador. */
export const semTextos = (codigo) => codigo.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, "''");

export function verificar(arquivos, ler = (f) => fs.readFileSync(f, 'utf-8')) {
    const violacoes = [];
    for (const arquivo of arquivos) {
        if (ehTeste(arquivo)) continue; // testes podem atravessar camadas
        const camadaOrigem = classificar(arquivo);
        if (camadaOrigem === null || camadaOrigem === 5) continue;

        if (ehPuroSemDom(arquivo)) {
            const codigo = ler(arquivo).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
            if (/(?:from|import\s*\(|require\()\s*['"]leaflet(?:\/[^'"]*)?['"]/.test(codigo)) {
                violacoes.push({ arquivo, motivo: 'Módulo puro do motor de formas não pode importar "leaflet" (roda em Node/SSR e em Worker).' });
            }
            const uso = semTextos(codigo).match(GLOBAIS_DOM);
            if (uso) {
                violacoes.push({ arquivo, motivo: `Módulo puro do motor de formas não pode usar o global de navegador "${uso[1]}".` });
            }
        }

        // L0 é só CSS: nenhum código TS/JS é permitido em src/tokens
        if (camadaOrigem === 0 && /\.(ts|js|mjs)$/.test(arquivo)) {
            violacoes.push({ arquivo, motivo: 'Tokens (L0) não podem conter TypeScript/JavaScript.' });
            continue;
        }

        const conteudo = ler(arquivo);
        const isolado = camadaOrigem === 4 ? L4_SEM_LEAFLET_ISOLADOS.find((d) => dentro(norm(arquivo), em('components', d))) : undefined;
        for (const esp of extrairImports(conteudo)) {
            if (isolado && /^leaflet(\/|$)/.test(esp)) {
                violacoes.push({ arquivo, motivo: `<${isolado}> não pode importar "leaflet" (é a prancha plana, sem mapa).` });
                continue;
            }
            const destino = resolverDestino(arquivo, esp);
            if (!destino) continue;
            const camadaDestino = classificar(destino);
            if (camadaDestino === null) continue;
            if (camadaOrigem === 0 && /\.(ts|js|mjs)$/.test(esp)) {
                violacoes.push({ arquivo, motivo: `L0 não pode depender de código (${esp}).` });
            } else if (camadaOrigem === 3 && dentro(norm(destino), em('gerencigeo-canvas'))) {
                violacoes.push({ arquivo, motivo: `${NOMES[3]} nunca importa o motor gerencigeo-canvas ("${esp}"); apenas L4 o consome.` });
            } else if (isolado && camadaDestino === 4 && !dentro(norm(destino), em('components', isolado))) {
                violacoes.push({ arquivo, motivo: `<${isolado}> não importa outro componente L4 ("${esp}"); a comunicação é por eventos e ui-bus.` });
            } else if (camadaDestino > camadaOrigem) {
                violacoes.push({ arquivo, motivo: `${NOMES[camadaOrigem]} importa ${NOMES[camadaDestino]} ("${esp}"); só é permitido importar camadas inferiores.` });
            }
        }
    }
    return violacoes;
}

/** Entrypoints que precisam rodar em Node/SSR e em Worker: nada que eles alcançam pode importar `leaflet`. */
const ENTRADAS_SEM_LEAFLET = ['motor.ts', 'prancha.ts', 'prancha-nucleo.ts'];

/**
 * Percorre os imports relativos (em runtime) a partir de uma entrada e acusa quem importa `leaflet`. `ler` devolve o
 * conteúdo de um arquivo (ou `null` se não existe); `resolver` completa a extensão.
 */
export function verificarEntradaSemLeaflet(
    entrada,
    ler = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf-8') : null),
    resolver = (base) => ['.ts', '/index.ts', ''].map((x) => base + x).find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null
) {
    const violacoes = [];
    const vistos = new Set();
    const fila = [entrada];
    while (fila.length > 0) {
        const arquivo = fila.pop();
        if (vistos.has(arquivo)) continue;
        vistos.add(arquivo);
        const conteudo = ler(arquivo);
        if (conteudo === null || conteudo === undefined) continue;
        const semComentarios = conteudo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
        const runtime = semComentarios.replace(/\b(?:import|export)\s+type\s[^;]*?from\s*['"][^'"]+['"]/g, '');
        for (const esp of extrairImports(conteudo)) {
            if (/^leaflet(\/|$)/.test(esp) && runtime.includes(esp)) {
                violacoes.push({ arquivo, motivo: `Alcançado por "${path.relative(SRC_DIR, entrada)}", que não pode depender de "leaflet" (${esp}).` });
            }
            const destino = resolverDestino(arquivo, esp);
            if (!destino) continue;
            const real = resolver(destino);
            if (real) fila.push(real);
        }
    }
    return violacoes;
}

const executadoDiretamente = process.argv[1] && norm(process.argv[1]) === norm(fileURLToPath(import.meta.url));
if (executadoDiretamente) {
    const arquivos = [...listar(SRC_DIR), path.join(RAIZ, 'ui-tokens.css')]
        .filter((f) => /\.(ts|tsx|css)$/.test(f) && fs.existsSync(f));
    const violacoes = [...verificar(arquivos), ...ENTRADAS_SEM_LEAFLET.flatMap((e) => verificarEntradaSemLeaflet(path.join(SRC_DIR, e)))];
    for (const v of violacoes) {
        console.error(`❌ ${path.relative(process.cwd(), v.arquivo)}`);
        console.error(`   ${v.motivo}\n`);
    }
    if (violacoes.length > 0) {
        console.error(`🚨 Falha na arquitetura: ${violacoes.length} violação(ões) de camada encontrada(s).`);
        process.exit(1);
    }
    console.log('✅ Arquitetura de camadas (L0 -> L5) íntegra.');
}
