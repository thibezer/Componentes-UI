import type { Par } from '../../gerencigeo-canvas/feature_types';
import { elementoNoTopo } from '../../gerencigeo-canvas/prancha/elemento_consulta';
import { adicionarAncora, converterAncora, excluirAncora } from '../../gerencigeo-canvas/prancha/elemento_edicao';
import { ancoraMaisProxima, trechoMaisProximo } from '../../gerencigeo-canvas/prancha/operacoes_caminho';
import type { ElementoGrafico } from '../../gerencigeo-canvas/prancha/tipos';
import type { ControladorPrancha } from './prancha-controlador';
import { contaGotas } from './prancha-comandos-organizacao';
import type { FerramentaPrancha } from './tipos';

/*
 * Ferramentas de clique que editam o que já existe (Fase 4): conta-gotas (I), adicionar âncora (+), excluir âncora (−) e
 * converter âncora (Shift+C). As de âncora procuram primeiro nos elementos selecionados e depois no que está sob o cursor.
 */

export const FERRAMENTAS_DE_EDICAO: readonly FerramentaPrancha[] = ['conta-gotas', 'adicionar-ancora', 'excluir-ancora', 'converter-ancora'];

export const ehFerramentaDeEdicao = (f: FerramentaPrancha): boolean => FERRAMENTAS_DE_EDICAO.includes(f);

/** Tolerância (mm) para achar âncora ou trecho: ~8 px na tela (19 no toque). */
const tolerancia = (c: ControladorPrancha, toque: boolean): number => (toque ? 19 : 8) / c.vista.zoom;

function candidatos(c: ControladorPrancha, p: Par, toque: boolean): ElementoGrafico[] {
  const tol = tolerancia(c, toque);
  const sel = c.doc.elementosSelecionados();
  const sob = elementoNoTopo(p, c.candidatosEm(p, tol + 2), { tolerancia: tol, camadas: c.camadas });
  return sob && !sel.includes(sob) ? [...sel, sob] : sel;
}

/** Trata o clique da ferramenta; devolve se algo mudou. */
export function cliqueFerramentaDeEdicao(c: ControladorPrancha, p: Par, toque: boolean): boolean {
  const f = c.ferramenta;
  const tol = tolerancia(c, toque);
  if (f === 'conta-gotas') {
    const origem = elementoNoTopo(p, c.candidatosEm(p, tol + 2), { tolerancia: tol, camadas: c.camadas, incluirBloqueados: true });
    return origem ? contaGotas(c, origem) : false;
  }
  if (c.somenteLeitura) { c.recusar('editar-ancoras', 'somente-leitura'); return false; }
  for (const el of candidatos(c, p, toque)) {
    if (!c.podeSelecionar(el)) continue;
    let novo: ElementoGrafico | null = null;
    if (f === 'adicionar-ancora') {
      const i = trechoMaisProximo(el, p, tol);
      if (i === null) continue;
      novo = adicionarAncora(el, i, p);
    } else {
      const i = ancoraMaisProxima(el, p, tol);
      if (i === null) continue;
      novo = f === 'excluir-ancora' ? excluirAncora(el, i) : converterAncora(el, i);
      if (!novo) {
        c.recusar(f, f === 'excluir-ancora' ? 'minimo-de-ancoras' : 'tipo-nao-suportado', el.id);
        return false;
      }
    }
    if (!novo) {
      c.recusar(f, el.geometria.tipo === 'texto' ? 'texto-sem-ancoras' : 'tipo-nao-suportado', el.id);
      return false;
    }
    c.aplicarSubstituicoes([novo], 'editar-ancoras');
    if (!c.doc.selecao.includes(novo.id)) c.selecionar([novo.id], 'substituir', false);
    return true;
  }
  return false;
}
