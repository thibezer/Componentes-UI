import { describe, it, expect } from 'vitest';
import { higienizarSvg } from './svg-seguro';

describe('higienizarSvg', () => {
  it('mantém formas e atributos de apresentação', () => {
    const svg = higienizarSvg('<svg viewBox="0 0 24 24" fill="none"><path d="M0 0L5 5" stroke="currentColor"/><use href="#icone"/></svg>');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.querySelector('path')?.getAttribute('stroke')).toBe('currentColor');
    expect(svg?.querySelector('use')?.getAttribute('href')).toBe('#icone');
  });

  it('remove eventos, links perigosos e elementos fora da lista de permissão', () => {
    const svg = higienizarSvg(
      '<svg onload="x()"><a href="javascript:x()"><rect/></a><foreignObject><div>x</div></foreignObject>' +
      '<set attributeName="href" to="javascript:x()"/><use href="https://x.test/s.svg#a"/>' +
      '<rect style="fill:url(https://x.test/p)" fill="url(#grad)"/><image href="data:image/svg+xml,x"/></svg>'
    )!;
    expect(svg.hasAttribute('onload')).toBe(false);
    expect(svg.querySelector('a, foreignObject, set, image')).toBeNull();
    expect(svg.querySelector('use')?.hasAttribute('href')).toBe(false);
    const rect = svg.querySelector('rect')!;
    expect(rect.hasAttribute('style')).toBe(false);
    expect(rect.getAttribute('fill')).toBe('url(#grad)');
  });

  it('retorna null sem <svg>', () => {
    expect(higienizarSvg('<div>x</div>')).toBeNull();
    expect(higienizarSvg('')).toBeNull();
  });
});
