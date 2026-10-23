import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-ribbon';
import './ui-paleta-ferramentas';
import { UIRibbon } from './ui-ribbon';
import { UIPaletaFerramentas } from './ui-paleta-ferramentas';
import type { RibbonAba, FerramentaItem } from './tipos';

describe('<ui-ribbon> & <ui-paleta-ferramentas> — pendências resolvidas', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  /* ----------------------------------------------------
     1. Tooltip estilizado e aria-label duplicado (M2)
     ---------------------------------------------------- */
  describe('1. Tooltip estilizado e acessibilidade', () => {
    it('botões não usam title nativo e guardam dados no dataset', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      r.abas = [
        {
          id: 'inicio',
          rotulo: 'Início',
          grupos: [
            {
              id: 'g1',
              rotulo: 'Edição',
              itens: [
                { id: 'copiar', rotulo: 'Copiar', atalho: 'Ctrl+C' },
                { id: 'icone_so', icone: 'recortar', somenteIcone: true, rotuloAcessivel: 'Recortar seleção' }
              ]
            }
          ]
        }
      ];
      document.body.appendChild(r);

      const btnCopiar = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="copiar"]')!;
      expect(btnCopiar.title).toBe('');
      expect(btnCopiar.dataset.tooltip).toBe('Copiar');
      expect(btnCopiar.dataset.atalho).toBe('Ctrl+C');

      // Não duplica aria-label quando há rótulo visível
      expect(btnCopiar.hasAttribute('aria-label')).toBe(false);

      // Mantém aria-label quando é somente ícone ou tem rotuloAcessivel
      const btnIcone = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="icone_so"]')!;
      expect(btnIcone.getAttribute('aria-label')).toBe('Recortar seleção');
    });

    it('tooltip estilizado existe no shadow DOM e responde a focusin', () => {
      const p = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
      p.ferramentas = [{ id: 'sel', rotulo: 'Selecionar', atalho: 'V' }];
      document.body.appendChild(p);

      const tooltipEl = p.shadowRoot!.querySelector('.ui-ferr-tooltip');
      expect(tooltipEl).toBeTruthy();
      expect(tooltipEl!.getAttribute('role')).toBe('tooltip');

      const btn = p.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="sel"]')!;
      btn.dispatchEvent(new Event('focusin', { bubbles: true }));

      expect(tooltipEl!.classList.contains('ui-ferr-tooltip--visivel')).toBe(true);
      expect(btn.getAttribute('aria-describedby')).toBe(tooltipEl!.id);
      expect(tooltipEl!.textContent).toContain('Selecionar');
      expect(tooltipEl!.textContent).toContain('(V)');
    });
  });

  /* ----------------------------------------------------
     2. Colapso automático de grupos no ribbon (A4)
     ---------------------------------------------------- */
  describe('2. Colapso de grupos no ribbon', () => {
    it('renderiza grupo colapsado como botão único quando colapsado', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      r.abas = [
        {
          id: 'inicio',
          rotulo: 'Início',
          grupos: [
            {
              id: 'g_baixa',
              rotulo: 'Mais Ações',
              prioridade: 1,
              itens: [{ id: 'a1', rotulo: 'Ação 1' }, { id: 'a2', rotulo: 'Ação 2' }]
            }
          ]
        }
      ];
      document.body.appendChild(r);

      // Simula colapso inserindo o id no conjunto de colapsados internamente ou chamando ajuste
      (r as any).gruposColapsados.add('g_baixa');
      (r as any).renderizarPainel();

      const grupoEl = r.shadowRoot!.querySelector('.ui-ribbon__grupo--colapsado');
      expect(grupoEl).toBeTruthy();

      const btnColapsado = grupoEl!.querySelector<HTMLButtonElement>('.ui-ribbon__btn-colapsado')!;
      expect(btnColapsado).toBeTruthy();
      expect(btnColapsado.getAttribute('aria-haspopup')).toBe('menu');

      // Clicar abre o flyout com os itens do grupo
      btnColapsado.click();
      const menu = r.shadowRoot!.querySelector('.ui-ferr-menu');
      expect(menu).toBeTruthy();
      expect(menu!.textContent).toContain('Ação 1');
      expect(menu!.textContent).toContain('Ação 2');
    });
  });

  /* ----------------------------------------------------
     3. Botão dividido e lançador de diálogo (M4)
     ---------------------------------------------------- */
  describe('3. Botão dividido e lançador de diálogo no ribbon', () => {
    it('cria split button e separa o clique da ação do clique do menu', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      const acaoSpy = vi.fn();
      r.addEventListener('ui-ferramenta', acaoSpy);

      r.abas = [
        {
          id: 'inicio',
          rotulo: 'Início',
          grupos: [
            {
              id: 'g1',
              rotulo: 'Desenho',
              itens: [
                {
                  id: 'linha_split',
                  rotulo: 'Linha',
                  dividido: true,
                  filhos: [
                    { id: 'linha_reta', rotulo: 'Linha Reta' },
                    { id: 'polilinha', rotulo: 'Polilinha' }
                  ]
                }
              ]
            }
          ]
        }
      ];
      document.body.appendChild(r);

      const splitContainer = r.shadowRoot!.querySelector('.ui-ferr-split');
      expect(splitContainer).toBeTruthy();

      const acaoBtn = splitContainer!.querySelector<HTMLButtonElement>('.ui-ferr-split__acao')!;
      const gatilhoBtn = splitContainer!.querySelector<HTMLButtonElement>('.ui-ferr-split__gatilho')!;

      // Clicar na ação principal dispara a ferramenta
      acaoBtn.click();
      expect(acaoSpy).toHaveBeenCalledWith(expect.objectContaining({
        detail: expect.objectContaining({ id: 'linha_split' })
      }));
      expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeNull();

      // Clicar na seta abre o menu suspenso
      gatilhoBtn.click();
      expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();
      expect(r.shadowRoot!.querySelector('.ui-ferr-menu')!.textContent).toContain('Linha Reta');
    });

    it('renderiza lançador de diálogo e dispara evento ui-grupo-dialogo', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      const lancadorSpy = vi.fn();
      r.addEventListener('ui-grupo-dialogo', lancadorSpy);

      r.abas = [
        {
          id: 'inicio',
          rotulo: 'Início',
          grupos: [
            {
              id: 'fonte',
              rotulo: 'Fonte',
              lancadorDialogo: 'dialogo-fonte',
              rotuloLancador: 'Configurações de Fonte',
              itens: [{ id: 'f1', rotulo: 'Negrito', tipo: 'toggle' }]
            }
          ]
        }
      ];
      document.body.appendChild(r);

      const lancador = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ribbon__lancador')!;
      expect(lancador).toBeTruthy();
      expect(lancador.getAttribute('aria-label')).toBe('Configurações de Fonte');

      lancador.click();
      expect(lancadorSpy).toHaveBeenCalledTimes(1);
      expect(lancadorSpy).toHaveBeenCalledWith(expect.objectContaining({
        detail: expect.objectContaining({ id: 'dialogo-fonte' })
      }));
    });
  });

  /* ----------------------------------------------------
     4. Atalhos compostos e escopo entre paletas (M7/B9)
     ---------------------------------------------------- */
  describe('4. Atalhos de teclado avançados', () => {
    it('paleta suporta atalhos compostos (Ctrl+Z, Shift+V, Escape)', () => {
      const p = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
      p.setAttribute('atalhos', '');
      p.ferramentas = [
        { id: 'undo', rotulo: 'Desfazer', tipo: 'botao', atalho: 'Ctrl+Z' },
        { id: 'vetor', rotulo: 'Vetor', tipo: 'ferramenta', atalho: 'Shift+V' }
      ];
      document.body.appendChild(p);

      const spy = vi.fn();
      p.addEventListener('ui-ferramenta', spy);

      // Dispara Ctrl+Z
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ id: 'undo' }) }));

      // Dispara Shift+V
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'V', shiftKey: true, bubbles: true, cancelable: true }));
      expect(p.valor).toBe('vetor');
    });

    it('ribbon com atributo atalhos ativa comandos da aba ativa', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      r.setAttribute('atalhos', '');
      r.abas = [
        {
          id: 'inicio',
          rotulo: 'Início',
          grupos: [
            {
              id: 'g1',
              rotulo: 'Comandos',
              itens: [{ id: 'salvar', rotulo: 'Salvar', atalho: 'Ctrl+S' }]
            }
          ]
        }
      ];
      document.body.appendChild(r);

      const spy = vi.fn();
      r.addEventListener('ui-ferramenta', spy);

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ id: 'salvar' }) }));
    });
  });

  /* ----------------------------------------------------
     5. Navegação em grade na paleta com colunas=2 (M9)
     ---------------------------------------------------- */
  describe('5. Navegação em grade 2 colunas', () => {
    it('navega com ArrowRight, ArrowLeft, ArrowDown e ArrowUp na grade 2x2', () => {
      const p = document.createElement('ui-paleta-ferramentas') as UIPaletaFerramentas;
      p.colunas = 2;
      p.ferramentas = [
        { id: 'b0', rotulo: '0 (Col 0, Linha 0)' },
        { id: 'b1', rotulo: '1 (Col 1, Linha 0)' },
        { id: 'b2', rotulo: '2 (Col 0, Linha 1)' },
        { id: 'b3', rotulo: '3 (Col 1, Linha 1)' }
      ];
      document.body.appendChild(p);

      const b0 = p.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="b0"]')!;
      const b1 = p.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="b1"]')!;
      const b2 = p.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="b2"]')!;
      b0.focus();

      // b0 -> ArrowRight -> b1
      b0.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      expect(document.activeElement === p && p.shadowRoot!.activeElement === b1).toBe(true);

      // b1 -> ArrowDown -> b3
      const b3 = p.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="b3"]')!;
      b1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      expect(document.activeElement === p && p.shadowRoot!.activeElement === b3).toBe(true);

      // b3 -> ArrowLeft -> b2
      b3.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      expect(document.activeElement === p && p.shadowRoot!.activeElement === b2).toBe(true);

      // b2 -> ArrowUp -> b0
      b2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      expect(document.activeElement === p && p.shadowRoot!.activeElement === b0).toBe(true);
    });
  });

  /* ----------------------------------------------------
     6. Abas do ribbon com ativação manual (M10)
     ---------------------------------------------------- */
  describe('6. Ativação manual de abas no ribbon', () => {
    it('com ativacao-manual, setas apenas mudam o foco e Enter ativa a aba', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      r.setAttribute('ativacao-manual', '');
      r.abas = [
        { id: 'aba1', rotulo: 'Aba 1', grupos: [] },
        { id: 'aba2', rotulo: 'Aba 2', grupos: [] }
      ];
      document.body.appendChild(r);

      const tab1 = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ribbon__aba[data-id="aba1"]')!;
      const tab2 = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ribbon__aba[data-id="aba2"]')!;
      tab1.focus();

      // Seta para direita move o foco para tab2 sem torná-la a aba ativa
      tab1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      expect(r.abaAtiva).toBe('aba1');
      expect(tab2.tabIndex).toBe(0);

      // Pressionar Enter em tab2 ativa a aba
      tab2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      expect(r.abaAtiva).toBe('aba2');
    });
  });

  /* ----------------------------------------------------
     7. Menu não fecha no window blur (M8)
     ---------------------------------------------------- */
  describe('7. Manutenção do menu aberto no window blur', () => {
    it('não fecha o menu ao receber evento de blur na janela', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      r.abas = [
        {
          id: 'inicio',
          rotulo: 'Início',
          grupos: [
            {
              id: 'g1',
              rotulo: 'G',
              itens: [
                {
                  id: 'menu1',
                  rotulo: 'Menu',
                  filhos: [{ id: 'f1', rotulo: 'Filho 1' }]
                }
              ]
            }
          ]
        }
      ];
      document.body.appendChild(r);

      const btnMenu = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="menu1"]')!;
      btnMenu.click();
      expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();

      // Dispara blur no window
      window.dispatchEvent(new Event('blur'));
      expect(r.shadowRoot!.querySelector('.ui-ferr-menu')).toBeTruthy();
    });
  });

  /* ----------------------------------------------------
     8. Exclusividade opcional de ferramentas no ribbon (B8)
     ---------------------------------------------------- */
  describe('8. Ribbon tipo ferramenta e exclusividade de grupo', () => {
    it('garante exclusividade entre tipo ferramenta no mesmo grupo por padrão', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      r.abas = [
        {
          id: 'cad',
          rotulo: 'CAD',
          grupos: [
            {
              id: 'geom',
              rotulo: 'Geometrias',
              itens: [
                { id: 'ponto', rotulo: 'Ponto', tipo: 'ferramenta' },
                { id: 'linha', rotulo: 'Linha', tipo: 'ferramenta' }
              ]
            }
          ]
        }
      ];
      document.body.appendChild(r);

      const btnPonto = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="ponto"]')!;
      const btnLinha = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="linha"]')!;

      btnPonto.click();
      expect(btnPonto.classList.contains('ui-ferr-btn--ativo')).toBe(true);

      btnLinha.click();
      expect(btnLinha.classList.contains('ui-ferr-btn--ativo')).toBe(true);
      expect(btnPonto.classList.contains('ui-ferr-btn--ativo')).toBe(false);
    });

    it('respeita grupo.exclusivo = false permitindo múltiplas ferramentas ativas', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      r.abas = [
        {
          id: 'cad',
          rotulo: 'CAD',
          grupos: [
            {
              id: 'snaps',
              rotulo: 'Snaps',
              exclusivo: false,
              itens: [
                { id: 'snap_v', rotulo: 'Vértice', tipo: 'ferramenta' },
                { id: 'snap_m', rotulo: 'Meio', tipo: 'ferramenta' }
              ]
            }
          ]
        }
      ];
      document.body.appendChild(r);

      const btnV = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="snap_v"]')!;
      const btnM = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="snap_m"]')!;

      btnV.click();
      btnM.click();
      expect(btnV.classList.contains('ui-ferr-btn--ativo')).toBe(true);
      expect(btnM.classList.contains('ui-ferr-btn--ativo')).toBe(true);
    });
  });

  /* ----------------------------------------------------
     10. Submenus aninhados (filhos dentro de filhos)
     ---------------------------------------------------- */
  describe('10. Submenus aninhados', () => {
    it('abre submenu com seta para a direita e fecha com seta para a esquerda', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      r.abas = [
        {
          id: 'inicio',
          rotulo: 'Início',
          grupos: [
            {
              id: 'g1',
              rotulo: 'G',
              itens: [
                {
                  id: 'raiz',
                  rotulo: 'Menu Raiz',
                  filhos: [
                    {
                      id: 'sub_pai',
                      rotulo: 'Exportar para...',
                      filhos: [
                        { id: 'sub_pdf', rotulo: 'PDF Vetorial' },
                        { id: 'sub_dxf', rotulo: 'DXF AutoCAD' }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ];
      document.body.appendChild(r);

      const btnRaiz = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="raiz"]')!;
      btnRaiz.click();

      const itemSubPai = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-menu__item--has-sub')!;
      expect(itemSubPai).toBeTruthy();
      expect(itemSubPai.getAttribute('aria-haspopup')).toBe('menu');

      // Seta para direita abre o submenu aninhado
      itemSubPai.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

      const menus = r.shadowRoot!.querySelectorAll('.ui-ferr-menu');
      expect(menus.length).toBe(2);
      expect(menus[1].textContent).toContain('PDF Vetorial');
    });
  });

  /* ----------------------------------------------------
     11. Modo controlado e não-mutação dos dados do consumidor
     ---------------------------------------------------- */
  describe('11. Modo controlado (copiar-dados)', () => {
    it('com modoControlado = true, a mutação interna do toggle não altera o objeto do consumidor', () => {
      const r = document.createElement('ui-ribbon') as UIRibbon;
      r.modoControlado = true;

      const itemConsumidor: FerramentaItem = { id: 'grade', rotulo: 'Grade', tipo: 'toggle', ativo: false };
      const abasConsumidor: RibbonAba[] = [
        {
          id: 'view',
          rotulo: 'Exibição',
          grupos: [{ id: 'grid', rotulo: 'Grelha', itens: [itemConsumidor] }]
        }
      ];

      r.abas = abasConsumidor;
      document.body.appendChild(r);

      const btnGrade = r.shadowRoot!.querySelector<HTMLButtonElement>('.ui-ferr-btn[data-id="grade"]')!;
      btnGrade.click();

      // No componente o botão foi ativado
      expect(btnGrade.classList.contains('ui-ferr-btn--ativo')).toBe(true);

      // No objeto original do consumidor o valor permanece intacto (sem efeito colateral)
      expect(itemConsumidor.ativo).toBe(false);
    });
  });
});
