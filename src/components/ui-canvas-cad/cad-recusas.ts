/**
 * Textos (pt-BR) das recusas do <ui-canvas-cad>: o motivo que sai em `cad-desenho-recusado` e `cad-edicao-recusada`
 * vira uma frase para o aviso visível e para o leitor de tela. Funções puras; motivo desconhecido recebe um texto genérico.
 */

const DESENHO: Record<string, string> = {
  'sem-camada': 'Escolha uma camada de desenho antes de usar esta ferramenta.',
  'camada-invalida': 'A camada de desenho não é uma camada de feições.',
  'camada-bloqueada': 'A camada de desenho está bloqueada.',
  'geometria-invalida': 'Não foi possível criar a figura: a geometria é inválida.'
};

const EDICAO: Record<string, string> = {
  bloqueada: 'Esta feição (ou a camada dela) está bloqueada e não pode ser editada.',
  'poligono-com-furos': 'Polígono com furos não pode ser editado no mapa.',
  multiparte: 'Feição com várias partes não pode ser editada no mapa.',
  'muitos-vertices': 'A feição tem vértices demais para editar no mapa.',
  'tipo-nao-suportado': 'Este tipo de feição não tem vértices para editar.',
  inexistente: 'A feição não existe mais.',
  'sem-selecao': 'Selecione uma feição para editar os vértices.'
};

function buscar(tabela: Record<string, string>, motivo: unknown, padrao: string): string {
  return typeof motivo === 'string' && Object.prototype.hasOwnProperty.call(tabela, motivo) ? tabela[motivo] : padrao;
}

export function textoDesenhoRecusado(motivo: unknown): string {
  return buscar(DESENHO, motivo, 'Não foi possível ativar a ferramenta de desenho.');
}

export function textoEdicaoRecusada(motivo: unknown): string {
  return buscar(EDICAO, motivo, 'Não foi possível editar os vértices desta feição.');
}
