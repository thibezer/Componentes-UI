import './src/index';
import { UIToast, ICONES_FERRAMENTAS as I } from './src/index';
import type { UIRibbon, UIPaletaFerramentas, FerramentaItem, UICamadas, CamadaItem, FeicaoItem, UIControleCores, UISeletorCor, DetalheSeletorCor, DetalheControleCores, AlvoCor } from './src/index';
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
    const altPx = isNaN(altNum) ? 15 : Math.max(15, altNum);
    
    // Atualizar variável CSS global de altura em tempo real com piso de 15px
    document.documentElement.style.setProperty('--ui-altura-minima', `${altPx}px`);
    document.documentElement.style.setProperty('--ui-campo-altura', `${altPx}px`);

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
    btn.addEventListener('ui-click', () => {
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
    card.addEventListener('ui-click', () => {
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

  if (btnToastAlerta) {
    btnToastAlerta.addEventListener('ui-click', () => {
      UIToast.notificar({
        tipo: 'alerta',
        titulo: 'Atenção Necessária',
        mensagem: 'Verifique as pendências antes de prosseguir.',
        duracao: 4000
      });
      registrarLog('UIToast.notificar() -> Disparado Toast de ALERTA 🟠');
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

  const filtroTabela = document.getElementById('filtro-tabela-incra');
  if (filtroTabela && tabelaIncra) {
    filtroTabela.addEventListener('ui-input', (e: Event) => {
      const customEvt = e as CustomEvent<{ value: string }>;
      const termo = customEvt.detail?.value || '';
      tabelaIncra.filtrar(termo);
      registrarLog(`<ui-tabela> -> Filtrando registros por: "${termo}"`);
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

  // ----------------------------------------------------
  // 17. Lógica do Web Component <ui-canvas-cad> (CAD/GIS)
  // ----------------------------------------------------
  const canvasCad = document.getElementById('demo-canvas-cad') as any;
  const btnCadCarregar = document.getElementById('btn-cad-carregar-dados');
  const btnCadToggleLayers = document.getElementById('btn-cad-toggle-layers');
  const btnCadPoligonos = document.getElementById('btn-cad-poligonos');
  const btnCadAltaDensidade = document.getElementById('btn-cad-alta-densidade');
  const btnCadZoomExtents = document.getElementById('btn-cad-zoom-extents');
  const btnCadToggleScale = document.getElementById('btn-cad-toggle-scale');
  const btnCadExportState = document.getElementById('btn-cad-export-state');
  const btnCadImportState = document.getElementById('btn-cad-import-state');

  let savedCadState: any = null;
  let scaleModeCurrent: 'screen' | 'world' = 'screen';

  const dadosPontosGeodesicos = [
    { id: 101, nome_vertice: 'M-01', lat: -23.766123, lon: -53.320456, tipo_ponto: 'M', tipo: 'M', este: 671234.56, norte: 7370123.45, altitude: 432.10 },
    { id: 102, nome_vertice: 'B-01', lat: -23.765000, lon: -53.318000, tipo_ponto: 'B', tipo: 'B', este: 671480.00, norte: 7370250.00, altitude: 430.00 },
    { id: 1, nome_vertice: 'P-01', lat: -23.764500, lon: -53.322000, tipo_ponto: 'P', tipo: 'P', ordem_caminhamento: 1, este: 671075.00, norte: 7370305.00, altitude: 428.50 },
    { id: 2, nome_vertice: 'P-02', lat: -23.763000, lon: -53.319500, tipo_ponto: 'P', tipo: 'P', ordem_caminhamento: 2, este: 671330.00, norte: 7370470.00, altitude: 425.00 },
    { id: 3, nome_vertice: 'P-03', lat: -23.764000, lon: -53.316000, tipo_ponto: 'P', tipo: 'P', ordem_caminhamento: 3, este: 671686.00, norte: 7370360.00, altitude: 418.20 },
    { id: 4, nome_vertice: 'P-04', lat: -23.767500, lon: -53.317500, tipo_ponto: 'P', tipo: 'P', ordem_caminhamento: 4, este: 671533.00, norte: 7369970.00, altitude: 422.80 },
    { id: 5, nome_vertice: 'P-05', lat: -23.768000, lon: -53.321500, tipo_ponto: 'P', tipo: 'P', ordem_caminhamento: 5, este: 671126.00, norte: 7369917.00, altitude: 431.10 }
  ];

  const dadosSegmentosGeodesicos = [
    { ponto_inicio_id: 1, ponto_fim_id: 2, tipo_limite_sigef: 'LA1', metodo_posicionamento_sigef: 'PG1' },
    { ponto_inicio_id: 2, ponto_fim_id: 3, tipo_limite_sigef: 'LA1', metodo_posicionamento_sigef: 'PG1' },
    { ponto_inicio_id: 3, ponto_fim_id: 4, tipo_limite_sigef: 'LN1', metodo_posicionamento_sigef: 'PG1' },
    { ponto_inicio_id: 4, ponto_fim_id: 5, tipo_limite_sigef: 'LA1', metodo_posicionamento_sigef: 'PG1' },
    { ponto_inicio_id: 5, ponto_fim_id: 1, tipo_limite_sigef: 'LA1', metodo_posicionamento_sigef: 'PG1' }
  ];

  const dadosConfrontantesGeodesicos = [
    {
      id: 501,
      nome: 'Carlos Eduardo Silveira',
      nome_propriedade: 'Fazenda Boa Esperança (Matrícula 45.120)',
      poligono_wkt: 'POLYGON((-53.3160 -23.7640, -53.3140 -23.7630, -53.3150 -23.7670, -53.3175 -23.7675, -53.3160 -23.7640))'
    }
  ];

  if (canvasCad) {
    // Carregamento inicial automático
    // O módulo do canvas é carregado sob demanda (lazy): espera o elemento ser registrado
    customElements.whenDefined('ui-canvas-cad').then(() => setTimeout(() => {
      canvasCad.pontos = dadosPontosGeodesicos;
      canvasCad.segmentos = dadosSegmentosGeodesicos;
      canvasCad.confrontantes = dadosConfrontantesGeodesicos;
      canvasCad.plotarPoligonos(poligonosExemplo, 'vizinhos');
      canvasCad.fitBounds(dadosPontosGeodesicos, [40, 40], true);
      registrarLog('<ui-canvas-cad> -> Carregado com 7 vértices geodésicos (M-01 Base PPP, B-01 Base Campo, P-01..P-05 Rovers), 5 divisas e confrontante WKT.');
    }, 400));

    canvasCad.addEventListener('ui-ponto-selecionado', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      registrarLog(`<ui-canvas-cad> -> Evento ui-ponto-selecionado | Vértice ID: ${detail.lastSelectedId} | Total Selecionados: ${detail.selectedIds?.length || 0}`);
    });

    canvasCad.addEventListener('ui-camadas-alteradas', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      registrarLog(`<ui-canvas-cad> -> Evento ui-camadas-alteradas | Total de Camadas: ${detail.layers?.length || 0}`);
    });
  }

  if (btnCadCarregar && canvasCad) {
    btnCadCarregar.addEventListener('click', () => {
      canvasCad.pontos = dadosPontosGeodesicos;
      canvasCad.segmentos = dadosSegmentosGeodesicos;
      canvasCad.confrontantes = dadosConfrontantesGeodesicos;
      canvasCad.fitBounds(dadosPontosGeodesicos);
      registrarLog('<ui-canvas-cad> -> Poligonal Geodésica recarregada e enquadrada na tela.');
    });
  }

  // Polígonos de exemplo: sobrepostos (transparência), com furo (anel interno), tracejado e cores distintas
  const poligonosExemplo = [
    {
      id: 'gleba-a', coordenadas: [[-23.7625, -53.3235], [-23.7625, -53.3185], [-23.7660, -53.3185], [-23.7660, -53.3235]],
      estilo: { cor: '#00f5a0', espessura: 1, dashArray: '1, 0', fillOpacity: 0.12 }
    },
    {
      id: 'gleba-b-sobreposta', coordenadas: [[-23.7645, -53.3210], [-23.7645, -53.3160], [-23.7685, -53.3160], [-23.7685, -53.3210]],
      estilo: { cor: '#3b82f6', espessura: 1, dashArray: '1, 0', fillOpacity: 0.12 }
    },
    {
      id: 'area-com-furo',
      coordenadas: [
        [[-23.7600, -53.3170], [-23.7600, -53.3110], [-23.7640, -53.3110], [-23.7640, -53.3170]],
        [[-23.7612, -53.3155], [-23.7612, -53.3130], [-23.7628, -53.3130], [-23.7628, -53.3155]]
      ],
      estilo: { cor: '#f59e0b', espessura: 1, dashArray: '6, 6', fillOpacity: 0.14 }
    },
    {
      id: 'confrontante-roxo',
      wkt: 'POLYGON((-53.3260 -23.7650, -53.3240 -23.7640, -53.3225 -23.7675, -53.3255 -23.7685, -53.3260 -23.7650))',
      estilo: { cor: '#a855f7', espessura: 1 }
    }
  ];

  if (btnCadPoligonos && canvasCad) {
    btnCadPoligonos.addEventListener('click', () => {
      canvasCad.plotarPoligonos(poligonosExemplo, 'vizinhos');
      canvasCad.fitBounds(dadosPontosGeodesicos, [40, 40], true);
      registrarLog('<ui-canvas-cad> -> 4 polígonos de exemplo plotados (2 sobrepostos, 1 com furo tracejado, 1 WKT).');
    });
  }

  if (btnCadAltaDensidade && canvasCad) {
    btnCadAltaDensidade.addEventListener('click', () => {
      const pts = Array.from({ length: 900 }, (_, i) => ({
        id: 1000 + i,
        nome_vertice: `D-${i + 1}`,
        lat: -23.7655 + (Math.random() - 0.5) * 0.0016 + Math.sin(i / 30) * 0.0004,
        lon: -53.3185 + (Math.random() - 0.5) * 0.0024,
        tipo_ponto: 'P',
        tipo: 'P'
      }));
      canvasCad.plotarPontos(pts, 'vertices');
      canvasCad.fitBounds(pts);
      registrarLog('<ui-canvas-cad> -> 900 pontos plotados (modo compacto de alta densidade).');
    });
  }

  // Feições genéricas: o consumidor decide o que carregar (nada vem pronto)
  if (canvasCad) {
    const eventosFeicao = [
      'cad-selecao', 'cad-feicao-selecionada', 'cad-feicao-criada', 'cad-feicao-atualizada', 'cad-feicao-dividida',
      'cad-divisao-falhou', 'cad-medicao', 'cad-conta-gotas', 'cad-edicao-iniciada', 'cad-edicao-concluida',
      'cad-edicao-recusada', 'cad-desenho-recusado', 'cad-previas', 'cad-snap', 'cad-ferramenta'
    ];
    for (const nome of eventosFeicao) {
      canvasCad.addEventListener(nome, (e: Event) => {
        const d = (e as CustomEvent).detail || {};
        const resumo = d.feicao?.id ?? d.feicoes?.length ?? d.ferramenta ?? d.motivo ?? d.tipo ?? '';
        registrarLog(`<ui-canvas-cad> -> ${nome} ${resumo !== '' ? '| ' + resumo : ''}`);
      });
    }
  }

  const btnCadFeicoes = document.getElementById('btn-cad-feicoes');
  const btnCadFeicoesMassa = document.getElementById('btn-cad-feicoes-massa');
  const btnCadPrevias = document.getElementById('btn-cad-previas');
  const btnCadEditar = document.getElementById('btn-cad-editar');
  const btnCadCursor = document.getElementById('btn-cad-cursor');
  const btnCadAjustar = document.getElementById('btn-cad-ajustar');

  if (btnCadFeicoes && canvasCad) {
    btnCadFeicoes.addEventListener('click', () => {
      const [lat, lon] = [-23.7655, -53.3195];
      const d = (a: number, b: number): [number, number] => [lat + a, lon + b];
      const r = canvasCad.definirFeicoes('feicoes-demo', [
        { id: 'gleba', entidadeId: 'gleba', propriedades: { name: 'Gleba Central', category: 'Rural', autor: 'Demo', data: '2026-10-09' },
          estilo: { corPreenchimento: '#00f5a0', mostrarRotulo: true, campoRotulo: 'area' },
          geometria: { tipo: 'Polygon', aneis: [[d(0.0008, -0.0012), d(0.0008, 0.0004), d(-0.0008, 0.0004), d(-0.0008, -0.0012)]] } },
        { id: 'gleba-previa', entidadeId: 'gleba', status: 'previa', propriedades: { name: 'Gleba Central (proposta)' },
          estilo: { corTraco: '#f59e0b' },
          geometria: { tipo: 'Polygon', aneis: [[d(0.0008, -0.0012), d(0.0008, 0.0010), d(-0.0008, 0.0010), d(-0.0008, -0.0012)]] } },
        { id: 'estrada', propriedades: { name: 'Estrada vicinal' }, estilo: { corTraco: '#3b82f6', espessuraTraco: 3, mostrarRotulo: true, campoRotulo: 'extensao' },
          geometria: { tipo: 'LineString', coordenadas: [d(-0.0012, -0.0020), d(-0.0004, -0.0006), d(0.0004, 0.0012), d(0.0012, 0.0024)] } },
        { id: 'raio', propriedades: { name: 'Raio de 80 m' }, estilo: { corTraco: '#a855f7' },
          geometria: { tipo: 'Circle', centro: d(0.0000, 0.0018), raioMetros: 80 } },
        { id: 'torre', propriedades: { name: 'Torre de sinal' }, estilo: { icone: 'tower', tamanhoIcone: 28, corTraco: '#ef4444' },
          geometria: { tipo: 'Point', coordenada: d(0.0012, 0.0016) } },
        { id: 'rotulo', estilo: { halo: true },
          geometria: { tipo: 'Text', coordenada: d(-0.0012, -0.0004), texto: 'Gleba Central' } }
      ], { nome: 'Feições de exemplo', zIndex: 900 });
      canvasCad.definirCamadaDesenho('desenhos-demo');
      canvasCad.setAttribute('ferramentas', 'todas');
      canvasCad.ajustarTudo();
      registrarLog(`<ui-canvas-cad> -> ${r.aceitas} feições carregadas (clique para selecionar, arraste a caixa, use a barra de ferramentas à esquerda; S = snap, Alt = desliga).`);
    });
  }

  const btnCadCurvas = document.getElementById('btn-cad-curvas');
  const btnCadCaneta = document.getElementById('btn-cad-caneta');
  if (btnCadCurvas && canvasCad) {
    btnCadCurvas.addEventListener('click', () => {
      const [lat, lon] = [-23.7655, -53.3195];
      const d = (a: number, b: number): [number, number] => [lat + a, lon + b];
      canvasCad.definirFeicoes('curvas-demo', [
        { id: 'reta', propriedades: { name: 'Linha reta' }, estilo: { corTraco: '#3b82f6', espessuraTraco: 3 },
          geometria: { tipo: 'LineString', coordenadas: [d(-0.0006, -0.0020), d(0.0002, -0.0008), d(-0.0006, 0.0004)] } },
        { id: 'curva', propriedades: { name: 'Linha curva' }, estilo: { corTraco: '#f59e0b', espessuraTraco: 3 },
          geometria: { tipo: 'LineString', coordenadas: [d(0.0006, -0.0020), d(0.0006, 0.0004)], curva: [
            { ponto: d(0.0006, -0.0020), saida: d(0.0016, -0.0012) }, { ponto: d(0.0006, 0.0004), entrada: d(-0.0004, -0.0004) }
          ] } },
        { id: 'poligono', propriedades: { name: 'Polígono reto' }, estilo: { corPreenchimento: '#00f5a0' },
          geometria: { tipo: 'Polygon', aneis: [[d(0.0008, 0.0012), d(0.0008, 0.0026), d(-0.0006, 0.0026), d(-0.0006, 0.0012)]] } }
      ], { nome: 'Curvas de exemplo', zIndex: 900 });
      canvasCad.definirCamadaDesenho('desenhos-demo');
      canvasCad.setAttribute('ferramentas', 'todas');
      canvasCad.ajustarCamada('curvas-demo');
      canvasCad.selecionarFeicao('curvas-demo', 'reta');
      canvasCad.editarVertices('curvas-demo', 'reta');
      registrarLog('<ui-canvas-cad> -> Editando a linha reta: as alças pontilhadas já estão lá; arraste uma para curvar (Shift solta a simetria). Para outra feição: selecione e use "Editar Vértices".');
    });
  }
  if (btnCadCaneta && canvasCad) {
    btnCadCaneta.addEventListener('click', () => {
      canvasCad.setAttribute('ferramentas', 'todas');
      canvasCad.definirCamadaDesenho('desenhos-demo');
      const r = canvasCad.definirFerramenta('caneta');
      registrarLog(r?.ok === false ? `<ui-canvas-cad> -> Caneta recusada: ${r.motivo}.` : '<ui-canvas-cad> -> Caneta: clique = reta, arraste = curva; depois arraste as alças dos pontos já colocados para ajustar. Enter conclui.');
    });
  }

  if (btnCadFeicoesMassa && canvasCad) {
    btnCadFeicoesMassa.addEventListener('click', () => {
      const t0 = performance.now();
      const pts = Array.from({ length: 100000 }, (_, i) => ({
        id: `m${i}`,
        geometria: { tipo: 'Point', coordenada: [-23.7655 + (Math.random() - 0.5) * 0.3, -53.3195 + (Math.random() - 0.5) * 0.3] }
      }));
      const r = canvasCad.definirFeicoes('feicoes-massa', pts, { nome: '100 mil pontos', zIndex: 850, estilo: { corPrimaria: '#f43f5e', tamanhoMarcador: 6 } });
      canvasCad.ajustarCamada('feicoes-massa');
      registrarLog(`<ui-canvas-cad> -> ${r.aceitas} pontos em ${Math.round(performance.now() - t0)} ms (culling + clusters; aproxime para desagrupar).`);
    });
  }

  if (btnCadPrevias && canvasCad) {
    btnCadPrevias.addEventListener('click', () => {
      canvasCad.alternarPreviasGlobais();
      registrarLog(`<ui-canvas-cad> -> Prévias ${canvasCad.previasGlobais ? 'mostradas' : 'escondidas (a oficial prevalece)'}.`);
    });
  }

  if (btnCadEditar && canvasCad) {
    btnCadEditar.addEventListener('click', () => {
      const f = canvasCad.obterFeicoesSelecionadas()[0];
      if (!f) { registrarLog('<ui-canvas-cad> -> Selecione uma feição (linha ou polígono) para editar os vértices.'); return; }
      const r = canvasCad.editarVertices(f.camadaId, f.id);
      if (!r.ok) registrarLog(`<ui-canvas-cad> -> Edição recusada: ${r.motivo}.`);
    });
  }

  if (btnCadCursor && canvasCad) {
    let passo = 0;
    btnCadCursor.addEventListener('click', () => {
      passo++;
      canvasCad.atualizarCursorRemoto({ id: 'ana', nome: 'Ana (remota)', cor: '#22c55e' }, [-23.7655 + Math.sin(passo) * 0.0006, -53.3195 + passo * 0.0002]);
      registrarLog('<ui-canvas-cad> -> Cursor remoto de Ana movido.');
    });
  }

  if (btnCadAjustar && canvasCad) {
    btnCadAjustar.addEventListener('click', () => {
      registrarLog(canvasCad.ajustarTudo() ? '<ui-canvas-cad> -> Enquadrado em todas as feições.' : '<ui-canvas-cad> -> Não há feições para enquadrar.');
    });
  }

  if (btnCadToggleLayers && canvasCad) {
    btnCadToggleLayers.addEventListener('click', () => {
      canvasCad.toggleLayersPanel();
      registrarLog('<ui-canvas-cad> -> Painel QGIS de Camadas alternado.');
    });
  }

  if (btnCadZoomExtents && canvasCad) {
    btnCadZoomExtents.addEventListener('click', () => {
      canvasCad.zoomExtents();
      registrarLog('<ui-canvas-cad> -> Zoom Extents executado.');
    });
  }

  if (btnCadToggleScale && canvasCad) {
    btnCadToggleScale.addEventListener('click', () => {
      scaleModeCurrent = scaleModeCurrent === 'screen' ? 'world' : 'screen';
      canvasCad.setLayerScaleMode('perimetro', scaleModeCurrent);
      canvasCad.setLayerScaleMode('vertices', scaleModeCurrent);
      registrarLog(`<ui-canvas-cad> -> Modo de escala alternado para: ${scaleModeCurrent.toUpperCase()} (${scaleModeCurrent === 'world' ? 'Métrico no terreno' : 'Pixels fixos na tela'}).`);
    });
  }

  if (btnCadExportState && canvasCad) {
    btnCadExportState.addEventListener('click', () => {
      savedCadState = canvasCad.exportState();
      const stateJson = JSON.stringify(savedCadState, null, 2);
      console.log('Estado Exportado do Canvas CAD:', stateJson);
      registrarLog(`<ui-canvas-cad> -> Estado exportado em JSON (${savedCadState.length} camadas). Ver console.`);
    });
  }

  if (btnCadImportState && canvasCad) {
    btnCadImportState.addEventListener('click', () => {
      if (savedCadState) {
        canvasCad.importState(savedCadState);
        registrarLog('<ui-canvas-cad> -> Estado anterior restaurado via importState().');
      } else {
        registrarLog('<ui-canvas-cad> -> Nenhum estado salvo previamente para restaurar.');
      }
    });
  }

  // ----------------------------------------------------
  // 18. Formulário Inteligente com FormData Nativo
  // ----------------------------------------------------
  const formInteligente = document.getElementById('form-demo-inteligente') as HTMLFormElement | null;
  if (formInteligente) {
    formInteligente.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(formInteligente);
      const objetoDados = Object.fromEntries(formData.entries());
      const jsonStr = JSON.stringify(objetoDados);
      registrarLog(`[FormData Nativo] -> Submetido com sucesso! Dados extraídos: ${jsonStr}`);
      UIToast.notificar({
        tipo: 'sucesso',
        titulo: 'Formulário Submetido!',
        mensagem: `Extraído via FormData em 1 linha: ${jsonStr}`
      });
    });
  }

  // Ouvinte Global do UIBus para o Console de Logs
  window.addEventListener('uibus:clipboard:copiado', (e: any) => {
    registrarLog(`[UIBus] -> Texto copiado para a área de transferência: "${e.detail?.texto}"`);
  });

  window.addEventListener('uibus:modal:aberto', (e: any) => {
    registrarLog(`[UIBus / Zero-JS] -> Modal "${e.detail?.id}" aberto automaticamente!`);
  });

  window.addEventListener('uibus:modal:fechado', (e: any) => {
    registrarLog(`[UIBus / Zero-JS] -> Modal "${e.detail?.id}" fechado.`);
  });

  window.addEventListener('uibus:modal:fechado-todos', () => {
    registrarLog('[UIBus / Zero-JS] -> Todos os modais abertos foram fechados.');
  });

  window.addEventListener('uibus:tema:alterado', (e: any) => {
    const tema = e.detail?.tema;
    const iconeTema = tema === 'claro' ? '☀️' : '🌙';
    registrarLog(`[UIBus / Tema] -> Tema visual alternado para: "${tema?.toUpperCase()}" ${iconeTema}`);

    // Atualizar texto e título do botão de alternar tema no cabeçalho
    const btnTema = document.getElementById('btn-alternar-tema');
    if (btnTema) {
      btnTema.innerHTML = tema === 'claro' ? '🌙 Modo Escuro' : '☀️ Modo Claro';
      btnTema.setAttribute('title', tema === 'claro' ? 'Alternar para Modo Escuro' : 'Alternar para Modo Claro');
    }

    UIToast.notificar({
      tipo: 'info',
      titulo: 'Tema Visual Alterado',
      mensagem: tema === 'claro' ? '☀️ Modo Claro ativado com sucesso!' : '🌙 Modo Escuro ativado com sucesso!'
    });
  });

  window.addEventListener('uibus:densidade:alterada', (e: any) => {
    registrarLog(`[UIBus / Zero-JS] -> Densidade global atualizada: "${e.detail?.densidade}" (${e.detail?.alturaPx}px)`);
  });

  // ----------------------------------------------------
  // 19. Tabela de Propriedades (AutoCAD & Revit)
  // ----------------------------------------------------
  const propAutoCAD = document.getElementById('propriedades-autocad') as any;
  if (propAutoCAD) {
    propAutoCAD.tipos = [
      { id: 'Circle', rotulo: 'Circle' },
      { id: 'Line', rotulo: 'Line' },
      { id: 'Polyline', rotulo: 'Polyline' }
    ];
    propAutoCAD.tipoSelecionado = 'Circle';

    propAutoCAD.categorias = [
      {
        id: 'general',
        titulo: 'General',
        aberto: true,
        propriedades: [
          { id: 'color', rotulo: 'Color', tipo: 'cor-cad', valor: 'ByLayer' },
          {
            id: 'layer',
            rotulo: 'Layer',
            tipo: 'selecao',
            valor: '0',
            opcoes: [
              { id: '0', rotulo: '0' },
              { id: 'confrontantes', rotulo: 'Confrontantes' },
              { id: 'perimetro', rotulo: 'Perímetro' }
            ]
          },
          {
            id: 'linetype',
            rotulo: 'Linetype',
            tipo: 'linetype',
            valor: 'ByLayer'
          },
          { id: 'linetype_scale', rotulo: 'Linetype scale', tipo: 'numero', valor: 1 },
          { id: 'plot_style', rotulo: 'Plot style', tipo: 'readonly', valor: 'ByColor' },
          {
            id: 'lineweight',
            rotulo: 'Lineweight',
            tipo: 'lineweight',
            valor: 'ByLayer'
          },
          { id: 'transparency', rotulo: 'Transparency', tipo: 'readonly', valor: 'ByLayer' },
          { id: 'thickness', rotulo: 'Thickness', tipo: 'numero', valor: 0 }
        ]
      },
      {
        id: '3d_visualization',
        titulo: '3D Visualization',
        aberto: true,
        propriedades: [
          { id: 'material', rotulo: 'Material', tipo: 'readonly', valor: 'ByLayer' }
        ]
      },
      {
        id: 'geometry',
        titulo: 'Geometry',
        aberto: true,
        propriedades: [
          { id: 'center_x', rotulo: 'Center X', tipo: 'numero', valor: 2069.6436, casasDecimais: 4 },
          { id: 'center_y', rotulo: 'Center Y', tipo: 'numero', valor: 2644.5715, casasDecimais: 4 },
          { id: 'center_z', rotulo: 'Center Z', tipo: 'numero', valor: 0, casasDecimais: 4 },
          { id: 'radius', rotulo: 'Radius', tipo: 'numero', valor: 266.5336, casasDecimais: 4 },
          { id: 'diameter', rotulo: 'Diameter', tipo: 'readonly', valor: 533.0673 },
          { id: 'circumference', rotulo: 'Circumference', tipo: 'readonly', valor: 1674.6803 },
          { id: 'area', rotulo: 'Area', tipo: 'readonly', valor: 223179.3279 },
          { id: 'normal_x', rotulo: 'Normal X', tipo: 'numero', valor: 0 },
          { id: 'normal_y', rotulo: 'Normal Y', tipo: 'numero', valor: 0 },
          { id: 'normal_z', rotulo: 'Normal Z', tipo: 'numero', valor: 1 }
        ]
      }
    ];

    propAutoCAD.addEventListener('ui-propriedade-alterada', (e: any) => {
      registrarLog(`[AutoCAD Propriedades] "${e.detail.id}" alterado para: ${e.detail.valor}`);
    });

    propAutoCAD.addEventListener('ui-quick-select', () => {
      UIToast.notificar({ tipo: 'info', mensagem: 'Disparado Quick Select (Seleção Rápida CAD)' });
      registrarLog('[AutoCAD] Botão Quick Select clicado');
    });

    propAutoCAD.addEventListener('ui-selecionar-objetos', () => {
      UIToast.notificar({ tipo: 'info', mensagem: 'Modo de seleção de objetos ativado no canvas' });
      registrarLog('[AutoCAD] Botão Select Objects clicado');
    });

    propAutoCAD.addEventListener('ui-calculadora', () => {
      UIToast.notificar({ tipo: 'info', mensagem: 'QuickCalc / Calculadora Geométrica aberta' });
      registrarLog('[AutoCAD] Botão QuickCalc clicado');
    });
  }

  const propRevit = document.getElementById('propriedades-revit') as any;
  if (propRevit) {
    propRevit.tipos = [
      { id: 'planta_piso', rotulo: 'Planta de piso', subtipo: 'Planta de piso: Nível 1' },
      { id: 'corte_aa', rotulo: 'Corte A-A', subtipo: 'Vista de Seção' },
      { id: 'fachada_norte', rotulo: 'Fachada Norte', subtipo: 'Elevação Arquitetônica' }
    ];
    propRevit.tipoSelecionado = 'planta_piso';

    propRevit.categorias = [
      {
        id: 'graficos',
        titulo: 'Gráficos',
        aberto: true,
        propriedades: [
          {
            id: 'escala_vista',
            rotulo: 'Escala da vista',
            tipo: 'selecao',
            valor: '1:100',
            opcoes: [
              { id: '1:50', rotulo: '1 : 50' },
              { id: '1:100', rotulo: '1 : 100' },
              { id: '1:200', rotulo: '1 : 200' },
              { id: '1:500', rotulo: '1 : 500' }
            ]
          },
          { id: 'valor_escala', rotulo: 'Valor de escala 1:', tipo: 'numero', valor: 100 },
          {
            id: 'exibir_modelo',
            rotulo: 'Exibir modelo',
            tipo: 'selecao',
            valor: 'Normal',
            opcoes: [
              { id: 'Normal', rotulo: 'Normal' },
              { id: 'Meio-tom', rotulo: 'Meio-tom' }
            ]
          },
          {
            id: 'nivel_detalhe',
            rotulo: 'Nível de detalhe',
            tipo: 'selecao',
            valor: 'Baixo',
            opcoes: [
              { id: 'Baixo', rotulo: 'Baixo' },
              { id: 'Medio', rotulo: 'Médio' },
              { id: 'Alto', rotulo: 'Alto' }
            ]
          },
          {
            id: 'visibilidade_pecas',
            rotulo: 'Visibilidade de peças',
            tipo: 'selecao',
            valor: 'Mostrar original',
            opcoes: [
              { id: 'Mostrar original', rotulo: 'Mostrar original' },
              { id: 'Mostrar peças', rotulo: 'Mostrar peças' }
            ]
          },
          {
            id: 'visibilidade_sobreposicoes',
            rotulo: 'Visibilidade/Sobrep...',
            tipo: 'acao',
            valor: 'Editar...',
            rotuloAcao: 'Editar...',
            onClickAcao: () => {
              UIToast.notificar({ tipo: 'info', mensagem: 'Abrindo diálogo de Visibilidade/Gráficos (VG)...' });
            }
          },
          {
            id: 'opcoes_exibicao',
            rotulo: 'Opções de exibição...',
            tipo: 'acao',
            valor: 'Editar...',
            rotuloAcao: 'Editar...',
            onClickAcao: () => {
              UIToast.notificar({ tipo: 'info', mensagem: 'Abrindo Opções de Exibição de Gráficos...' });
            }
          },
          {
            id: 'orientacao',
            rotulo: 'Orientação',
            tipo: 'selecao',
            valor: 'Norte do projeto',
            opcoes: [
              { id: 'Norte do projeto', rotulo: 'Norte do projeto' },
              { id: 'Norte verdadeiro', rotulo: 'Norte verdadeiro' }
            ]
          },
          {
            id: 'disciplina',
            rotulo: 'Disciplina',
            tipo: 'selecao',
            valor: 'Arquitetura',
            opcoes: [
              { id: 'Arquitetura', rotulo: 'Arquitetura' },
              { id: 'Estrutura', rotulo: 'Estrutura' },
              { id: 'Mecânica', rotulo: 'Mecânica' },
              { id: 'Elétrica', rotulo: 'Elétrica' },
              { id: 'Coordenação', rotulo: 'Coordenação' }
            ]
          },
          {
            id: 'mostrar_linhas_ocultas',
            rotulo: 'Mostrar linhas ocultas',
            tipo: 'selecao',
            valor: 'Por disciplina',
            opcoes: [
              { id: 'Por disciplina', rotulo: 'Por disciplina' },
              { id: 'Tudo', rotulo: 'Tudo' },
              { id: 'Nenhum', rotulo: 'Nenhum' }
            ]
          },
          {
            id: 'esquema_cor',
            rotulo: 'Esquema de cor',
            tipo: 'acao',
            valor: '<nenhum>',
            rotuloAcao: '<nenhum>',
            onClickAcao: () => {
              UIToast.notificar({ tipo: 'info', mensagem: 'Seletor de Esquema de Cores acionado.' });
            }
          }
        ]
      }
    ];

    propRevit.addEventListener('ui-aplicar', (e: any) => {
      registrarLog(`[Revit Propriedades] -> Botão APLICAR acionado! Dados consolidados: ${JSON.stringify(e.detail.valores)}`);
      UIToast.notificar({
        tipo: 'sucesso',
        titulo: 'Propriedades Aplicadas!',
        mensagem: 'As alterações foram salvas com sucesso na vista ativa.'
      });
    });

    propRevit.addEventListener('ui-desfazer', () => {
      registrarLog('[Revit Propriedades] -> Alterações desfeitas.');
    });

    propRevit.addEventListener('ui-ajuda', () => {
      UIToast.notificar({
        tipo: 'info',
        titulo: 'Ajuda de Propriedades',
        mensagem: 'Documentação de propriedades da vista de planta aberta na Central de Ajuda.'
      });
      registrarLog('[Revit] Link "Ajuda de propriedades" clicado');
    });

    propRevit.addEventListener('ui-editar-tipo-clique', (e: any) => {
      UIToast.notificar({
        tipo: 'alerta',
        titulo: 'Propriedades do Tipo',
        mensagem: `Abrindo editor de parâmetros de família para: ${e.detail.tipo?.rotulo}`
      });
      registrarLog(`[Revit] Botão "Editar tipo" acionado para: ${e.detail.tipo?.rotulo}`);
    });
  }

  // ----------------------------------------------------
  // Barras de Ferramentas (Ribbon & Paleta)
  // ----------------------------------------------------
  const demoRibbon = document.getElementById('demo-ribbon') as UIRibbon | null;
  if (demoRibbon) {
    demoRibbon.abas = [
      {
        id: 'inicio',
        rotulo: 'Início',
        grupos: [
          {
            id: 'transferencia',
            rotulo: 'Área de Transferência',
            itens: [
              { id: 'colar', rotulo: 'Colar', icone: I.colar, tamanho: 'grande', atalho: 'Ctrl+V' },
              { id: 'copiar', rotulo: 'Copiar', icone: I.copiar, atalho: 'Ctrl+C' },
              { id: 'desfazer', rotulo: 'Desfazer', icone: I.desfazer, atalho: 'Ctrl+Z' },
              { id: 'refazer', rotulo: 'Refazer', icone: I.refazer, atalho: 'Ctrl+Y' }
            ]
          },
          {
            id: 'desenho',
            rotulo: 'Desenho',
            prioridade: 10,
            itens: [
              {
                id: 'menu-linha',
                rotulo: 'Linha',
                icone: I.linha,
                tamanho: 'grande',
                dividido: true,
                filhos: [
                  { id: 'linha', rotulo: 'Linha', icone: I.linha, atalho: 'L' },
                  { id: 'polilinha', rotulo: 'Polilinha', icone: I.polilinha, atalho: 'PL' },
                  { id: 'sep', tipo: 'separador' },
                  {
                    id: 'arcos',
                    rotulo: 'Arcos e Curvas',
                    icone: I.arco,
                    filhos: [
                      { id: 'arco-3p', rotulo: 'Arco por 3 pontos' },
                      { id: 'arco-centro', rotulo: 'Arco centro e raio' }
                    ]
                  }
                ]
              },
              { id: 'retangulo', rotulo: 'Retângulo', icone: I.retangulo },
              { id: 'circulo', rotulo: 'Círculo', icone: I.circulo },
              { id: 'texto', rotulo: 'Texto', icone: I.texto }
            ]
          },
          {
            id: 'formato',
            rotulo: 'Formato',
            prioridade: 5,
            lancadorDialogo: true,
            rotuloLancador: 'Opções Avançadas de Formato',
            itens: [
              { id: 'negrito', icone: I.negrito, rotulo: 'Negrito', tipo: 'toggle', somenteIcone: true, atalho: 'Ctrl+B' },
              { id: 'italico', icone: I.italico, rotulo: 'Itálico', tipo: 'toggle', somenteIcone: true, atalho: 'Ctrl+I' },
              { id: 'grade', icone: I.grade, rotulo: 'Grade', tipo: 'toggle', somenteIcone: true, ativo: true }
            ]
          }
        ]
      },
      {
        id: 'anotar',
        rotulo: 'Anotar',
        grupos: [
          {
            id: 'medicao',
            rotulo: 'Medição',
            itens: [
              { id: 'medir', rotulo: 'Medir', icone: I.medir, tamanho: 'grande' },
              { id: 'camadas', rotulo: 'Camadas', icone: I.camadas, tamanho: 'grande' }
            ]
          }
        ]
      },
      {
        id: 'edicao-poli',
        rotulo: 'Edição de Polilinha',
        contextual: true,
        oculta: true,
        grupos: [
          {
            id: 'vertices',
            rotulo: 'Vértices',
            itens: [{ id: 'add-vertice', rotulo: 'Adicionar', icone: I.ponto, tamanho: 'grande' }]
          }
        ]
      }
    ];

    demoRibbon.addEventListener('ui-ferramenta', (e: any) => {
      const d = e.detail;
      registrarLog(`[Ribbon] ${d.pai ? d.pai.id + ' → ' : ''}${d.id}${d.ativo !== undefined ? ` (ativo=${d.ativo})` : ''} [aba: ${d.aba}]`);
      if (d.id === 'polilinha') demoRibbon.definirAbaVisivel('edicao-poli', true);
    });
    demoRibbon.addEventListener('ui-aba-change', (e: any) => registrarLog(`[Ribbon] Aba: ${e.detail.id}`));
    demoRibbon.addEventListener('ui-grupo-dialogo', (e: any) => registrarLog(`[Ribbon] Lançador de Diálogo: ${e.detail.grupo.rotulo} (id=${e.detail.id})`));
  }

  const ferramentasPaleta = (): FerramentaItem[] => [
    { id: 'selecionar', rotulo: 'Selecionar', icone: I.selecionar, atalho: 'V' },
    { id: 'mao', rotulo: 'Mão', icone: I.mao, atalho: 'H' },
    { id: 'zoom', rotulo: 'Zoom', icone: I.zoom, atalho: 'Z' },
    { id: 's1', tipo: 'separador' },
    {
      id: 'g-forma',
      filhos: [
        { id: 'retangulo', rotulo: 'Retângulo', icone: I.retangulo, atalho: 'M' },
        { id: 'circulo', rotulo: 'Círculo', icone: I.circulo, atalho: 'M' },
        { id: 'arco', rotulo: 'Arco', icone: I.arco }
      ]
    },
    {
      id: 'g-linha',
      filhos: [
        { id: 'linha', rotulo: 'Linha', icone: I.linha, atalho: 'L' },
        { id: 'polilinha', rotulo: 'Polilinha', icone: I.polilinha }
      ]
    },
    { id: 'caneta', rotulo: 'Caneta', icone: I.caneta, atalho: 'P' },
    { id: 'texto', rotulo: 'Texto', icone: I.texto, atalho: 'T' },
    { id: 's2', tipo: 'separador' },
    { id: 'medir', rotulo: 'Medir', icone: I.medir, atalho: 'I' },
    { id: 'grade', rotulo: 'Grade', icone: I.grade, tipo: 'toggle' },
    { id: 'desfazer', rotulo: 'Desfazer', icone: I.desfazer, tipo: 'botao' }
  ];

  ['demo-paleta', 'demo-paleta-2col', 'demo-paleta-horizontal'].forEach(id => {
    const paleta = document.getElementById(id) as UIPaletaFerramentas | null;
    if (!paleta) return;
    paleta.ferramentas = ferramentasPaleta();
    paleta.addEventListener('ui-change', (e: any) => registrarLog(`[Paleta:${id}] Ferramenta: ${e.detail.anterior || '—'} → ${e.detail.valor}`));
    paleta.addEventListener('ui-ferramenta', (e: any) => {
      if (e.detail.item.tipo === 'toggle' || e.detail.item.tipo === 'botao') {
        registrarLog(`[Paleta:${id}] ${e.detail.id}${e.detail.ativo !== undefined ? ` (ativo=${e.detail.ativo})` : ''}`);
      }
    });
  });

  // ----------------------------------------------------
  // 16. Painel de Camadas GIS / CAD (<ui-camadas>)
  // ----------------------------------------------------
  const mockCamadasGis: CamadaItem[] = [
    { id: 'grupo-planejamento', name: 'Planejamento Urbano', isGroup: true, visible: true, locked: false },
    { id: 'camada-zoneamento', name: 'Zoneamento (ZR3 / Comercial)', color: '#00E08A', visible: true, locked: false, parentId: 'grupo-planejamento' },
    { id: 'camada-lotes', name: 'Lotes e Glebas Urbanas', color: '#38bdf8', visible: true, locked: false, parentId: 'grupo-planejamento' },
    { id: 'grupo-infra', name: 'Infraestrutura & Meio Ambiente', isGroup: true, visible: true, locked: false },
    { id: 'camada-eixos', name: 'Eixos Viários & Rodovias', color: '#f59e0b', visible: true, locked: false, parentId: 'grupo-infra' },
    { id: 'camada-hidro', name: 'Hidrografia & APPs', color: '#06b6d4', visible: true, locked: false, parentId: 'grupo-infra' },
    { id: 'camada-marcos', name: 'Marcos Geodésicos / Vértices', color: '#ec4899', visible: true, locked: false }
  ];

  const mockFeicoesGis: FeicaoItem[] = [
    {
      id: 'feat-poly-1',
      name: 'Gleba A - Perímetro Fazenda Real',
      layerId: 'camada-zoneamento',
      type: 'Polygon',
      category: 'Perímetro',
      status: 'oficial',
      color: '#00E08A',
      coordinates: [
        [-23.55052, -46.633308],
        [-23.55152, -46.633308],
        [-23.55152, -46.635308],
        [-23.55052, -46.635308],
        [-23.55052, -46.633308]
      ]
    },
    {
      id: 'feat-poly-2',
      name: 'Reserva Legal - APP Nascente 01',
      layerId: 'camada-hidro',
      type: 'Polygon',
      category: 'Ambiental',
      status: 'oficial',
      color: '#06b6d4',
      coordinates: [
        [-23.5520, -46.6340],
        [-23.5535, -46.6340],
        [-23.5535, -46.6360],
        [-23.5520, -46.6360],
        [-23.5520, -46.6340]
      ]
    },
    {
      id: 'feat-poly-3',
      name: 'Lote 14 Quadra B (Proposta)',
      layerId: 'camada-lotes',
      type: 'Polygon',
      category: 'Loteamento',
      status: 'previa',
      color: '#38bdf8',
      coordinates: [
        [-23.5540, -46.6320],
        [-23.5550, -46.6320],
        [-23.5550, -46.6330],
        [-23.5540, -46.6330],
        [-23.5540, -46.6320]
      ]
    },
    {
      id: 'feat-poly-4',
      name: 'Lote 15 Quadra B (Oficial)',
      layerId: 'camada-lotes',
      type: 'Polygon',
      category: 'Loteamento',
      status: 'oficial',
      color: '#38bdf8',
      coordinates: [
        [-23.5540, -46.6331],
        [-23.5550, -46.6331],
        [-23.5550, -46.6341],
        [-23.5540, -46.6341],
        [-23.5540, -46.6331]
      ]
    },
    {
      id: 'feat-line-1',
      name: 'Avenida das Palmeiras (Eixo Principal)',
      layerId: 'camada-eixos',
      type: 'LineString',
      category: 'Viário',
      status: 'oficial',
      color: '#f59e0b',
      coordinates: [
        [-23.5500, -46.6300],
        [-23.5525, -46.6335],
        [-23.5560, -46.6380]
      ]
    },
    {
      id: 'feat-line-2',
      name: 'Rua Projetada 03 (Ligação)',
      layerId: 'camada-eixos',
      type: 'LineString',
      category: 'Viário',
      status: 'previa',
      color: '#f59e0b',
      coordinates: [
        [-23.5525, -46.6335],
        [-23.5540, -46.6310]
      ]
    },
    {
      id: 'feat-point-1',
      name: 'M-01 (Marco Base Geodésico INCRA)',
      layerId: 'camada-marcos',
      type: 'Point',
      category: 'Vértice',
      status: 'oficial',
      color: '#ec4899',
      coordinates: [-23.55052, -46.633308]
    },
    {
      id: 'feat-point-2',
      name: 'M-02 (Vértice de Divisa Fazenda)',
      layerId: 'camada-marcos',
      type: 'Point',
      category: 'Vértice',
      status: 'oficial',
      color: '#ec4899',
      coordinates: [-23.55152, -46.635308]
    }
  ];

  const painelDocked = document.getElementById('demo-camadas-docked') as UICamadas | null;
  const painelFlutuante = document.getElementById('demo-camadas-flutuante') as UICamadas | null;

  [painelDocked, painelFlutuante].forEach((painel, idx) => {
    if (!painel) return;
    const nomePainel = idx === 0 ? 'Docked' : 'Flutuante';
    painel.definirCamadas(
      JSON.parse(JSON.stringify(mockCamadasGis)),
      JSON.parse(JSON.stringify(mockFeicoesGis))
    );

    painel.addEventListener('ui-camada-selecionada', (e: any) => {
      registrarLog(`[Camadas:${nomePainel}] Camada ativa para desenho: ${e.detail.camadaId}`);
    });
    painel.addEventListener('ui-feicoes-selecionadas', (e: any) => {
      registrarLog(`[Camadas:${nomePainel}] Feições selecionadas: ${e.detail.feicoesIds?.length || 0} item(ns)`);
    });
    painel.addEventListener('ui-camada-visibilidade', (e: any) => {
      registrarLog(`[Camadas:${nomePainel}] Visibilidade camada "${e.detail.camadaId}": ${e.detail.visivel}`);
    });
    painel.addEventListener('ui-camada-bloqueio', (e: any) => {
      registrarLog(`[Camadas:${nomePainel}] Bloqueio camada "${e.detail.camadaId}": ${e.detail.bloqueado}`);
    });
    painel.addEventListener('ui-feicao-movida', (e: any) => {
      registrarLog(`[Camadas:${nomePainel}] Feição "${e.detail.feicao?.name}" transferida: ${e.detail.camadaOrigemId} → ${e.detail.camadaDestinoId}`);
    });
    painel.addEventListener('ui-mapa-base-alterado', (e: any) => {
      registrarLog(`[Camadas:${nomePainel}] Mapa base alterado para: ${e.detail.mapaBaseId}`);
    });
    painel.addEventListener('ui-acao-massa', (e: any) => {
      registrarLog(`[Camadas:${nomePainel}] Ação coletiva: "${e.detail.acao}" em ${e.detail.feicoesIds?.length || 0} feição(ões)`);
    });
    painel.addEventListener('ui-camada-adicionar', (e: any) => {
      const parentId = e.detail?.parentId || null;
      const novaId = 'camada-auto-' + Date.now();
      const novaCamada: CamadaItem = {
        id: novaId,
        name: parentId ? `Subcamada ${painel.camadas.length + 1}` : `Nova Camada ${painel.camadas.length + 1}`,
        color: '#a855f7',
        visible: true,
        parentId
      };
      painel.adicionarCamada(novaCamada);
      registrarLog(`[Camadas:${nomePainel}] Nova camada criada: ${novaCamada.name}${parentId ? ` (no grupo ${parentId})` : ''}`);
      UIToast.notificar({ tipo: 'sucesso', titulo: 'Nova Camada', mensagem: `Camada "${novaCamada.name}" criada com sucesso.` });
    });
    painel.addEventListener('ui-camada-grupo-adicionar', () => {
      const novoId = 'grupo-auto-' + Date.now();
      const novoGrupo: CamadaItem = {
        id: novoId,
        name: `Novo Grupo ${painel.camadas.filter((c) => c.isGroup).length + 1}`,
        isGroup: true,
        visible: true
      };
      painel.adicionarCamada(novoGrupo);
      registrarLog(`[Camadas:${nomePainel}] Novo grupo criado: ${novoGrupo.name}`);
      UIToast.notificar({ tipo: 'sucesso', titulo: 'Novo Grupo', mensagem: `Grupo "${novoGrupo.name}" criado com sucesso.` });
    });
    painel.addEventListener('ui-camada-mover-hierarquia', (e: any) => {
      registrarLog(`[Camadas:${nomePainel}] Camada "${e.detail.camadaId}" movida para: ${e.detail.novoParentId || '(Nível Raiz)'}`);
    });
  });

  const btnToggleColapso = document.getElementById('btn-toggle-camadas-colapso');
  if (btnToggleColapso && painelFlutuante) {
    btnToggleColapso.addEventListener('click', () => {
      painelFlutuante.alternarColapso();
      registrarLog(`[Camadas:Flutuante] Colapsado = ${painelFlutuante.colapsado}`);
    });
  }

  const btnResetStorage = document.getElementById('btn-reset-camadas-storage');
  if (btnResetStorage) {
    btnResetStorage.addEventListener('click', () => {
      painelDocked?.limparLembranca();
      painelFlutuante?.limparLembranca();
      UIToast.notificar({
        tipo: 'alerta',
        titulo: 'Lembrança Resetada',
        mensagem: 'As preferências de camadas salvas no LocalStorage foram limpas. Recarregue a página para ver o estado padrão original.'
      });
      registrarLog('[Camadas] Preferências de estado no LocalStorage limpas com sucesso.');
    });
  }

  const btnAddMockCamada = document.getElementById('btn-add-mock-camada');
  if (btnAddMockCamada && painelFlutuante) {
    btnAddMockCamada.addEventListener('click', () => {
      const id = 'camada-dinamica-' + Date.now();
      const cores = ['#ef4444', '#f97316', '#84cc16', '#06b6d4', '#8b5cf6'];
      const cor = cores[Math.floor(Math.random() * cores.length)];
      const novaCamada = { id, name: `Levantamento Drone ${painelFlutuante.camadas.length + 1}`, color: cor, visible: true };
      painelFlutuante.definirCamadas([...painelFlutuante.camadas, novaCamada], painelFlutuante.feicoes);
      registrarLog(`[Camadas:Flutuante] Adicionada via botão: ${novaCamada.name}`);
    });
  }

  // ----------------------------------------------------
  // 17. Lógica do Modelo Interativo de Cores & Espessura CAD
  // ----------------------------------------------------
  const seletorModelo = document.getElementById('demo-seletor-modelo') as UISeletorCor | null;
  const controleCores = document.getElementById('demo-controle-cores') as UIControleCores | null;
  const polyPreview = document.getElementById('svg-preview-polygon') as SVGPolygonElement | null;
  const jsonDisplay = document.getElementById('demo-cores-json');
  const btnToggleAlvoModelo = document.getElementById('btn-toggle-alvo-modelo');
  const btnOpenFill = document.getElementById('btn-demo-abrir-seletor-fill');
  const btnOpenStroke = document.getElementById('btn-demo-abrir-seletor-stroke');
  const btnInvert = document.getElementById('btn-demo-inverter-cores');

  const estadoCoresModelo = {
    preenchimento: '#00e08a',
    traco: '#3b82f6',
    opacidade: 0.65,
    espessuraTraco: 4,
    alvo: 'traco' as AlvoCor
  };

  function atualizarPreviewModelo() {
    if (polyPreview) {
      const fillVal = estadoCoresModelo.preenchimento === 'none' ? 'transparent' : estadoCoresModelo.preenchimento;
      const strokeVal = estadoCoresModelo.traco === 'none' ? 'transparent' : estadoCoresModelo.traco;
      polyPreview.setAttribute('fill', fillVal);
      polyPreview.setAttribute('fill-opacity', String(estadoCoresModelo.opacidade));
      polyPreview.setAttribute('stroke', strokeVal);
      polyPreview.setAttribute('stroke-width', String(estadoCoresModelo.espessuraTraco));
    }
    if (jsonDisplay) {
      jsonDisplay.textContent = JSON.stringify(estadoCoresModelo, null, 2);
    }
  }

  if (seletorModelo) {
    seletorModelo.configurar({
      titulo: 'Cores & Estilo CAD (Modelo)',
      alvo: 'traco',
      preenchimento: estadoCoresModelo.preenchimento,
      traco: estadoCoresModelo.traco,
      opacidade: estadoCoresModelo.opacidade,
      espessuraTraco: estadoCoresModelo.espessuraTraco,
      coresProjeto: ['#00e08a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'],
      mostrarEspessura: true,
      mostrarOpacidade: true
    });

    seletorModelo.addEventListener('ui-cor-input', (e: Event) => {
      const d = (e as CustomEvent<DetalheSeletorCor>).detail;
      if (d.preenchimento) estadoCoresModelo.preenchimento = d.preenchimento;
      if (d.traco) estadoCoresModelo.traco = d.traco;
      if (typeof d.opacidade === 'number') estadoCoresModelo.opacidade = d.opacidade;
      if (typeof d.espessuraTraco === 'number') estadoCoresModelo.espessuraTraco = d.espessuraTraco;
      if (d.alvo) estadoCoresModelo.alvo = d.alvo;
      atualizarPreviewModelo();
      controleCores?.definirCores({
        preenchimento: estadoCoresModelo.preenchimento,
        traco: estadoCoresModelo.traco,
        opacidade: estadoCoresModelo.opacidade,
        espessuraTraco: estadoCoresModelo.espessuraTraco
      });
      registrarLog(`[Seletor Modelo] Prévia alterada: alvo=${d.alvo}, espessura=${d.espessuraTraco}px, opacidade=${Math.round(d.opacidade * 100)}%`);
    });

    seletorModelo.addEventListener('ui-cor-confirmar', () => {
      registrarLog(`[Seletor Modelo] Cor e estilo confirmados!`);
      UIToast.notificar({
        tipo: 'sucesso',
        titulo: 'Estilo Confirmado',
        mensagem: `Traço: ${estadoCoresModelo.traco} (${estadoCoresModelo.espessuraTraco}px) | Preenchimento: ${estadoCoresModelo.preenchimento}`
      });
    });

    seletorModelo.addEventListener('ui-alvo-change', (e: Event) => {
      const { alvo } = (e as CustomEvent<{ alvo: AlvoCor }>).detail;
      estadoCoresModelo.alvo = alvo;
      atualizarPreviewModelo();
      registrarLog(`[Seletor Modelo] Alvo alternado para: ${alvo}`);
    });
  }

  if (controleCores) {
    controleCores.coresProjeto = ['#00e08a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];
    controleCores.atalhos = { alternar: 'X', inverter: 'Shift+X', semCor: '/', padrao: 'D' };

    controleCores.addEventListener('ui-cores-change', (e: Event) => {
      const d = (e as CustomEvent<DetalheControleCores>).detail;
      if (d.preenchimento) estadoCoresModelo.preenchimento = d.preenchimento;
      if (d.traco) estadoCoresModelo.traco = d.traco;
      if (typeof d.opacidade === 'number') estadoCoresModelo.opacidade = d.opacidade;
      if (typeof d.espessuraTraco === 'number') estadoCoresModelo.espessuraTraco = d.espessuraTraco;
      if (d.alvo) estadoCoresModelo.alvo = d.alvo;
      atualizarPreviewModelo();
      seletorModelo?.configurar({
        preenchimento: estadoCoresModelo.preenchimento,
        traco: estadoCoresModelo.traco,
        opacidade: estadoCoresModelo.opacidade,
        espessuraTraco: estadoCoresModelo.espessuraTraco,
        alvo: estadoCoresModelo.alvo
      });
      registrarLog(`[Controle Cores] Alteração recebida (${d.origem}): espessura=${d.espessuraTraco}px, confirmado=${d.confirmado}`);
    });
  }

  btnToggleAlvoModelo?.addEventListener('click', () => {
    const novoAlvo = estadoCoresModelo.alvo === 'traco' ? 'preenchimento' : 'traco';
    seletorModelo?.trocarAlvo(novoAlvo);
    controleCores?.definirAlvo(novoAlvo);
  });

  btnOpenFill?.addEventListener('click', () => {
    controleCores?.abrirSeletor('preenchimento');
  });

  btnOpenStroke?.addEventListener('click', () => {
    controleCores?.abrirSeletor('traco');
  });

  btnInvert?.addEventListener('click', () => {
    controleCores?.inverter();
  });

  atualizarPreviewModelo();

  registrarLog('Playground autônomo inicializado com Suporte Inteligente (Zero-JS, FormData e UIBus).');
});


