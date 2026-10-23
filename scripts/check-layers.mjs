import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('src');

// Regras de fronteira baseadas na arquitetura do Componentes-UI:
// Um diretório nunca pode importar os padrões listados em "forbidden"
const RULES = [
    {
        layer: 'L0 (src/tokens)',
        dir: path.join(SRC_DIR, 'tokens'),
        forbidden: [/from\s+['"].*\.(ts|js)['"]/],
        reason: 'Tokens CSS (L0) não devem depender de módulos TypeScript/JavaScript.'
    },
    {
        layer: 'L1 (src/core)',
        dir: path.join(SRC_DIR, 'core'),
        forbidden: [
            /from\s+['"].*components\//,
            /from\s+['"].*gerencigeo-canvas\//
        ],
        reason: 'O núcleo src/core/ (L1) não pode importar componentes (L3/L4) nem o gerencigeo-canvas (L2).'
    },
    {
        layer: 'L2 (src/gerencigeo-canvas)',
        dir: path.join(SRC_DIR, 'gerencigeo-canvas'),
        forbidden: [
            /from\s+['"].*components\//
        ],
        reason: 'O motor src/gerencigeo-canvas/ (L2) deve ser desacoplado de src/components/ (L3/L4).'
    }
];

function getFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        return entry.isDirectory() ? getFiles(fullPath) : [fullPath];
    });
}

let violations = 0;

for (const rule of RULES) {
    const files = getFiles(rule.dir).filter((f) => f.endsWith('.ts') || f.endsWith('.css'));
    for (const file of files) {
        // Ignora arquivos de teste na checagem de acoplamento de produção
        if (file.endsWith('.test.ts')) continue;

        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of rule.forbidden) {
            if (pattern.test(content)) {
                console.error(`❌ Violação em [${rule.layer}]: ${path.relative(process.cwd(), file)}`);
                console.error(`   Motivo: ${rule.reason}\n`);
                violations++;
            }
        }
    }
}

if (violations > 0) {
    console.error(`🚨 Falha na arquitetura: ${violations} violação(ões) de camada encontrada(s).`);
    process.exit(1);
} else {
    console.log('✅ Arquitetura de camadas (L0 -> L5) íntegra.');
}