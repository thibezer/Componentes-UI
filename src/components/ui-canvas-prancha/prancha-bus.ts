import { UIBus } from '../../core/ui-bus';
import { CANAL_COMANDOS_PRANCHA, type ComandoPrancha } from './tipos';

/*
 * Comandos pelo `ui-bus` (Regra #5): `UIBus.emit('prancha:comando', { alvo: 'minha-prancha', comando: 'girarSelecao',
 * args: [90] })`. Só os métodos públicos da lista abaixo podem ser chamados; o resto é recusado (`prancha-recusa` com
 * motivo `comando-desconhecido`). Sem `alvo`, todas as pranchas da página obedecem.
 */

export const COMANDOS_PRANCHA = [
  'definirFerramenta', 'selecionarElementos', 'alternarSelecaoElemento', 'limparSelecao', 'selecionarTudo', 'desfazer', 'refazer',
  'moverSelecao', 'girarSelecao', 'escalarSelecao', 'espelharSelecao', 'transformarSelecao', 'removerSelecao', 'definirRaiosCantos',
  'inserirPredefinicao', 'ajustarFolha', 'ajustarSelecao', 'definirZoom', 'aproximar', 'afastar', 'deslocarVista',
  'definirGuias', 'adicionarGuia', 'removerGuia', 'definirSnap', 'editarAncoras', 'concluirEdicao', 'definirOpcoesFerramentas',
  // Fase 4
  'definirCamadas', 'definirCamadaAtiva', 'moverSelecaoParaCamada', 'isolarGrupo', 'ordenarSelecao', 'trazerParaFrente', 'enviarParaTras',
  'avancar', 'recuar', 'agruparSelecao', 'desagruparSelecao', 'bloquearSelecao', 'ocultarSelecao', 'desbloquearTudo', 'mostrarTudo',
  'alinharSelecao', 'distribuirSelecao', 'duplicarSelecao', 'transformarDeNovo', 'copiar', 'recortar', 'colar', 'aplicarAparencia',
  'criarMascara', 'liberarMascara', 'unirSelecao', 'dividirSelecao', 'deslocarCaminho', 'simplificarSelecao', 'contornarTraco',
  'converterEmCaminho',
  // Fase 5
  'pathfinder', 'unirFormas', 'subtrairFrente', 'intersectarFormas', 'excluirSobreposicao',
  // Fase 6
  'aplicarPropriedade', 'alterarElementos'
] as const;

export type ComandoPublicoPrancha = (typeof COMANDOS_PRANCHA)[number];

export function ehComandoPrancha(v: unknown): v is ComandoPublicoPrancha {
  return typeof v === 'string' && (COMANDOS_PRANCHA as readonly string[]).includes(v);
}

/** Assina o canal; devolve a função que cancela (chamada no `disconnectedCallback`). */
export function assinarComandos(host: HTMLElement, executar: (comando: string, args: unknown[]) => unknown): () => void {
  return UIBus.on<ComandoPrancha>(CANAL_COMANDOS_PRANCHA, (dados) => {
    if (!dados || typeof dados !== 'object') return;
    if (dados.alvo !== undefined && dados.alvo !== host.id) return;
    executar(dados.comando, Array.isArray(dados.args) ? dados.args : []);
  });
}
