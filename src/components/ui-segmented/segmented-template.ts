import estilos from './ui-segmented.css?inline';
import { UISegmentedOpcao } from './ui-segmented';

export const ATRIBUTOS_OBSERVADOS_SEGMENTED = [
  'valor',
  'value',
  'name',
  'disabled',
  'tamanho',
  'size',
  'largura-total',
  'full-width'
];

export function criarTemplateSegmented(): string {
  return `
    <style>${estilos}</style>
    <div class="ui-segmented ui-segmented--md" role="radiogroup">
      <div class="ui-segmented__indicador"></div>
      <div class="ui-segmented__track" style="display: contents;"></div>
      <slot style="display: none;"></slot>
    </div>
  `;
}

export function criarBotaoOpcao(
  opcao: UISegmentedOpcao,
  indice: number,
  valorAtual: string,
  desabilitadoGeral: boolean,
  onClique: () => void
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.role = 'radio';
  btn.className = 'ui-segmented__item';
  btn.dataset.valor = opcao.valor;
  btn.dataset.indice = String(indice);

  const isAtivo = opcao.valor === valorAtual;
  btn.setAttribute('aria-checked', String(isAtivo));
  btn.tabIndex = isAtivo ? 0 : -1;

  if (isAtivo) {
    btn.classList.add('ui-segmented__item--ativo');
  }

  if (desabilitadoGeral || opcao.disabled) {
    btn.disabled = true;
  }

  if (opcao.icone) {
    const spanIcone = document.createElement('span');
    spanIcone.className = 'ui-segmented__icone';
    const iconeEl = document.createElement('ui-icone');
    iconeEl.setAttribute('nome', opcao.icone);
    iconeEl.setAttribute('tamanho', '14');
    spanIcone.appendChild(iconeEl);
    btn.appendChild(spanIcone);
  }

  const spanTexto = document.createElement('span');
  spanTexto.className = 'ui-segmented__texto';
  spanTexto.textContent = opcao.rotulo;
  btn.appendChild(spanTexto);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClique();
  });

  return btn;
}
