/**
 * Vínculo de um filho (<ui-mapa-marcador>, <ui-mapa-linha>) com o <ui-mapa> pai.
 * Responsabilidade única: esperar o mapa do pai ficar pronto (com limite de tentativas), reagir a
 * `ui-mapa-pronto` (o pai recria o mapa ao reconectar) e soltar tudo ao desconectar.
 */
import type L from 'leaflet';
import type { UIMapa } from './ui-mapa';

export interface OpcoesVinculo {
  /** Nome da tag, só para as mensagens de aviso. */
  rotulo: string;
  /** O mapa do pai está pronto: crie a camada. */
  aoMapa: (mapa: L.Map) => void;
  /** O mapa anterior se foi (o pai o recriou): descarte a camada antiga. */
  aoPerderMapa: () => void;
}

const MAX_TENTATIVAS = 30;
const INTERVALO_MS = 50;

export class VinculoMapaPai {
  private pai: UIMapa | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private tentativas = 0;

  constructor(private host: HTMLElement, private opcoes: OpcoesVinculo) {}

  public conectar(): void {
    this.desconectar();
    this.pai = this.host.closest('ui-mapa') as UIMapa | null;
    this.pai?.addEventListener('ui-mapa-pronto', this.aoPronto);
    this.agendar(0);
  }

  public desconectar(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pai?.removeEventListener('ui-mapa-pronto', this.aoPronto);
    this.pai = null;
    this.tentativas = 0;
  }

  private aoPronto = (): void => {
    this.opcoes.aoPerderMapa();
    this.tentativas = 0;
    this.tentar();
  };

  private agendar(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tentar(), ms);
  }

  private tentar(): void {
    this.timer = null;
    const pai = this.pai ?? (this.host.closest('ui-mapa') as UIMapa | null);
    if (!pai) {
      console.warn(`<${this.opcoes.rotulo}> deve estar dentro de um elemento <ui-mapa>`);
      return;
    }
    const mapa = pai.getMap();
    if (!mapa) {
      if (this.tentativas >= MAX_TENTATIVAS) {
        console.warn(`<${this.opcoes.rotulo}> Tempo limite esgotado aguardando inicialização do mapa pai.`);
        return;
      }
      this.tentativas++;
      this.agendar(INTERVALO_MS);
      return;
    }
    this.tentativas = 0;
    this.opcoes.aoMapa(mapa);
  }
}
