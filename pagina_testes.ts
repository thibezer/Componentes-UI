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
    setTimeout(() => {
      canvasCad.pontos = dadosPontosGeodesicos;
      canvasCad.segmentos = dadosSegmentosGeodesicos;
      canvasCad.confrontantes = dadosConfrontantesGeodesicos;
      canvasCad.fitBounds(dadosPontosGeodesicos);
      registrarLog('<ui-canvas-cad> -> Carregado com 7 vértices geodésicos (M-01 Base PPP, B-01 Base Campo, P-01..P-05 Rovers), 5 divisas e confrontante WKT.');
    }, 400);

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

  registrarLog('Playground autônomo inicializado com Suporte Inteligente (Zero-JS, FormData e UIBus).');
});


