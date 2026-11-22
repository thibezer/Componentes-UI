/* Verificado por `npm run test:tipos`: os tipos gerados em dist/ devem aceitar o uso correto e recusar o incorreto. */
import '../../dist/tipos-react';

export const usoCorreto = (
  <>
    <ui-botao-primario variante="secundario" carregando onClick={() => {}} onui-click={(e) => e.detail}>
      Salvar
    </ui-botao-primario>
    <ui-campo-texto label="Nome" obrigatorio value="Ana" name="nome" className="campo" />
    <ui-area-texto label="Observações" linhas={6} contador maxlength={500} onui-enviar={(e) => e.detail} />
    <ui-tabela
      colunas={[{ id: 'ponto', rotulo: 'Ponto', ordenavel: true }]}
      dados={[{ id: 1, ponto: 'M-01' }]}
      densidade="compacta"
      max-height="300px"
      aria-label="Vértices"
      onui-sort={(e) => console.log(e.detail)}
    />
    <ui-modal titulo="Confirmar" aberto bloquear-fechamento onui-fechar={() => {}} />
    <ui-tabela-propriedades
      titulo="Propriedades CAD"
      densidade="compacta"
      estilo-visual="autocad"
      modo-aplicar="imediato"
      categorias={[{ id: 'c1', titulo: 'Geral', propriedades: [] }]}
      onui-propriedade-alterada={(e) => console.log(e.detail)}
    />
    <ui-painel-propriedades titulo="Painel" densidade="padrao" />
    <ui-propriedades titulo="Propriedades" />
  </>
);

// @ts-expect-error densidade fora do conjunto aceito
export const densidadeInvalida = <ui-tabela densidade="enorme" />;

// @ts-expect-error colunas exige TabelaColuna[]
export const colunasInvalidas = <ui-tabela colunas="ponto" />;

// @ts-expect-error propriedade inexistente
export const propInexistente = <ui-botao inexistente />;

// @ts-expect-error densidade fora do conjunto aceito em tabela de propriedades
export const propDensidadeInvalida = <ui-tabela-propriedades densidade="gigante" />;

export const prancha = (
  <ui-canvas-prancha
    largura={210}
    altura={297}
    unidade="mm"
    mostrar-grade
    ferramenta="retangulo"
    rotulo="Prancha 1"
    onprancha-elemento-criado={(e) => e.detail}
    onprancha-selecao={(e) => e.detail}
  />
);

// @ts-expect-error ferramenta fora do conjunto aceito
export const ferramentaInvalida = <ui-canvas-prancha ferramenta="pincel" />;

export const pranchaModal = (
  <ui-canvas-prancha
    margens="25 10 10 10"
    teclado="exclusivo"
    ajustar-ao-abrir="conteudo"
    onprancha-modificado={(e) => e.detail}
    onprancha-pronta={(e) => e.detail}
    onprancha-esc-sem-efeito={(e) => e.detail}
  />
);

export const pranchaTecladoModal = <ui-canvas-prancha teclado="modal" />;

export const editorPrancha = (
  <ui-editor-prancha
    largura={297}
    altura={210}
    margens="10 10 10 10"
    ajustar-ao-abrir="folha"
    teclado="isolado"
    barra-formas="menu"
    lateral="gaveta"
    oneditor-concluir={(e) => e.detail}
    oneditor-cancelar={(e) => e.detail}
  />
);

export const editorPranchaModal = <ui-editor-prancha teclado="modal" />;

// @ts-expect-error modo de teclado fora do conjunto aceito
export const editorTecladoInvalido = <ui-editor-prancha teclado="invalido" />;
