import { ListenerBag } from '../../core/listener-bag';
import type { CamadaPrancha } from '../../gerencigeo-canvas/prancha/tipos';
import type { UICanvasPrancha } from './ui-canvas-prancha';
import { camadaDoPainel, camadasComMudanca, camadasNaOrdemDoPainel, CAMADA_SEM_CAMADA } from './prancha-painel-camadas';
import { FERRAMENTAS_PALETA_PRANCHA, ferramentaDaPaleta } from './prancha-paleta';

/*
 * Cola entre a prancha e os painéis do kit (paleta de ferramentas, camadas, propriedades). Usa só EVENTOS e propriedades
 * públicas: a prancha continua sem importar os outros componentes (L4 não importa L4), e os painéis aqui são tipados por
 * estrutura (qualquer elemento com a mesma forma serve). Vive neste módulo (e não em `ui-canvas-prancha.ts`) para a
 * prancha poder ser usada sozinha; o `<ui-editor-prancha>` e o playground a usam.
 */

/** O que a função precisa da paleta (`<ui-paleta-ferramentas>`). */
export interface PaletaLigavel extends EventTarget {
  ferramentas?: unknown;
  valor?: unknown;
}

/** O que a função precisa do painel de camadas (`<ui-camadas>`). */
export interface CamadasLigavel extends EventTarget {
  definirCamadas(camadas: never[], feicoes?: never[]): void;
  selecionarFeicoes?(ids: string[]): void;
}

/** O que a função precisa do painel de propriedades (`<ui-tabela-propriedades>`). */
export interface PropriedadesLigavel extends EventTarget {
  categorias?: unknown;
}

export interface OpcoesLigarPaineis {
  prancha: UICanvasPrancha;
  paleta?: PaletaLigavel | null;
  camadas?: CamadasLigavel | null;
  propriedades?: PropriedadesLigavel | null;
  /** Sem camadas definidas, lista os elementos direto na raiz do painel (sem "Sem camada"). Padrão `true`. */
  listaPlana?: boolean;
}

/** Eventos da prancha que mudam os dados dos painéis. */
const EVENTOS_DE_DADOS = ['prancha-elemento-criado', 'prancha-elemento-atualizado', 'prancha-elemento-removido', 'prancha-ordem', 'prancha-camadas'];

const detalhe = <T>(e: Event): T => ((e as CustomEvent<T>).detail ?? ({} as T));

/**
 * Liga a prancha aos painéis e devolve o desligador (idempotente; remove todos os ouvintes). Os métodos dos painéis
 * (`definirCamadas`, `selecionarFeicoes`, `categorias =`) não reemitem eventos, então não há laço. Chamar de novo para a
 * mesma prancha depois de desligar religa sem duplicar nada. Nunca lança por painel ausente.
 */
export function ligarPaineisPrancha(opcoes: OpcoesLigarPaineis): () => void {
  const { prancha, paleta, camadas: painelCamadas, propriedades } = opcoes ?? ({} as OpcoesLigarPaineis);
  if (!prancha) return () => {};
  const bag = new ListenerBag();
  const ouvir = <T>(alvo: EventTarget, nome: string, f: (d: T) => void): void => bag.add(alvo, nome, (e: Event) => { try { f(detalhe<T>(e)); } catch { /* um painel com defeito não derruba a prancha */ } });

  // ---------- paleta ----------
  if (paleta) {
    paleta.ferramentas = FERRAMENTAS_PALETA_PRANCHA;
    paleta.valor = prancha.ferramenta;
    ouvir<{ valor: string }>(paleta, 'ui-change', (d) => {
      const f = ferramentaDaPaleta(d.valor);
      if (f) prancha.definirFerramenta(f);
    });
    ouvir<{ ferramenta: string }>(prancha, 'prancha-ferramenta', (d) => { paleta.valor = d.ferramenta; });
  }

  // ---------- propriedades ----------
  const atualizarPropriedades = (): void => { if (propriedades) propriedades.categorias = prancha.categoriasDePropriedades(); };
  if (propriedades) ouvir<{ id: string; valor: unknown }>(propriedades, 'ui-propriedade-alterada', (d) => { prancha.aplicarPropriedade(d.id, d.valor); });

  // ---------- camadas ----------
  const atualizarCamadas = (): void => {
    if (!painelCamadas) return;
    const d = prancha.dadosParaPainelDeCamadas({ ocultarSemCamada: opcoes.listaPlana !== false });
    painelCamadas.definirCamadas(d.camadas as never[], d.feicoes as never[]);
    painelCamadas.selecionarFeicoes?.(prancha.selecao);
  };
  const mudarCamada = (id: string, m: Parameters<typeof camadasComMudanca>[2]): void => {
    if (id !== CAMADA_SEM_CAMADA) prancha.definirCamadas(camadasComMudanca(prancha.obterCamadas(), id, m));
  };
  if (painelCamadas) {
    const p = painelCamadas;
    ouvir<{ camadaId: string; visivel: boolean }>(p, 'ui-camada-visibilidade', (d) => mudarCamada(d.camadaId, { visivel: d.visivel }));
    ouvir<{ camadaId: string; bloqueado: boolean }>(p, 'ui-camada-bloqueio', (d) => mudarCamada(d.camadaId, { bloqueada: d.bloqueado }));
    ouvir<{ camadaId: string; opacidade: number }>(p, 'ui-camada-opacidade', (d) => mudarCamada(d.camadaId, { opacidade: d.opacidade }));
    ouvir<{ camadaId: string; novoNome: string }>(p, 'ui-camada-renomeada', (d) => mudarCamada(d.camadaId, { nome: d.novoNome }));
    ouvir<{ camadaId: string }>(p, 'ui-camada-selecionada', (d) => prancha.definirCamadaAtiva(camadaDoPainel(d.camadaId)));
    ouvir<{ camadas: Array<{ id: string }> }>(p, 'ui-camadas-reordenadas', (d) => {
      prancha.definirCamadas(camadasNaOrdemDoPainel(prancha.obterCamadas(), (d.camadas ?? []).map((k) => k.id)));
    });
    ouvir<Record<string, never>>(p, 'ui-camada-adicionar', () => {
      const atuais: CamadaPrancha[] = prancha.obterCamadas();
      let n = atuais.length + 1;
      while (atuais.some((k) => k.id === `camada-${n}`)) n++;
      prancha.definirCamadas([...atuais, { id: `camada-${n}`, nome: `Camada ${n}` }]);
    });
    ouvir<{ feicaoId: string }>(p, 'ui-feicao-selecionada', (d) => prancha.selecionarElementos([d.feicaoId]));
    ouvir<{ feicoesIds: string[] }>(p, 'ui-feicoes-selecionadas', (d) => prancha.selecionarElementos(d.feicoesIds ?? []));
    ouvir<{ feicaoId: string; visivel: boolean }>(p, 'ui-feicao-visibilidade', (d) => prancha.alterarElementos([d.feicaoId], { oculto: !d.visivel }));
    ouvir<{ feicaoId: string; bloqueado: boolean }>(p, 'ui-feicao-bloqueio', (d) => prancha.alterarElementos([d.feicaoId], { bloqueado: d.bloqueado }));
    ouvir<{ feicaoId: string; novoNome: string }>(p, 'ui-feicao-renomeada', (d) => prancha.alterarElementos([d.feicaoId], { nome: d.novoNome }));
    ouvir<{ feicaoId: string; camadaDestinoId: string }>(p, 'ui-feicao-movida', (d) => prancha.alterarElementos([d.feicaoId], { camadaId: camadaDoPainel(d.camadaDestinoId) }));
  }

  // a prancha avisa; os painéis se atualizam
  for (const nome of EVENTOS_DE_DADOS) bag.add(prancha, nome, () => { atualizarCamadas(); atualizarPropriedades(); });
  bag.add(prancha, 'prancha-selecao', () => {
    painelCamadas?.selecionarFeicoes?.(prancha.selecao);
    atualizarPropriedades();
  });

  atualizarCamadas();
  atualizarPropriedades();
  let ligado = true;
  return () => { if (ligado) { ligado = false; bag.cleanup(); } };
}
