import './src/index';
import {
  caixaDoQuadroAbnt, ligarPaineisPrancha, type OperacaoPathfinder, type Predefinicao, type UICanvasPrancha
} from './src/prancha';
import type { UICamadas, UIPaletaFerramentas } from './src/index';
import type { UITabelaPropriedades } from './src/components/ui-tabela-propriedades';

/*
 * Playground da prancha (Fase 6, página `prancha.html`): a COMPOSIÇÃO que o app fará. O kit dá os dados e comandos
 * (`FERRAMENTAS_PALETA_PRANCHA`, `categoriasDePropriedades`, `dadosParaPainelDeCamadas`, `aplicarPropriedade`,
 * `alterarElementos`) e a cola pronta (`ligarPaineisPrancha`); aqui não há regra própria.
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

  // toda a cola (paleta, camadas, propriedades) é do kit: `ligarPaineisPrancha` devolve o desligador
  const desligar = ligarPaineisPrancha({ prancha, paleta, camadas: camadasPainel, propriedades });
  window.addEventListener('pagehide', desligar, { once: true });

  // ---------- botões: pré-definições, Pathfinder, efeitos e SVG ----------
  document.querySelectorAll<HTMLButtonElement>('#prancha-predefinicoes [data-predefinicao]').forEach((b) => {
    b.addEventListener('click', () => {
      const tipo = b.dataset.predefinicao as Predefinicao;
      // sem caixa: a forma nasce no centro da área visível; a moldura usa o quadro ABNT da folha
      const caixa = tipo === 'moldura-dupla' ? caixaDoQuadroAbnt('A4') ?? undefined : undefined;
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

}

document.addEventListener('DOMContentLoaded', () => {
  const log = document.getElementById('prancha-log');
  montarPlaygroundPrancha((texto) => {
    if (!log) return;
    log.textContent = [texto, log.textContent ?? ''].join('\n').slice(0, 4000);
  });
});
