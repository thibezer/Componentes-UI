import './src/index';
import {
  CAMADA_SEM_CAMADA, FERRAMENTAS_PALETA_PRANCHA, caixaDoQuadroAbnt, camadaDoPainel, camadasComMudanca, camadasNaOrdemDoPainel,
  ferramentaDaPaleta, type CamadaPrancha, type OperacaoPathfinder, type Predefinicao, type UICanvasPrancha
} from './src/prancha';
import type { UICamadas, UIPaletaFerramentas, CamadaItem, FeicaoItem, FerramentaItem } from './src/index';
import type { UITabelaPropriedades } from './src/components/ui-tabela-propriedades';

/*
 * Playground da prancha (Fase 6, página `prancha.html`): a COMPOSIÇÃO que o app fará. O kit dá os dados e comandos
 * (`FERRAMENTAS_PALETA_PRANCHA`, `categoriasDePropriedades`, `dadosParaPainelDeCamadas`, `aplicarPropriedade`,
 * `alterarElementos`); aqui só se ligam os eventos dos quatro componentes, sem regra própria.
 */

type Log = (texto: string) => void;

export function montarPlaygroundPrancha(registrarLog: Log): void {
  const prancha = document.getElementById('prancha-demo') as UICanvasPrancha | null;
  const paleta = document.getElementById('prancha-paleta') as UIPaletaFerramentas | null;
  const camadasPainel = document.getElementById('prancha-camadas') as UICamadas | null;
  const propriedades = document.getElementById('prancha-propriedades') as UITabelaPropriedades | null;
  if (!prancha) return;

  // camadas de exemplo (de trás para a frente) e a camada ativa
  prancha.definirCamadas([{ id: 'fundo', nome: 'Fundo' }, { id: 'desenho', nome: 'Desenho' }, { id: 'textos', nome: 'Textos' }]);
  prancha.definirCamadaAtiva('desenho');

  // ---------- paleta ----------
  if (paleta) {
    paleta.ferramentas = FERRAMENTAS_PALETA_PRANCHA as unknown as FerramentaItem[];
    paleta.valor = 'selecao';
    paleta.addEventListener('ui-change', (e) => {
      const f = ferramentaDaPaleta((e as CustomEvent<{ valor: string }>).detail.valor);
      if (f) prancha.definirFerramenta(f);
    });
    prancha.addEventListener('prancha-ferramenta', (e) => {
      paleta.valor = (e as CustomEvent<{ ferramenta: string }>).detail.ferramenta;
    });
  }

  // ---------- propriedades ----------
  const atualizarPropriedades = (): void => {
    if (propriedades) propriedades.categorias = prancha.categoriasDePropriedades() as never;
  };
  propriedades?.addEventListener('ui-propriedade-alterada', (e) => {
    const d = (e as CustomEvent<{ id: string; valor: unknown }>).detail;
    prancha.aplicarPropriedade(d.id, d.valor);
  });

  // ---------- camadas ----------
  const atualizarCamadas = (): void => {
    if (!camadasPainel) return;
    const d = prancha.dadosParaPainelDeCamadas();
    camadasPainel.definirCamadas(d.camadas as unknown as CamadaItem[], d.feicoes as unknown as FeicaoItem[]);
    camadasPainel.selecionarFeicoes(prancha.selecao);
  };
  const mudarCamada = (id: string, m: Parameters<typeof camadasComMudanca>[2]): void => {
    if (id !== CAMADA_SEM_CAMADA) prancha.definirCamadas(camadasComMudanca(prancha.obterCamadas(), id, m));
  };
  if (camadasPainel) {
    const ouvir = <T>(nome: string, f: (d: T) => void) => camadasPainel.addEventListener(nome, (e) => f((e as CustomEvent<T>).detail));
    ouvir<{ camadaId: string; visivel: boolean }>('ui-camada-visibilidade', (d) => mudarCamada(d.camadaId, { visivel: d.visivel }));
    ouvir<{ camadaId: string; bloqueado: boolean }>('ui-camada-bloqueio', (d) => mudarCamada(d.camadaId, { bloqueada: d.bloqueado }));
    ouvir<{ camadaId: string; opacidade: number }>('ui-camada-opacidade', (d) => mudarCamada(d.camadaId, { opacidade: d.opacidade }));
    ouvir<{ camadaId: string; novoNome: string }>('ui-camada-renomeada', (d) => mudarCamada(d.camadaId, { nome: d.novoNome }));
    ouvir<{ camadaId: string }>('ui-camada-selecionada', (d) => prancha.definirCamadaAtiva(camadaDoPainel(d.camadaId)));
    ouvir<{ camadas: Array<{ id: string }> }>('ui-camadas-reordenadas', (d) => {
      prancha.definirCamadas(camadasNaOrdemDoPainel(prancha.obterCamadas(), (d.camadas ?? []).map((k) => k.id)));
    });
    ouvir<{ camadaId?: string }>('ui-camada-adicionar', () => {
      const atuais: CamadaPrancha[] = prancha.obterCamadas();
      prancha.definirCamadas([...atuais, { id: `camada-${Date.now()}`, nome: `Camada ${atuais.length + 1}` }]);
    });
    ouvir<{ feicaoId: string }>('ui-feicao-selecionada', (d) => prancha.selecionarElementos([d.feicaoId]));
    ouvir<{ feicoesIds: string[] }>('ui-feicoes-selecionadas', (d) => prancha.selecionarElementos(d.feicoesIds ?? []));
    ouvir<{ feicaoId: string; visivel: boolean }>('ui-feicao-visibilidade', (d) => prancha.alterarElementos([d.feicaoId], { oculto: !d.visivel }));
    ouvir<{ feicaoId: string; bloqueado: boolean }>('ui-feicao-bloqueio', (d) => prancha.alterarElementos([d.feicaoId], { bloqueado: d.bloqueado }));
    ouvir<{ feicaoId: string; novoNome: string }>('ui-feicao-renomeada', (d) => prancha.alterarElementos([d.feicaoId], { nome: d.novoNome }));
    ouvir<{ feicaoId: string; camadaDestinoId: string }>('ui-feicao-movida', (d) => prancha.alterarElementos([d.feicaoId], { camadaId: camadaDoPainel(d.camadaDestinoId) }));
  }

  // a prancha avisa; os painéis se atualizam (os métodos dos painéis não reemitem eventos: sem laço)
  for (const nome of ['prancha-elemento-criado', 'prancha-elemento-atualizado', 'prancha-elemento-removido', 'prancha-ordem', 'prancha-camadas']) {
    prancha.addEventListener(nome, () => { atualizarCamadas(); atualizarPropriedades(); });
  }
  prancha.addEventListener('prancha-selecao', () => {
    camadasPainel?.selecionarFeicoes(prancha.selecao);
    atualizarPropriedades();
  });

  // ---------- botões: pré-definições, Pathfinder, efeitos e SVG ----------
  document.querySelectorAll<HTMLButtonElement>('#prancha-predefinicoes [data-predefinicao]').forEach((b) => {
    b.addEventListener('click', () => {
      const tipo = b.dataset.predefinicao as Predefinicao;
      const caixa = tipo === 'moldura-dupla' ? caixaDoQuadroAbnt('A4') ?? undefined : { x: 60, y: 80, largura: 90, altura: 60 };
      prancha.inserirPredefinicao(tipo, caixa, { estiloTraco: tipo === 'seta-dupla' ? 'tracejado' : 'continuo' });
    });
  });
  document.querySelectorAll<HTMLButtonElement>('#prancha-operacoes [data-pathfinder]').forEach((b) => {
    b.addEventListener('click', () => prancha.pathfinder(b.dataset.pathfinder as OperacaoPathfinder));
  });
  document.getElementById('prancha-sombra')?.addEventListener('click', () => {
    prancha.aplicarPropriedade('sombra.ativa', true);
  });
  document.getElementById('prancha-svg')?.addEventListener('click', () => {
    registrarLog(`<ui-canvas-prancha> -> SVG com ${prancha.exportarSvg().length} caracteres`);
  });
  for (const nome of ['prancha-elemento-criado', 'prancha-elemento-atualizado', 'prancha-elemento-removido', 'prancha-selecao', 'prancha-recusa']) {
    prancha.addEventListener(nome, (e) => {
      const d = (e as CustomEvent).detail as { elementos?: unknown[]; ids?: string[]; motivo?: string; acao?: string };
      registrarLog(`<ui-canvas-prancha> -> ${nome} (${d.elementos?.length ?? d.ids?.length ?? 0}) ${d.motivo ?? ''} ${d.acao ?? ''}`);
    });
  }

  atualizarCamadas();
  atualizarPropriedades();
}

document.addEventListener('DOMContentLoaded', () => {
  const log = document.getElementById('prancha-log');
  montarPlaygroundPrancha((texto) => {
    if (!log) return;
    log.textContent = [texto, log.textContent ?? ''].join('\n').slice(0, 4000);
  });
});
