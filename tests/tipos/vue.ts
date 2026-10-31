/* Verificado por `npm run test:tipos`: as tags devem estar registradas nos GlobalComponents do Vue. */
import '../../dist/tipos-vue';
import type { GlobalComponents } from 'vue';

type Props<Tag extends keyof GlobalComponents> = InstanceType<GlobalComponents[Tag]>['$props'];

export const tabela: Props<'ui-tabela'> = {
  colunas: [{ id: 'ponto', rotulo: 'Ponto' }],
  maxHeight: '300px',
  densidade: 'compacta',
  onUiSort: (e: CustomEvent) => e.detail,
};

export const botao: Props<'ui-botao-primario'> = { variante: 'primario', onUiClick: () => {} };

export const painelProp: Props<'ui-tabela-propriedades'> = {
  titulo: 'Propriedades CAD',
  densidade: 'compacta',
  onUiPropriedadeAlterada: (e: CustomEvent) => e.detail
};

export const aliasProp: Props<'ui-painel-propriedades'> = {
  titulo: 'Propriedades',
  densidade: 'padrao'
};

// @ts-expect-error densidade fora do conjunto aceito
export const densidadeInvalida: Props<'ui-tabela'> = { densidade: 'enorme' };

// @ts-expect-error densidade fora do conjunto aceito
export const propDensidadeInvalida: Props<'ui-tabela-propriedades'> = { densidade: 'enorme' };
