import { describe, it, expect, vi } from 'vitest';
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

  it('prefixa ids em defs e reescreve url(#) e href', () => {
    const svg = higienizarSvg(`
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id="grad1">
            <stop offset="0%" stop-color="red" />
          </linearGradient>
          <clipPath id="clip1">
            <rect width="50" height="50" />
          </clipPath>
        </defs>
        <path fill="url(#grad1)" clip-path="url(#clip1)" />
        <use href="#grad1" />
      </svg>
    `)!;

    const grad = svg.querySelector('linearGradient')!;
    const novoIdGrad = grad.getAttribute('id')!;
    expect(novoIdGrad).toMatch(/^ui-svg-\d+-grad1$/);

    const clip = svg.querySelector('clipPath')!;
    const novoIdClip = clip.getAttribute('id')!;
    expect(novoIdClip).toMatch(/^ui-svg-\d+-clip1$/);

    const path = svg.querySelector('path')!;
    expect(path.getAttribute('fill')).toBe(`url(#${novoIdGrad})`);
    expect(path.getAttribute('clip-path')).toBe(`url(#${novoIdClip})`);

    const use = svg.querySelector('use')!;
    expect(use.getAttribute('href')).toBe(`#${novoIdGrad}`);
  });

  it('avisa no console quando elementos forem descartados pela allowlist ou svg inválido', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    higienizarSvg('<svg><script>alert(1)</script></svg>');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/\[svg-seguro\] Elemento <script> não permitido/i));

    higienizarSvg('<svg><foreignObject><div>x</div></foreignObject></svg>');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/\[svg-seguro\] Elemento <foreignObject> não permitido/i));

    higienizarSvg('<div>sem svg</div>');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[svg-seguro] Código descartado'));
    warnSpy.mockRestore();
  });
});
