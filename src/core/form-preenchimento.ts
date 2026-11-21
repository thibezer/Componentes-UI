/**
 * Preenchimento programático seguro de formulário (ex.: "achei esse CPF no cadastro, preencher o resto").
 * Por padrão só escreve em campos vazios: o que o usuário já digitou nunca é sobrescrito em silêncio.
 * Os campos mantidos ficam em `conflitos` (a aplicação pode oferecer "Substituir") e tudo é reversível com `desfazer()`.
 */
import { SELETOR_CAMPOS_PADRAO, definirValorCampo, lerValorCampo, localizarCampo } from './form-campos';

export interface OpcoesPreenchimento {
  /** `true` (padrão): campos já preenchidos são mantidos e listados em `conflitos`. */
  somenteVazios?: boolean;
  /** O valor atual conta como "vazio"? Útil para padrões como `'brasileiro(a)'`. Padrão: texto em branco. */
  vazioSe?: (chave: string, valorAtual: string) => boolean;
  /** Seletor dos campos considerados. */
  seletor?: string;
}

export interface ResultadoPreenchimento {
  /** Chaves escritas (inclui as substituídas por `substituirConflitos`). */
  aplicados: string[];
  /** Chaves com valor diferente já preenchido, mantidas como estavam. */
  conflitos: string[];
  /** Chaves sem campo correspondente em `raiz`. */
  semAlvo: string[];
  /** Escreve os valores dos `conflitos` (o desfazer inclui essas trocas). */
  substituirConflitos(): void;
  /** Devolve todos os campos tocados aos valores anteriores. Idempotente. */
  desfazer(): void;
}

const CHAVES_PERIGOSAS = new Set(['__proto__', 'constructor', 'prototype']);

const converter = (valor: unknown): string => {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return valor ? '1' : '0';
  return String(valor);
};

export function preencherCampos(
  raiz: ParentNode | null | undefined,
  valores: Record<string, unknown> | null | undefined,
  opcoes: OpcoesPreenchimento = {}
): ResultadoPreenchimento {
  const somenteVazios = opcoes.somenteVazios !== false;
  const vazioSe = opcoes.vazioSe ?? ((_chave: string, atual: string) => atual.trim() === '');
  const seletor = opcoes.seletor ?? SELETOR_CAMPOS_PADRAO;

  const aplicados: string[] = [];
  const conflitos: string[] = [];
  const semAlvo: string[] = [];
  const anteriores: Array<{ campo: Element; valor: string }> = [];
  const pendentes: Array<{ chave: string; campo: Element; valor: string }> = [];
  let desfeito = false;

  const avisar = () => {
    if (raiz && typeof (raiz as Element).dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      (raiz as Element).dispatchEvent(new CustomEvent('ui-campos-preenchidos', { bubbles: true, detail: { aplicados: [...aplicados] } }));
    }
  };

  const escrever = (chave: string, campo: Element, valor: string) => {
    anteriores.push({ campo, valor: lerValorCampo(campo) });
    definirValorCampo(campo, valor);
    if (!aplicados.includes(chave)) aplicados.push(chave);
  };

  if (valores && typeof valores === 'object') {
    for (const chave of Object.keys(valores)) {
      if (CHAVES_PERIGOSAS.has(chave)) continue;
      const campo = localizarCampo(raiz, chave, seletor);
      if (!campo) {
        semAlvo.push(chave);
        continue;
      }
      const novo = converter(valores[chave]);
      // Dado ausente na origem nunca apaga o que o usuário digitou.
      if (novo === '') continue;
      const atual = lerValorCampo(campo);
      if (novo === atual) continue;
      if (!somenteVazios || vazioSe(chave, atual)) {
        escrever(chave, campo, novo);
      } else {
        conflitos.push(chave);
        pendentes.push({ chave, campo, valor: novo });
      }
    }
  }

  if (aplicados.length > 0) avisar();

  return {
    aplicados,
    conflitos,
    semAlvo,
    substituirConflitos() {
      if (desfeito || pendentes.length === 0) return;
      pendentes.splice(0).forEach(({ chave, campo, valor }) => escrever(chave, campo, valor));
      avisar();
    },
    desfazer() {
      if (desfeito) return;
      desfeito = true;
      for (let i = anteriores.length - 1; i >= 0; i--) definirValorCampo(anteriores[i].campo, anteriores[i].valor);
      anteriores.length = 0;
      avisar();
    }
  };
}
