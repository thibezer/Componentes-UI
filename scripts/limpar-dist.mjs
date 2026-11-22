import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Esvazia `dist/` antes de cada build (`prebuild`). O `vite build` em modo biblioteca não remove os chunks com hash de
 * builds anteriores, que iam parar no pacote publicado (ex.: `ui-tabela-propriedades-*.js` em 3 cópias, 534 arquivos).
 *
 * Remoção manual (unlink/rmdir): o `fs.rmSync` do Node 24.13 no Windows retornava sem apagar nada, em silêncio, em pastas
 * com caminho não ASCII (como `Programação`).
 */
export function limparPasta(dir) {
    if (!fs.existsSync(dir)) return 0;
    let removidos = 0;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const cheio = path.join(dir, e.name);
        if (e.isDirectory()) {
            removidos += limparPasta(cheio);
            fs.rmdirSync(cheio);
        } else {
            fs.unlinkSync(cheio);
            removidos++;
        }
    }
    return removidos;
}

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const n = limparPasta(path.join(raiz, 'dist'));
    console.log(`dist/ limpo (${n} arquivos).`);
}
