import './src/index';
import { UIToast } from './src/index';
import type { UIListaFlutuante } from './src/components/ui-lista-flutuante';
import type { UIModal } from './src/components/ui-modal';

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

  if (btnToastAlerta) {
    btnToastAlerta.addEventListener('ui-click', () => {
      UIToast.notificar({
        tipo: 'alerta',
        titulo: 'Atenção aos Tokens',
        mensagem: 'Sua sessão expira em 5 minutos. Salve seu trabalho.',
        duracao: 4000
      });
      registrarLog('UIToast.notificar() -> Disparado Toast de ALERTA 🟠');
    });
  }

  registrarLog('Playground autônomo com Nível 3 (Modal/Bottom Sheet, Alertas & Toasts) inicializado.');
});
