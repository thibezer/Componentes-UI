import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Teste de empacotamento (roda DEPOIS do `npm run build`, faz parte do `gate:full`):
 *  1. `sideEffects` do package.json cobre TODO arquivo do dist que registra custom element ou mexe em `window`/`document` no
 *     escopo do módulo (senão um empacotador o descartaria e a tag deixaria de ser registrada);
 *  2. o fecho de imports de `dist/prancha-nucleo.js` não tem nenhum desses arquivos;
 *  3. um bundle mínimo (esbuild) só com `@thibezer/ui-components-kit/prancha/nucleo` não contém `HTMLElement`, Custom
 *     Elements, CSS nem `document`/`window`, e cabe no orçamento de tamanho.
 */

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(RAIZ, 'dist');

/** Orçamento do bundle do núcleo (bytes): 165,3 kB medidos (bundle esbuild do núcleo, 2.23.0; o fecho de imports tem 187,6 kB) + 10% de margem. */
export const ORCAMENTO_NUCLEO_BYTES = 182 * 1024;

/** Converte um glob do `sideEffects` (`*`, `**`, `?`) em regex sobre o caminho relativo à raiz do pacote. */
export function globParaRegex(glob) {
    const limpo = glob.replace(/^\.\//, '');
    let r = '';
    for (let i = 0; i < limpo.length; i++) {
        const c = limpo[i];
        if (c === '*') {
            if (limpo[i + 1] === '*') { r += '.*'; i++; if (limpo[i + 1] === '/') i++; } else r += '[^/]*';
        } else if (c === '?') r += '[^/]';
        else r += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`^${r}$`);
}

/** O arquivo (caminho relativo, com `/`) é coberto por algum glob de `sideEffects`? */
export const coberto = (arquivo, globs) => globs.some((g) => globParaRegex(g).test(arquivo.replace(/^\.\//, '')));

/** Efeito colateral no ESCOPO DO MÓDULO (coluna 0 no código do Rollup): registra tag ou usa o DOM/janela. */
const EFEITO = /^(?:[\w$]+\(['"]ui-[a-z0-9-]+['"],|definirCustomElement\(|customElements\.define\(|(?:window|document)\.addEventListener\(|if \(typeof (?:document|window)\b)/m;
const PROIBIDO_NO_NUCLEO = /\b(?:HTMLElement|customElements|attachShadow|ShadowRoot|document\.|window\.|localStorage|requestAnimationFrame)\b/;

function listarArquivosDoDist() {
    return fs.readdirSync(DIST).filter((f) => /\.(js|cjs)$/.test(f)).map((f) => `dist/${f}`);
}

/** Fecho de imports relativos (ESM) de um arquivo do dist. */
export function fecho(entrada) {
    const vistos = new Set([entrada]);
    const fila = [entrada];
    while (fila.length) {
        const f = fila.pop();
        const s = fs.readFileSync(path.join(RAIZ, f), 'utf-8');
        for (const m of s.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) {
            const n = `dist/${m[1]}`;
            if (!vistos.has(n)) { vistos.add(n); fila.push(n); }
        }
    }
    return [...vistos];
}

export async function verificar() {
    const erros = [];
    const info = {};
    const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf-8'));
    if (!Array.isArray(pkg.sideEffects)) erros.push('package.json: "sideEffects" deve ser uma lista de globs (não pode faltar nem ser `false` puro: as tags se registram por efeito colateral).');
    const globs = Array.isArray(pkg.sideEffects) ? pkg.sideEffects : [];

    // 1. todo arquivo com efeito está coberto
    const comEfeito = [];
    for (const arq of listarArquivosDoDist()) {
        const conteudo = fs.readFileSync(path.join(RAIZ, arq), 'utf-8');
        if (EFEITO.test(conteudo)) {
            comEfeito.push(arq);
            if (!coberto(arq, globs)) erros.push(`${arq} tem efeito colateral (registra tag ou usa window/document) mas não está em "sideEffects".`);
        }
    }
    info.arquivosComEfeito = comEfeito.length;

    // 2. o núcleo é puro
    const fechoNucleo = fecho('dist/prancha-nucleo.js');
    for (const arq of fechoNucleo) {
        if (comEfeito.includes(arq)) erros.push(`${arq} (efeito colateral) é alcançável a partir de prancha-nucleo.js.`);
        if (coberto(arq, globs) && !/\.css$/.test(arq) && arq !== 'dist/prancha-nucleo.js') erros.push(`${arq} está no fecho do núcleo e coberto por "sideEffects" (o núcleo não deve conter arquivos com efeito).`);
    }
    if (coberto('dist/prancha-nucleo.js', globs) || coberto('dist/prancha-nucleo.cjs', globs)) erros.push('prancha-nucleo não pode constar em "sideEffects".');
    info.arquivosDoNucleo = fechoNucleo.length;

    // 3. bundle mínimo com esbuild
    let esbuild = null;
    try { esbuild = await import('esbuild'); } catch { erros.push('esbuild não está instalado (devDependency).'); }
    if (esbuild) {
        const r = await esbuild.build({
            stdin: { contents: "export * from './dist/prancha-nucleo.js';", resolveDir: RAIZ, loader: 'js' },
            bundle: true, write: false, format: 'esm', platform: 'neutral', treeShaking: true, logLevel: 'silent', external: ['leaflet']
        });
        const codigo = r.outputFiles[0].text;
        info.bundleNucleoBytes = Buffer.byteLength(codigo);
        const achado = codigo.match(PROIBIDO_NO_NUCLEO);
        if (achado) erros.push(`o bundle do núcleo contém "${achado[0]}" (DOM/Custom Elements não pertencem ao núcleo).`);
        if (info.bundleNucleoBytes > ORCAMENTO_NUCLEO_BYTES) erros.push(`o bundle do núcleo tem ${(info.bundleNucleoBytes / 1024).toFixed(1)} kB e passa do orçamento de ${(ORCAMENTO_NUCLEO_BYTES / 1024).toFixed(0)} kB.`);
        // importar só uma função pequena não pode arrastar o núcleo inteiro com efeitos
        const pequeno = await esbuild.build({
            stdin: { contents: "import { caixaDoQuadro } from './dist/prancha-nucleo.js'; console.log(caixaDoQuadro(1, 1, { esquerda: 0, direita: 0, superior: 0, inferior: 0 }));", resolveDir: RAIZ, loader: 'js' },
            bundle: true, write: false, format: 'esm', platform: 'neutral', treeShaking: true, logLevel: 'silent', external: ['leaflet']
        });
        info.bundleUmaFuncaoBytes = Buffer.byteLength(pequeno.outputFiles[0].text);
    }
    return { erros, info };
}

const direto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direto) {
    if (!fs.existsSync(DIST)) { console.error('dist/ não existe: rode `npm run build` antes.'); process.exit(1); }
    const { erros, info } = await verificar();
    console.log(`núcleo: ${info.arquivosDoNucleo} arquivos no fecho, bundle ${((info.bundleNucleoBytes ?? 0) / 1024).toFixed(1)} kB (uma função: ${((info.bundleUmaFuncaoBytes ?? 0) / 1024).toFixed(1)} kB); ${info.arquivosComEfeito} arquivos com efeito colateral.`);
    for (const e of erros) console.error(`❌ ${e}`);
    if (erros.length) process.exit(1);
    console.log('✅ Empacotamento íntegro (sideEffects e núcleo puro).');
}
