/**
 * Operações geométricas sobre feições do <ui-canvas-cad>: dividir por linha, buffer, duplicar e juntar.
 * Responsabilidade única: compor os algoritmos puros (L2) com a leitura/escrita de feições, sem conhecer
 * o gerenciador; tudo o que precisa dele entra pelas `PortasOperacoes`.
 */
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao, GeometriaFeicao } from '../../gerencigeo-canvas/feature_types';
import { criarLinha, ehMultilinha, type LatLonPar } from '../../gerencigeo-canvas/feature_types';
import type { RefFeicao } from '../../gerencigeo-canvas/feature_selecao';
import {
  clonarFeicao, deslocarGeometria, dividirPoligonoComLinha, gerarBuffer as gerarBufferGeo, juntarLinhas, juntarPoligonos
} from '../../gerencigeo-canvas/feature_algoritmos';
import { TIPO_CAMADA_FEICOES } from './cad-feicoes-tipos';

export interface PortasOperacoes {
  emitir: (evento: string, detalhe: unknown) => unknown;
  obterLayerManager: () => CanvasLayerManager;
  buscar: (camadaId: string, id: string) => Feicao | undefined;
  lista: (camadaId: string) => Feicao[];
  desenhada: (f: Feicao) => boolean;
  idLivre: (camadaId: string, base: string) => string;
  adicionarFeicao: (camadaId: string, bruta: unknown) => Feicao | null;
  removerFeicao: (camadaId: string, id: string) => boolean;
  selecionadas: () => Feicao[];
  estaSelecionada: (ref: RefFeicao) => boolean;
  /** `true` enquanto a ferramenta "dividir" está ativa. */
  divisaoAtiva: () => boolean;
  encerrarDesenho: () => void;
}

export class OperacoesFeicoes {
  constructor(private p: PortasOperacoes) {}

  /**
   * Divide polígonos pela linha de corte. Alvos: os polígonos selecionados; sem seleção, o primeiro
   * polígono (de camada visível, interativa e desbloqueada) que a linha corta.
   */
  public dividirComLinha(linha: LatLonPar[]): boolean {
    const lm = this.p.obterLayerManager();
    const falhar = (motivo: string): boolean => {
      this.p.emitir('cad-divisao-falhou', { motivo });
      return false;
    };

    const selecionados = this.p.selecionadas().filter((f) => f.geometria.tipo === 'Polygon');
    let candidatos: Feicao[] = selecionados;
    if (candidatos.length === 0) {
      candidatos = [];
      for (const camada of lm.getActiveSelectableLayers()) {
        if (camada.tipo !== TIPO_CAMADA_FEICOES) continue;
        candidatos.push(...this.p.lista(camada.id).filter((f) => f.geometria.tipo === 'Polygon' && this.p.desenhada(f)));
      }
    }
    if (candidatos.length === 0) return falhar(selecionados.length === 0 && this.p.selecionadas().some((f) => ehMultilinha(f.geometria)) ? 'multiparte' : 'nenhum-poligono');

    const bloqueada = (f: Feicao): boolean => !!f.bloqueada || !!lm.getLayerDef(f.camadaId)?.bloqueada;
    const livres = candidatos.filter((f) => !bloqueada(f) && f.geometria.tipo === 'Polygon' && f.geometria.aneis.length === 1);
    if (livres.length === 0) return falhar(candidatos.some(bloqueada) ? 'bloqueada' : 'poligono-com-furos');

    let dividiu = false;
    for (const f of livres) {
      if (f.geometria.tipo !== 'Polygon') continue;
      const partes = dividirPoligonoComLinha(f.geometria.aneis[0], linha);
      if (!partes) continue;

      // o corte vai mudar a seleção (a original sai): a ferramenta encerra ANTES, para `cad-selecao` já sair sem ferramenta ativa
      if (this.p.divisaoAtiva() && this.p.estaSelecionada({ camadaId: f.camadaId, id: f.id })) this.p.encerrarDesenho();
      this.p.removerFeicao(f.camadaId, f.id);
      const criadas: Feicao[] = [];
      partes.forEach((anel, i) => {
        const nova = clonarFeicao(f, this.p.idLivre(f.camadaId, `${f.id}-${i + 1}`), { tipo: 'Polygon', aneis: [anel] });
        const ok = this.p.adicionarFeicao(f.camadaId, nova);
        if (ok) criadas.push(ok);
      });
      if (criadas.length !== partes.length) {
        // parte recusada: desfaz tudo, a feição original não pode se perder
        for (const c of criadas) this.p.removerFeicao(c.camadaId, c.id);
        this.p.adicionarFeicao(f.camadaId, f);
        return falhar('geometria-invalida');
      }
      this.p.emitir('cad-feicao-dividida', { origem: f, partes: criadas });
      dividiu = true;
      if (selecionados.length === 0) break;
    }
    return dividiu || falhar('sem-intersecao');
  }

  // ---- utilitários geométricos ----

  /** Cria um polígono de buffer ao redor da feição (na camada dela, ou em `camadaDestino`). */
  public gerarBuffer(camadaId: string, id: string, metros: number, opcoes: { camadaDestino?: string; id?: string } = {}): Feicao | null {
    const f = this.p.buscar(camadaId, id);
    if (!f) return null;
    const anel = gerarBufferGeo(f.geometria, metros);
    if (!anel) return null;
    const destino = opcoes.camadaDestino ?? camadaId;
    const criada = this.p.adicionarFeicao(destino, {
      id: opcoes.id ?? this.p.idLivre(destino, `${id}-buffer`),
      geometria: { tipo: 'Polygon', aneis: [anel] },
      estilo: f.estilo ? { ...f.estilo } : undefined,
      propriedades: { ...f.propriedades, origem: id }
    });
    if (criada) this.p.emitir('cad-feicao-criada', { camadaId: destino, feicao: criada });
    return criada;
  }

  /** Copia a feição deslocada (em metros para leste/norte). */
  public duplicarFeicao(camadaId: string, id: string, deslocamento: { lesteM?: number; norteM?: number } = {}, opcoes: { id?: string } = {}): Feicao | null {
    const f = this.p.buscar(camadaId, id);
    if (!f) return null;
    const geometria = deslocarGeometria(f.geometria, deslocamento.lesteM ?? 0, deslocamento.norteM ?? 0);
    const criada = this.p.adicionarFeicao(camadaId, clonarFeicao(f, opcoes.id ?? this.p.idLivre(camadaId, `${id}-copia`), geometria));
    if (criada) this.p.emitir('cad-feicao-criada', { camadaId, feicao: criada });
    return criada;
  }

  /**
   * Junta linhas (encadeando pontas) ou dois polígonos (por uma ponte) numa feição só; as originais saem.
   * Linhas com pontas a até `toleranciaM` se ligam; polígonos precisam estar a até `toleranciaM` e
   * não podem ter bordas que se cruzam.
   */
  public juntarFeicoes(camadaId: string, ids: string[], opcoes: { toleranciaM?: number; id?: string } = {}): Feicao | null {
    const falhar = (motivo: string): null => {
      this.p.emitir('cad-uniao-falhou', { motivo });
      return null;
    };
    const fs = ids.map((i) => this.p.buscar(camadaId, i));
    if (fs.length < 2 || fs.some((f) => !f)) return falhar('feicoes-insuficientes');
    const origem = fs as Feicao[];
    if (new Set(origem.map((f) => f.id)).size !== origem.length) return falhar('feicoes-insuficientes');
    const lm = this.p.obterLayerManager();
    if (origem.some((f) => f.excluida || f.bloqueada || lm.getLayerDef(f.camadaId)?.bloqueada)) return falhar('bloqueada');
    const tol = opcoes.toleranciaM ?? 0;

    let geometria: GeometriaFeicao | null = null;
    if (origem.every((f) => f.geometria.tipo === 'LineString')) {
      if (origem.some((f) => ehMultilinha(f.geometria))) return falhar('multiparte');
      const linhas = origem.map((f) => (f.geometria as { coordenadas: LatLonPar[] }).coordenadas);
      const r = juntarLinhas(linhas, tol);
      if (r) geometria = criarLinha([r]);
    } else if (origem.every((f) => f.geometria.tipo === 'Polygon' && f.geometria.aneis.length === 1)) {
      let anel: LatLonPar[] | null = (origem[0].geometria as { aneis: LatLonPar[][] }).aneis[0];
      for (const f of origem.slice(1)) {
        anel = anel ? juntarPoligonos(anel, (f.geometria as { aneis: LatLonPar[][] }).aneis[0], tol) : null;
      }
      if (anel) geometria = { tipo: 'Polygon', aneis: [anel] };
    } else {
      return falhar('tipos-incompativeis');
    }
    if (!geometria) return falhar('sem-ligacao');

    for (const f of origem) this.p.removerFeicao(camadaId, f.id);
    const resultado = this.p.adicionarFeicao(camadaId, clonarFeicao(origem[0], opcoes.id ?? this.p.idLivre(camadaId, `${origem[0].id}-uniao`), geometria));
    if (!resultado) {
      // geometria recusada: devolve as originais em vez de perdê-las
      for (const f of origem) this.p.adicionarFeicao(camadaId, f);
      return falhar('geometria-invalida');
    }
    this.p.emitir('cad-feicao-unida', { origens: origem, resultado });
    return resultado;
  }
}
