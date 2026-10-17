/**
 * Estados visuais e anúncios da <ui-tabela>: aviso de erro de carregamento, nome acessível e resultado do filtro.
 * Responsabilidade única: escrever texto e atributos nos elementos de estado; textos sempre via `textContent`.
 */
import type { UIFetchErroDetail } from './tipos';

export const TEXTO_ERRO_PADRAO = 'Não foi possível carregar os dados.';
export const TEXTO_SEM_RESULTADOS_PADRAO = 'Nenhum resultado para o filtro';

/** Mostra (ou oculta, com `null`) o aviso de erro com a ação "Tentar novamente". */
export function renderizarErroTabela(
  el: HTMLElement | null,
  erro: UIFetchErroDetail | null,
  textoErro: string | null,
  temUrlParaRepetir: boolean
): void {
  if (!el) return;
  if (!erro) {
    el.style.display = 'none';
    return;
  }
  const mensagem = el.querySelector('.ui-tabela__erro-mensagem');
  const detalhe = el.querySelector('.ui-tabela__erro-detalhe');
  if (mensagem) mensagem.textContent = textoErro || TEXTO_ERRO_PADRAO;
  if (detalhe) detalhe.textContent = erro.erro || '';
  // sem URL para repetir, a ação não faz sentido
  const acao = el.querySelector<HTMLElement>('.ui-tabela__erro-acao');
  if (acao) acao.style.display = temUrlParaRepetir ? '' : 'none';
  el.style.display = 'flex';
}

/** Anuncia ao leitor de tela o resultado do filtro (a região é limpa sem filtro ativo). */
export function anunciarResultadoFiltro(
  regiao: HTMLElement | null,
  quantidade: number,
  temFiltro: boolean,
  textoSemResultados: string
): void {
  if (!regiao) return;
  regiao.textContent = temFiltro
    ? (quantidade === 0 ? textoSemResultados : `${quantidade} ${quantidade === 1 ? 'registro encontrado' : 'registros encontrados'}`)
    : '';
}

export interface ElementosAria {
  tabela: HTMLElement | null;
  container: HTMLElement | null;
}

/**
 * Nome acessível vem do host (`aria-label`): vai à tabela e, como região rolável nomeada, ao contêiner
 * (leitores de tela anunciam o contêiner e o teclado alcança a rolagem). `aria-busy` acompanha o carregamento.
 */
export function sincronizarAriaTabela({ tabela, container }: ElementosAria, rotulo: string | null, carregando: boolean): void {
  if (!tabela) return;
  if (rotulo) tabela.setAttribute('aria-label', rotulo);
  else tabela.removeAttribute('aria-label');
  tabela.setAttribute('aria-busy', String(carregando));
  if (!container) return;
  if (rotulo) {
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', rotulo);
  } else {
    container.removeAttribute('role');
    container.removeAttribute('aria-label');
  }
}
