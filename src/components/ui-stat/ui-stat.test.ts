import { describe, it, expect, beforeEach } from 'vitest';
import './ui-stat';
import { UIStat } from './ui-stat';

describe('Web Component: <ui-stat>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve registrar o elemento <ui-stat> e aliases <ui-kpi> e <ui-metrica>', () => {
    expect(customElements.get('ui-stat')).toBeDefined();
    expect(customElements.get('ui-kpi')).toBeDefined();
    expect(customElements.get('ui-metrica')).toBeDefined();
  });

  it('deve renderizar rótulo, valor e descrição corretamente', () => {
    const stat = document.createElement('ui-stat') as UIStat;
    stat.setAttribute('rotulo', 'Receita Mensal');
    stat.setAttribute('valor', 'R$ 124.500,00');
    stat.setAttribute('descricao', 'Faturamento consolidado');
    document.body.appendChild(stat);

    const rotuloEl = stat.shadowRoot?.querySelector('.ui-stat__rotulo');
    const valorEl = stat.shadowRoot?.querySelector('.ui-stat__valor');
    const descEl = stat.shadowRoot?.querySelector('.ui-stat__descricao');

    expect(rotuloEl?.textContent).toBe('Receita Mensal');
    expect(valorEl?.textContent).toBe('R$ 124.500,00');
    expect(descEl?.textContent).toBe('Faturamento consolidado');
  });

  it('deve exibir indicador de tendência positiva com seta e aria-label acessível', () => {
    const stat = document.createElement('ui-stat') as UIStat;
    stat.setAttribute('valor', '1.420');
    stat.setAttribute('variacao', '+14.5%');
    stat.setAttribute('tendencia', 'alta');
    document.body.appendChild(stat);

    const indicador = stat.shadowRoot?.querySelector('.ui-stat__indicador') as HTMLElement;
    const seta = stat.shadowRoot?.querySelector('.ui-stat__seta');
    const variacao = stat.shadowRoot?.querySelector('.ui-stat__variacao');

    expect(indicador.style.display).toBe('inline-flex');
    expect(indicador.classList.contains('ui-stat__indicador--positivo')).toBe(true);
    expect(seta?.textContent).toBe('↑');
    expect(variacao?.textContent).toBe('+14.5%');
    expect(indicador.getAttribute('aria-label')).toBe('Aumento de +14.5%');
  });

  it('deve exibir indicador de tendência negativa com seta e aria-label acessível', () => {
    const stat = document.createElement('ui-stat') as UIStat;
    stat.setAttribute('valor', '32');
    stat.setAttribute('variacao', '-3.2%');
    stat.setAttribute('tendencia', 'baixa');
    document.body.appendChild(stat);

    const indicador = stat.shadowRoot?.querySelector('.ui-stat__indicador') as HTMLElement;
    const seta = stat.shadowRoot?.querySelector('.ui-stat__seta');

    expect(indicador.classList.contains('ui-stat__indicador--negativo')).toBe(true);
    expect(seta?.textContent).toBe('↓');
    expect(indicador.getAttribute('aria-label')).toBe('Queda de -3.2%');
  });
});
