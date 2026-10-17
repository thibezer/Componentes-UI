/* ====================================================
   UI Camadas - Renomear inline
   Responsabilidade única: edição do nome de camadas e feições por duplo clique (Enter confirma, Esc cancela,
   perder o foco confirma). Camada e feição compartilham o mesmo fluxo; só mudam os atributos e o evento.
   ==================================================== */

import type { CamadaItem, FeicaoItem } from './tipos';
import { buscarPorAtributo } from './camadas-utils';

/** O que o renomear lê e altera no painel. */
export interface HostRenomear {
  camadas: CamadaItem[];
  feicoes: FeicaoItem[];
  editingLayerId: string | null;
  editingFeatureId: string | null;
  solicitarRenderizacao(): void;
  dispararEvento(nome: string, detalhe: unknown): void;
  salvarLembrancaEstado?(): void;
}

interface Alvo {
  /** Atributo que marca o nome clicável (`data-layer-name-trigger`). */
  gatilho: string;
  /** Atributo do `<input>` que aparece no lugar do nome. */
  input: string;
  marcarEditando(id: string | null): void;
  /** Aplica o novo nome; devolve o que deve ser emitido, ou `null` se nada mudou. */
  aplicar(id: string, novoNome: string): { evento: string; detalhe: unknown; salvar: boolean } | null;
}

function alvos(host: HostRenomear): Alvo[] {
  return [
    {
      gatilho: 'data-layer-name-trigger',
      input: 'data-inline-layer-input',
      marcarEditando: (id) => { host.editingLayerId = id; },
      aplicar: (id, novoNome) => {
        const camada = host.camadas.find((l) => l.id === id);
        if (!novoNome || !camada || camada.name === novoNome) return null;
        camada.name = novoNome;
        return { evento: 'ui-camada-renomeada', detalhe: { camadaId: id, novoNome, camada }, salvar: true };
      }
    },
    {
      gatilho: 'data-feat-name-trigger',
      input: 'data-inline-feat-input',
      marcarEditando: (id) => { host.editingFeatureId = id; },
      aplicar: (id, novoNome) => {
        const feicao = host.feicoes.find((f) => f.id === id);
        if (!novoNome || !feicao || feicao.name === novoNome) return null;
        feicao.name = novoNome;
        return { evento: 'ui-feicao-renomeada', detalhe: { feicaoId: id, novoNome, feicao }, salvar: false };
      }
    }
  ];
}

export function vincularRenomearInline(host: HostRenomear, shadow: ShadowRoot): void {
  for (const alvo of alvos(host)) {
    shadow.querySelectorAll(`[${alvo.gatilho}]`).forEach((nomeEl) => {
      nomeEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const id = nomeEl.getAttribute(alvo.gatilho);
        if (!id) return;

        alvo.marcarEditando(id);
        host.solicitarRenderizacao();

        const input = buscarPorAtributo(shadow, alvo.input, id) as HTMLInputElement | null;
        if (!input) return;
        input.focus();
        input.select();
        let concluido = false;

        const concluir = (salvar: boolean): void => {
          if (concluido) return;
          concluido = true;
          alvo.marcarEditando(null);
          if (salvar) {
            const resultado = alvo.aplicar(id, input.value.trim());
            if (resultado) {
              if (resultado.salvar) host.salvarLembrancaEstado?.();
              host.dispararEvento(resultado.evento, resultado.detalhe);
            }
          }
          host.solicitarRenderizacao();
        };

        input.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter') {
            ke.preventDefault();
            concluir(true);
          } else if (ke.key === 'Escape') {
            ke.preventDefault();
            concluir(false);
          }
        });
        input.addEventListener('blur', () => concluir(true));
      });
    });
  }
}
