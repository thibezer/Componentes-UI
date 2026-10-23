#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Script de guarda pré-publicação (check-release-branch.mjs)
 * Impede que uma versão seja publicada no NPM a partir de uma branch de feature,
 * de uma worktree isolada ou com alterações não unificadas.
 */

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

console.log('\n🔍 [Release Guard] Verificando integridade da publicação no NPM...');

// 1. Permissão de bypass explícito via variável de ambiente (apenas para emergências)
if (process.env.ALLOW_FEATURE_PUBLISH === '1') {
  console.warn('⚠️ [Release Guard] AVISO: ALLOW_FEATURE_PUBLISH=1 detectado. Bypass ativado.');
  process.exit(0);
}

// 2. Verificar branch Git atual
const branch = run('git rev-parse --abbrev-ref HEAD');
if (!branch) {
  console.warn('⚠️ [Release Guard] Não foi possível determinar a branch Git atual. Continuando...');
} else if (branch !== 'main' && !branch.startsWith('release/')) {
  console.error(`\n❌ [BLOQUEIO DE PUBLICAÇÃO]`);
  console.error(`Você está na branch '${branch}'.`);
  console.error(`O 'npm publish' DEVE ser executado exclusivamente a partir da branch 'main' (ou 'release/*')`);
  console.error(`para evitar que alterações paralelas fiquem de fora do NPM.`);
  console.error(`\nConsulte: docs/protocolo-de-release-e-sincronizacao.md\n`);
  process.exit(1);
}

// 3. Verificar estado do working tree
const status = run('git status --porcelain');
if (status && status.length > 0) {
  console.error(`\n❌ [BLOQUEIO DE PUBLICAÇÃO]`);
  console.error(`Existem alterações locais não commitadas no working tree:`);
  console.error(status);
  console.error(`\nFaça commit ou stash antes de publicar.\n`);
  process.exit(1);
}

// 4. Verificar se há seções pendentes no CHANGELOG.md
const changelogPath = resolve(process.cwd(), 'CHANGELOG.md');
if (existsSync(changelogPath)) {
  const changelog = readFileSync(changelogPath, 'utf8');
  if (changelog.includes('## Não publicado')) {
    console.error(`\n❌ [BLOQUEIO DE PUBLICAÇÃO]`);
    console.error(`O CHANGELOG.md contém uma seção '## Não publicado'.`);
    console.error(`Associe as alterações à versão correta no CHANGELOG.md antes de publicar.\n`);
    process.exit(1);
  }
  if (changelog.includes('<<<<<<<') || changelog.includes('>>>>>>>')) {
    console.error(`\n❌ [BLOQUEIO DE PUBLICAÇÃO]`);
    console.error(`Marcadores de conflito Git detectados no CHANGELOG.md!\n`);
    process.exit(1);
  }
}

// 5. Verificar se a branch local está sincronizada com a remota
const remotos = run('git remote');
if (remotos && remotos.includes('origin')) {
  const behind = run('git rev-list --count HEAD..origin/main');
  if (behind && parseInt(behind, 10) > 0) {
    console.error(`\n❌ [BLOQUEIO DE PUBLICAÇÃO]`);
    console.error(`A sua branch local está ${behind} commit(s) atrás de origin/main.`);
    console.error(`Faça 'git pull' ou unifique antes de publicar.\n`);
    process.exit(1);
  }
}

console.log('✅ [Release Guard] Branch e repositório validados para publicação.\n');
process.exit(0);
