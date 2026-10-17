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
    'ui-campo-texto', 'ui-checkbox', 'ui-radio', 'ui-switch', 'ui-segmented', 'ui-alerta', 'ui-tooltip',
    'ui-modal', 'ui-drawer', 'ui-lista-flutuante', 'ui-cores', 'ui-linha'
];
const WORKSTATION_L4 = [
    'ui-canvas-cad', 'ui-camadas', 'ui-tabela-propriedades', 'ui-tabela', 'ui-barra-ferramentas',
    'ui-mapa', 'ui-seletor-mapa-base'
];
const ENTRYPOINTS_L5 = [
    'index', 'register', 'botao', 'camadas', 'canvas', 'tabela', 'forms', 'tools',
    'campo-texto', 'card', 'cores', 'data', 'feedback', 'mapa', 'modal', 'seletor-mapa-base'
];

/** Utilitários puros declarados como L2 que ainda moram em diretórios de componentes (ver AGENTS.md §1). */
const UTILITARIOS_L2 = [
    'components/ui-tabela-propriedades/avaliador-expressao.ts',
    'components/ui-cores/cores-utils.ts'
];

const dentro = (p, dir) => p === dir || p.startsWith(`${dir}/`);

/** Classifica um caminho absoluto numa camada (0–5) ou null se estiver fora do mapa. */
export function classificar(abs) {
    const p = norm(abs);
    if (UTILITARIOS_L2.some((u) => p === em(u) || dentro(p, em(u)))) return 2;
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

export function verificar(arquivos, ler = (f) => fs.readFileSync(f, 'utf-8')) {
    const violacoes = [];
    for (const arquivo of arquivos) {
        if (ehTeste(arquivo)) continue; // testes podem atravessar camadas
        const camadaOrigem = classificar(arquivo);
        if (camadaOrigem === null || camadaOrigem === 5) continue;

        // L0 é só CSS: nenhum código TS/JS é permitido em src/tokens
        if (camadaOrigem === 0 && /\.(ts|js|mjs)$/.test(arquivo)) {
            violacoes.push({ arquivo, motivo: 'Tokens (L0) não podem conter TypeScript/JavaScript.' });
            continue;
        }

        const conteudo = ler(arquivo);
        for (const esp of extrairImports(conteudo)) {
            const destino = resolverDestino(arquivo, esp);
            if (!destino) continue;
            const camadaDestino = classificar(destino);
            if (camadaDestino === null) continue;
            if (camadaOrigem === 0 && /\.(ts|js|mjs)$/.test(esp)) {
                violacoes.push({ arquivo, motivo: `L0 não pode depender de código (${esp}).` });
            } else if (camadaOrigem === 3 && dentro(norm(destino), em('gerencigeo-canvas'))) {
                violacoes.push({ arquivo, motivo: `${NOMES[3]} nunca importa o motor gerencigeo-canvas ("${esp}"); apenas L4 o consome.` });
            } else if (camadaDestino > camadaOrigem) {
                violacoes.push({ arquivo, motivo: `${NOMES[camadaOrigem]} importa ${NOMES[camadaDestino]} ("${esp}"); só é permitido importar camadas inferiores.` });
            }
        }
    }
    return violacoes;
}

const executadoDiretamente = process.argv[1] && norm(process.argv[1]) === norm(fileURLToPath(import.meta.url));
if (executadoDiretamente) {
    const arquivos = [...listar(SRC_DIR), path.join(RAIZ, 'ui-tokens.css')]
        .filter((f) => /\.(ts|tsx|css)$/.test(f) && fs.existsSync(f));
    const violacoes = verificar(arquivos);
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
