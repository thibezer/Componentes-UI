import './src/index';
import { UIToast } from './src/index';
import type { UIListaFlutuante } from './src/components/ui-lista-flutuante';
import type { UIModal } from './src/components/ui-modal';
import type { UITabela, TabelaColuna } from './src/components/ui-tabela';


document.addEventListener('DOMContentLoaded', () => {
  const logBox = document.getElementById('log-console') as HTMLPreElement;

  function registrarLog(mensagem: string) {
    const timestamp = new Date().toLocaleTimeString();
    if (logBox) {
      logBox.textContent = `[${timestamp}] ${mensagem}\n` + logBox.textContent;
    }
    console.log(`[Teste UI Kit] ${mensagem}`);
  }

  // ----------------------------------------------------
  // 1. Lógica do Testador Interativo Global (Largura x Altura)
  // ----------------------------------------------------
  const sliderLargura = document.getElementById('slider-largura') as HTMLInputElement | null;
  const sliderAltura = document.getElementById('slider-altura') as HTMLInputElement | null;
  
  const valorLarguraSpan = document.getElementById('valor-largura');
  const valorAlturaSpan = document.getElementById('valor-altura');
  const tagDimensaoAtual = document.getElementById('tag-dimensao-atual');
  
  const presetWidthBtns = document.querySelectorAll('.preset-width');
  const presetHeightBtns = document.querySelectorAll('.preset-height');

  let larguraAtual = '320';
  let alturaAtual = '20';

  function atualizarInfoDimensao() {
    if (valorLarguraSpan) valorLarguraSpan.textContent = larguraAtual.endsWith('%') ? larguraAtual : `${larguraAtual}px`;
    if (valorAlturaSpan) valorAlturaSpan.textContent = `${alturaAtual}px`;
    if (tagDimensaoAtual) tagDimensaoAtual.textContent = `${larguraAtual.endsWith('%') ? larguraAtual : `${larguraAtual}px`} x ${alturaAtual}px`;
  }

  function atualizarLargura(largura: string) {
    larguraAtual = largura;
    const larguraCss = largura.endsWith('%') ? largura : `${largura}px`;
    
    // Atualizar largura nos containers da matriz
    const colunas = document.querySelectorAll('.matrix-column');
    colunas.forEach(col => {
      (col as HTMLElement).style.width = larguraCss;
      if (!largura.endsWith('%')) {
        (col as HTMLElement).style.maxWidth = `${largura}px`;
      } else {
        (col as HTMLElement).style.maxWidth = '100%';
      }
    });

    atualizarInfoDimensao();
  }

  function atualizarAltura(altura: string) {
    alturaAtual = altura;
    const altNum = parseInt(altura, 10);
    const altPx = isNaN(altNum) ? 20 : altNum;
    
    // Atualizar variável CSS global de altura mínima em tempo real
    document.documentElement.style.setProperty('--ui-altura-minima', `${altPx}px`);

    atualizarInfoDimensao();
  }

  // Listeners de Largura
  if (sliderLargura) {
    sliderLargura.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      atualizarLargura(val);
    });
  }

  presetWidthBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const w = btn.getAttribute('data-width');
      if (w) {
        if (sliderLargura && !w.endsWith('%')) {
          sliderLargura.value = w;
        }
        atualizarLargura(w);
      }
    });
  });

  // Listeners de Altura
  if (sliderAltura) {
    sliderAltura.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      atualizarAltura(val);
    });
  }

  presetHeightBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const h = btn.getAttribute('data-height');
      if (h) {
        if (sliderAltura && h !== 'auto') {
          sliderAltura.value = h;
        }
        atualizarAltura(h);
      }
    });
  });

  // ----------------------------------------------------
  // 2. Mocks de Dados para os Componentes
  // ----------------------------------------------------
  const mockCategorias = [
    { id: '1', label: 'Desenvolvimento Frontend' },
    { id: '2', label: 'Design System & UI' },
    { id: '3', label: 'Documentação Técnica' },
    { id: '4', label: 'Infraestrutura de Rede' }
  ];

  const mockIdiomas = [
    { id: 'PT_BR', label: 'Português (Brasil)' },
    { id: 'EN_US', label: 'English (United States)' },
    { id: 'ES_ES', label: 'Español' },
    { id: 'FR_FR', label: 'Français' }
  ];

  // Configuração automática de todas as listas flutuantes e selects
  const listas = document.querySelectorAll('ui-lista-flutuante, ui-select');
  listas.forEach((el, index) => {
    const listComponent = el as UIListaFlutuante;
    const id = listComponent.id || `lista-${index}`;
    listComponent.itens = (id.includes('crs') || id.includes('mobile')) ? mockIdiomas : mockCategorias;
    listComponent.value = 'PT_BR';
    listComponent.addEventListener('ui-selecionar', (e: Event) => {
      const customEvent = e as CustomEvent;
      registrarLog(`<${el.tagName.toLowerCase()} id="${id}"> -> Selecionado: ${JSON.stringify(customEvent.detail)}`);
    });
  });

  // Configuração dos Botões
  const btns = document.querySelectorAll('ui-botao-primario');
  btns.forEach(btn => {
    btn.addEventListener('ui-click', (e) => {
      const btnId = btn.id || 'sem-id';
      const texto = btn.textContent?.trim();
      registrarLog(`<ui-botao-primario id="${btnId}"> ("${texto}") -> Clique capturado!`);
    });
  });

  // Botão Interativo para Alternar Loading Demo
  const btnToggleLoading = document.getElementById('btn-toggle-loading-global');
  if (btnToggleLoading) {
    btnToggleLoading.addEventListener('click', () => {
      const demoLoadingBtns = [
        document.getElementById('btn-demo-loading-1'),
        document.getElementById('btn-demo-loading-2'),
        document.getElementById('btn-demo-loading-3'),
        document.getElementById('btn-demo-loading-4'),
      ];

      const emCarregamento = demoLoadingBtns[0]?.hasAttribute('carregando');
      demoLoadingBtns.forEach(btn => {
        if (btn) {
          if (emCarregamento) {
            btn.removeAttribute('carregando');
          } else {
            btn.setAttribute('carregando', '');
          }
        }
      });

      registrarLog(`Alternado estado de carregamento dos botões para: ${!emCarregamento}`);
    });
  }

  // Configuração dos Campos de Texto (<ui-campo-texto>)
  const camposTexto = document.querySelectorAll('ui-campo-texto');
  camposTexto.forEach(campo => {
    campo.addEventListener('ui-input', (e: Event) => {
      const customEvent = e as CustomEvent;
      const campoId = campo.id || 'sem-id';
      registrarLog(`<ui-campo-texto id="${campoId}"> -> ui-input: "${customEvent.detail.value}"`);
    });

    campo.addEventListener('ui-toggle-senha', (e: Event) => {
      const customEvent = e as CustomEvent;
      const campoId = campo.id || 'sem-id';
      const status = customEvent.detail.visivel ? 'Senha REVELADA 👁️' : 'Senha OCULTADA 🔒';
      registrarLog(`<ui-campo-texto id="${campoId}"> -> ${status}`);
    });
  });

  // Configuração dos Checkboxes (<ui-checkbox>)
  const checkboxes = document.querySelectorAll('ui-checkbox');
  checkboxes.forEach(chk => {
    chk.addEventListener('ui-change', (e: Event) => {
      const customEvent = e as CustomEvent;
      const chkId = chk.id || 'sem-id';
      const detail = customEvent.detail;
      const estado = detail.indeterminado ? 'INDETERMINADO (-)' : (detail.marcado ? 'MARCADO (✓)' : 'DESMARCADO');
      registrarLog(`<ui-checkbox id="${chkId}"> -> ${estado}`);
    });
  });

  // Configuração dos Rádios (<ui-radio>)
  const radios = document.querySelectorAll('ui-radio');
  radios.forEach(rdo => {
    rdo.addEventListener('ui-change', (e: Event) => {
      const customEvent = e as CustomEvent;
      const rdoId = rdo.id || 'sem-id';
      const detail = customEvent.detail;
      registrarLog(`<ui-radio id="${rdoId}" name="${detail.name}"> -> SELECIONADO ("${detail.value}")`);
    });
  });

  // Configuração dos Switches (<ui-switch>)
  const switches = document.querySelectorAll('ui-switch, ui-toggle');
  switches.forEach(sw => {
    sw.addEventListener('ui-change', (e: Event) => {
      const customEvent = e as CustomEvent;
      const swId = sw.id || 'sem-id';
      const detail = customEvent.detail;
      const estado = detail.ativo ? 'ATIVADO (ON 🟢)' : 'DESATIVADO (OFF ⚪)';
      registrarLog(`<ui-switch id="${swId}"> -> ${estado}`);
    });
  });

  // Configuração de Badges / Chips (<ui-chip>, <ui-badge>)
  const badges = document.querySelectorAll('ui-badge, ui-chip, ui-tag');
  badges.forEach(badge => {
    badge.addEventListener('ui-remove', (e: Event) => {
      const customEvent = e as CustomEvent;
      const badgeId = badge.id || 'sem-id';
      registrarLog(`<ui-chip id="${badgeId}"> -> REMOVIDO ✕ ("${customEvent.detail.value}")`);
      (badge as HTMLElement).style.display = 'none';
    });
  });

  // Configuração dos Cards (<ui-card>)
  const cards = document.querySelectorAll('ui-card[clicavel], ui-card[clickable]');
  cards.forEach(card => {
    card.addEventListener('ui-click', (e: Event) => {
      const customEvent = e as CustomEvent;
      const cardId = card.id || 'sem-id';
      registrarLog(`<ui-card id="${cardId}"> -> CLIQUADO (Evento ui-click capturado!)`);
    });
  });

  // Configuração dos Modais (<ui-modal>)
  const btnAbrirModal = document.getElementById('btn-abrir-modal');
  const btnAbrirBottomSheet = document.getElementById('btn-abrir-bottom-sheet');
  const modalExemplo = document.getElementById('modal-exemplo') as UIModal | null;
  const modalBottomSheet = document.getElementById('modal-bottom-sheet') as UIModal | null;

  if (btnAbrirModal && modalExemplo) {
    btnAbrirModal.addEventListener('ui-click', () => {
      modalExemplo.abrir();
      registrarLog('<ui-modal id="modal-exemplo"> -> ABERTO');
    });
  }

  if (btnAbrirBottomSheet && modalBottomSheet) {
    btnAbrirBottomSheet.addEventListener('ui-click', () => {
      modalBottomSheet.abrir();
      registrarLog('<ui-modal id="modal-bottom-sheet"> -> ABERTO (Mobile Bottom Sheet)');
    });
  }

  // Configuração dos Toasts (<ui-toast>)
  const btnToastSucesso = document.getElementById('btn-toast-sucesso');
  const btnToastErro = document.getElementById('btn-toast-erro');
  const btnToastAlerta = document.getElementById('btn-toast-alerta');

  if (btnToastSucesso) {
    btnToastSucesso.addEventListener('ui-click', () => {
      UIToast.notificar({
        tipo: 'sucesso',
        titulo: 'Registro Salvo!',
        mensagem: 'As alterações foram sincronizadas no servidor com sucesso.',
        duracao: 4000
      });
      registrarLog('UIToast.notificar() -> Disparado Toast de SUCESSO 🟢');
    });
  }

  if (btnToastErro) {
    btnToastErro.addEventListener('ui-click', () => {
      UIToast.notificar({
        tipo: 'erro',
        titulo: 'Falha na Conexão',
        mensagem: 'Não foi possível conectar ao servidor. Tente novamente.',
        duracao: 4000
      });
      registrarLog('UIToast.notificar() -> Disparado Toast de ERRO 🔴');
    });
  }

  // ----------------------------------------------------
  // Configuração da <ui-tabela> (Mock Data INCRA/SIGEF)
  // ----------------------------------------------------
  const tabelaIncra = document.getElementById('tabela-demo-incra') as UITabela | null;
  const btnTabelaDados = document.getElementById('btn-tabela-dados-incra');
  const btnTabelaEmpty = document.getElementById('btn-tabela-empty');
  const btnDensidadeCompacta = document.getElementById('btn-densidade-compacta');
  const btnDensidadeNormal = document.getElementById('btn-densidade-normal');
  const btnDensidadeRelaxada = document.getElementById('btn-densidade-relaxada');

  const colunasIncra: TabelaColuna[] = [
    { id: 'ponto', rotulo: 'Ponto / ID do Vértice', ordenavel: true, larguraMinima: '160px' },
    { id: 'easting', rotulo: 'Easting (SIRGAS 2000 UTM Fuso 22S)', alinhamento: 'direita', ordenavel: true, larguraMinima: '240px' },
    { id: 'northing', rotulo: 'Northing (SIRGAS 2000 UTM Fuso 22S)', alinhamento: 'direita', ordenavel: true, larguraMinima: '240px' },
    { id: 'altitude', rotulo: 'Altitude (m)', alinhamento: 'direita', ordenavel: true, larguraMinima: '130px' },
    { id: 'metodo', rotulo: 'Método de Posicionamento (Truncado com Ellipsis)', alinhamento: 'centro', larguraMaxima: '220px', tooltip: 'Método de posicionamento GNSS/Topográfico' },
    {
      id: 'status',
      rotulo: 'Status',
      alinhamento: 'centro',
      larguraMinima: '150px',
      render: (val: string) => {
        const badge = document.createElement('ui-badge');
        let variante = 'neutro';
        if (val === 'Certificado') variante = 'sucesso';
        else if (val === 'Em Análise' || val === 'Pendente') variante = 'alerta';
        else if (val === 'Sobreposição') variante = 'erro';
        badge.setAttribute('variante', variante);
        badge.textContent = val;
        return badge;
      }
    }
  ];

  const dadosIncra = [
    { ponto: 'VRT-SIGEF-0101', easting: '642158,432 m', northing: '7543210,891 m', altitude: '542,15 m', metodo: 'GNSS RTK - Relativo Estático com receptor de dupla frequência', status: 'Certificado' },
    { ponto: 'VRT-SIGEF-0102', easting: '642215,876 m', northing: '7543288,143 m', altitude: '545,30 m', metodo: 'GNSS RTK - Fixo de alta precisão milimétrica', status: 'Certificado' },
    { ponto: 'PNT-INCRA-0103', easting: '642302,110 m', northing: '7543342,654 m', altitude: '548,72 m', metodo: 'PPP Tempo Real (IBGE - Serviço Ativo)', status: 'Em Análise' },
    { ponto: 'PNT-INCRA-0104', easting: '642411,904 m', northing: '7543415,002 m', altitude: '551,10 m', metodo: 'Relativo Estático Pós-Processado em vetores longos', status: 'Certificado' },
    { ponto: 'VRT-SIGEF-0105', easting: '642534,660 m', northing: '7543490,321 m', altitude: '554,85 m', metodo: 'GNSS RTK - Fixo com correção de estação base local', status: 'Sobreposição' },
    { ponto: 'VRT-SIGEF-0106', easting: '642620,332 m', northing: '7543560,789 m', altitude: '558,40 m', metodo: 'Relativo Estático Pós-Processado com efemérides precisas', status: 'Certificado' },
    { ponto: 'PNT-INCRA-0107', easting: '642710,541 m', northing: '7543622,110 m', altitude: '560,95 m', metodo: 'PPP Tempo Real (IBGE - Serviço Ativo)', status: 'Pendente' },
    { ponto: 'VRT-SIGEF-0108', easting: '642805,129 m', northing: '7543695,443 m', altitude: '563,20 m', metodo: 'GNSS RTK - Fixo de alta precisão milimétrica', status: 'Certificado' },
    { ponto: 'VRT-SIGEF-0109', easting: '642899,410 m', northing: '7543771,980 m', altitude: '567,15 m', metodo: 'VANT / Fotogrametria de Precisão com PPK', status: 'Aguardando Vistoria' },
    { ponto: 'PNT-INCRA-0110', easting: '643012,887 m', northing: '7543850,221 m', altitude: '571,60 m', metodo: 'GNSS RTK - Fixo de alta precisão milimétrica', status: 'Certificado' }
  ];

  if (tabelaIncra) {
    tabelaIncra.colunas = colunasIncra;
    tabelaIncra.dados = dadosIncra;

    tabelaIncra.addEventListener('ui-sort', (e: Event) => {
      const customEvt = e as CustomEvent<{ idColuna: string | null; direcao: string }>;
      registrarLog(`<ui-tabela> -> Evento ui-sort (3 Estados) | Coluna: ${customEvt.detail.idColuna || 'Nenhuma (Original)'} | Direção: ${customEvt.detail.direcao}`);
    });

    tabelaIncra.addEventListener('ui-column-resize', (e: Event) => {
      const customEvt = e as CustomEvent<{ idColuna: string; largura: string }>;
      registrarLog(`<ui-tabela> -> Evento ui-column-resize | Coluna: ${customEvt.detail.idColuna} | Nova Largura: ${customEvt.detail.largura}`);
    });
  }


  if (btnTabelaDados && tabelaIncra) {
    btnTabelaDados.addEventListener('ui-click', () => {
      tabelaIncra.dados = dadosIncra;
      registrarLog('<ui-tabela> -> Populado com 10 registros do relatório INCRA/SIGEF.');
    });
  }

  if (btnTabelaEmpty && tabelaIncra) {
    btnTabelaEmpty.addEventListener('ui-click', () => {
      tabelaIncra.dados = [];
      registrarLog('<ui-tabela> -> Alternado para Estado Vazio (Empty State).');
    });
  }

  if (btnDensidadeCompacta && tabelaIncra) {
    btnDensidadeCompacta.addEventListener('ui-click', () => {
      tabelaIncra.densidade = 'compacta';
      registrarLog('<ui-tabela> -> Densidade alterada para COMPACTA (padding 4px 8px).');
    });
  }

  if (btnDensidadeNormal && tabelaIncra) {
    btnDensidadeNormal.addEventListener('ui-click', () => {
      tabelaIncra.densidade = 'normal';
      registrarLog('<ui-tabela> -> Densidade alterada para NORMAL (padding 10px 16px).');
    });
  }

  if (btnDensidadeRelaxada && tabelaIncra) {
    btnDensidadeRelaxada.addEventListener('ui-click', () => {
      tabelaIncra.densidade = 'relaxada';
      registrarLog('<ui-tabela> -> Densidade alterada para RELAXADA (padding 16px 20px).');
    });
  }

  registrarLog('Playground autônomo com Nível 3 (Modal/Bottom Sheet, Alertas, Toasts & Tabela) inicializado.');
});


