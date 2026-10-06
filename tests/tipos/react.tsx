/* Verificado por `npm run test:tipos`: os tipos gerados em dist/ devem aceitar o uso correto e recusar o incorreto. */
import '../../dist/tipos-react';

export const usoCorreto = (
  <>
    <ui-botao-primario variante="secundario" carregando onClick={() => {}} onui-click={(e) => e.detail}>
      Salvar
    </ui-botao-primario>
    <ui-campo-texto label="Nome" obrigatorio value="Ana" name="nome" className="campo" />
    <ui-tabela
      colunas={[{ id: 'ponto', rotulo: 'Ponto', ordenavel: true }]}
      dados={[{ id: 1, ponto: 'M-01' }]}
      densidade="compacta"
      max-height="300px"
      aria-label="Vértices"
      onui-sort={(e) => console.log(e.detail)}
    />
    <ui-modal titulo="Confirmar" aberto bloquear-fechamento onui-fechar={() => {}} />
  </>
);

// @ts-expect-error densidade fora do conjunto aceito
export const densidadeInvalida = <ui-tabela densidade="enorme" />;

// @ts-expect-error colunas exige TabelaColuna[]
export const colunasInvalidas = <ui-tabela colunas="ponto" />;

// @ts-expect-error propriedade inexistente
export const propInexistente = <ui-botao inexistente />;
