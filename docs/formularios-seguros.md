# Formulários seguros (rascunho, preenchimento reversível, erros inline, confirmação)

Peças do núcleo (`@thibezer/ui-components-kit` ≥ 2.19.0) para formulários de cadastro usados em alta frequência.
Todas são DOM puro, SSR-safe e não lançam exceção com entradas hostis.

## 1. Rascunho — "tem alteração não salva?"

```ts
import { criarRascunhoFormulario, confirmarDescarteSeSujo } from '@thibezer/ui-components-kit';

const rascunho = criarRascunhoFormulario(form, {
  estadoExterno: () => coproprietarios,          // listas fora dos campos (JSON-serializável)
  aoMudar: (sujo) => badge.hidden = !sujo,        // "Alterações não salvas"
});

abrirRegistro(); rascunho.marcarLimpo();          // linha de base depois de preencher
cancelar.onclick = async () => { if (await confirmarDescarteSeSujo(rascunho)) fechar(); };
salvar();         rascunho.marcarLimpo();
```

Campos são identificados por `name`, senão `id`. Arquivos e `type="hidden"` são ignorados.

## 2. Preenchimento reversível

```ts
const r = preencherCampos(form, dadosDoCadastro, {
  vazioSe: (chave, atual) => atual.trim() === '' || (chave === 'nacionalidade' && atual === 'brasileiro(a)'),
});
// r.aplicados, r.conflitos (mantidos), r.semAlvo; r.desfazer(); r.substituirConflitos();
```

Valores vazios/nulos na origem nunca apagam o que o usuário digitou. Dispara `ui-campos-preenchidos` (o rascunho escuta).
Combine com `UIToast.notificar({ acao: { rotulo: 'Desfazer', onClick: r.desfazer }, duracao: 8000 })`.

## 3. Erros inline

```ts
const parar = observarLimpezaDeErros(form);
const { valido, erros } = validarCampos(form, {
  'input-conf-nome': (v) => v.trim() ? null : 'Informe o nome.',
  'input-conf-cpf':  (v) => erroCpfCnpj(v),
}, { ignorar: (campo) => campo.closest('.hidden') !== null });
```

Marca `erro` + `mensagem-erro` (exibidos por `ui-campo-texto`/`ui-area-texto`), devolve os erros na ordem do DOM e foca o primeiro.

## 4. Confirmação

`confirmarAcao({ titulo, mensagem, rotuloConfirmar, rotuloCancelar?, destrutivo? }): Promise<boolean>` — use verbos explícitos
("Remover matrícula"), nunca "OK". Esc, fundo e X resolvem `false`.
