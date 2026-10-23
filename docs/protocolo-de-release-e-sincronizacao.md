# Protocolo de Release, Unificação e Publicação NPM

> **Diretriz Operacional Obrigatória** para desenvolvedores e agentes de IA que atuam no repositório `@thibezer/ui-components-kit`.

---

## 1. Contexto e Motivação (Post-Mortem)

Em versões anteriores (notadamente entre as versões `2.10.0` e `2.11.0`), ocorreram situações em que uma funcionalidade concluída e testada ficou **fora da versão publicada no NPM**:

* **O Cenário de Erro:** Duas ou mais branches de trabalho paralelas foram criadas a partir do mesmo commit base (ex.: PR #14 para redesenho do seletor de cores e PR #15 para suporte a linhas CAD no `<ui-canvas-cad>`).
* **A Falha Operacional:** Uma das branches foi publicada no NPM diretamente de uma worktree/branch de feature isolada, antes que as demais branches daquela iteração fossem integradas à branch `main`.
* **A Consequência:** A versão publicada no registro público (NPM) não continha as alterações da outra branch, deixando funcionalidades orfãs marcadas como `## Não publicado` no `CHANGELOG.md` e a branch `main` do GitHub defasada.

Este documento estabelece o **protocolo inegociável** para impedir que essa dessincronização ocorra novamente.

---

## 2. A Regra de Ouro da Publicação

> [!CAUTION]
> **É ESTRITAMENTE PROIBIDO EXECUTAR `npm publish` A PARTIR DE BRANCHES DE FEATURE OU WORKTREES ISOLADAS.**
> 
> Toda publicação no registro NPM deve ser executada **obrigatoriamente a partir da branch `main`** (ou de uma branch de release unificada `release/vX.Y.Z`) que contenha **todos os PRs e alterações do ciclo devidamente mesclados**.

---

## 3. Checklist de Liberação de Release (7 Etapas Obrigatórias)

Antes de rodar qualquer publicação, o operador (humano ou IA) deve seguir rigorosamente as 7 etapas abaixo:

### Etapa 1: Auditoria de PRs e Branches Abertas
Verifique se há PRs abertos ou branches remotas/locais com trabalho concluído para esta versão:
```bash
# 1. Listar Pull Requests abertos no repositório
gh pr list

# 2. Verificar commits existentes em branches que ainda não estão na main
git log --branches --remotes --not main --oneline
```
Se houver PRs ou branches com funcionalidades prontas que devam fazer parte do release, **faça o merge na `main` antes de prosseguir**.

---

### Etapa 2: Sincronização Local com a `main`
Certifique-se de estar na branch `main` e com o histórico atualizado:
```bash
git checkout main
git pull origin main
```

---

### Etapa 3: Auditoria do `CHANGELOG.md`
Abra o arquivo [`CHANGELOG.md`](../CHANGELOG.md) e confirme:
1. **Nenhuma seção `## Não publicado`:** Todas as melhorias concluídas devem estar alocadas sob o cabeçalho da nova versão (ex.: `## 2.11.1 — AAAA-MM-DD`).
2. **Zero marcadores de conflito Git:** Nenhum `<<<<<<<`, `=======` ou `>>>>>>>`.
3. Todas as alterações dos PRs integrados estão descritas com clareza.

---

### Etapa 4: Incremento de Versão (SemVer)
Atualize a versão no `package.json` e no `package-lock.json` de acordo com a especificação SemVer:
* **Patch (`x.y.Z`):** Correções de bugs, pequenas melhorias estéticas ou unificação de itens esquecidos.
* **Minor (`x.Y.0`):** Novos componentes, novos atributos públicos, extensões retrocompatíveis.
* **Major (`X.0.0`):** Mudanças que quebram contratos existentes (breaking changes).

```bash
# Atualiza package.json e package-lock.json
npm version patch --no-git-tag-version
# ou minor:
# npm version minor --no-git-tag-version
```

---

### Etapa 5: Execução do Quality Gate Completo
Nenhuma versão é publicada sem passar por 100% dos testes e verificações estáticas:
```bash
npm run gate:full
```
O comando executa:
1. `npm run check:layers`: Garante que a arquitetura em camadas ($L_0 \to L_5$) não foi violada.
2. `npm run check:types`: TypeScript estrito (`tsc --noEmit`) sem erros.
3. `npm run test:run`: Todos os testes do Vitest (unitários, regressão e SSR).
4. `npm run build`: Build de produção (ESM, CJS, CSS) e manifesto Web Components (`custom-elements.json`).
5. `npm run check:framework-types`: Validação de tipos para React e Vue.

---

### Etapa 6: Commit, Tag Git e Push para o GitHub
Consolide o release na `main` e gere a tag Git correspondente:
```bash
git add package.json package-lock.json CHANGELOG.md dist/
git commit -m "chore(release): versão X.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main --tags
```

---

### Etapa 7: Publicação no NPM
Com a `main` atualizada e tagueada:
```bash
npm publish --access public
```

---

## 4. Salvaguardas Automatizadas (`scripts/check-release-branch.mjs`)

Para garantir que a regra não dependa apenas de memória humana, o hook `prepublishOnly` no `package.json` executa automaticamente o script de guarda:

```json
"scripts": {
  "check:release": "node scripts/check-release-branch.mjs",
  "prepublishOnly": "npm run check:release && npm test && npm run build && npm run test:tipos"
}
```

O script cancela a publicação imediatamente com código de erro nos seguintes casos:
1. Execução a partir de uma branch diferente de `main` ou `release/*`.
2. Working tree suja com arquivos modificados ou não rastreados.
3. Presença de seções `## Não publicado` ou marcadores de conflito no `CHANGELOG.md`.
4. Branch local desatualizada em relação a `origin/main`.

---

## 5. Procedimento de Remediação (Se Algo Ficar de Fora)

Caso uma funcionalidade tenha ficado de fora de uma versão já publicada:

1. **Não tentar republicar a mesma versão:** O registro NPM proíbe sobrescrever versões já publicadas.
2. **Mesclar imediatamente a branch faltante na `main`:**
   ```bash
   git checkout main
   git merge origin/nome-da-branch-faltante
   ```
3. **Gerar imediatamente um patch release (`x.y.Z+1`):**
   * Documentar no `CHANGELOG.md`: `"Junta à x.y.Z o que estava fora do npm: [descrição da feature]"`.
   * Incrementar a versão no `package.json`.
   * Rodar `npm run gate:full`.
   * Fazer o commit, tag e `npm publish`.
4. **Fechar a PR correspondente no GitHub** com nota referenciando a versão corretiva.
