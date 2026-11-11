import { describe, it, expect, afterEach } from 'vitest';
import {
  ATRIBUTOS_DEGRADE,
  PRESETS_DEGRADE,
  ehAtributoDegrade,
  gradienteSeguro,
  resolverDegrade,
  aplicarDegradeNoElemento
} from './degrade';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('core/degrade (Camada L1)', () => {
  it('reconhece todos os aliases de atributo de degradê', () => {
    for (const attr of ATRIBUTOS_DEGRADE) {
      expect(ehAtributoDegrade(attr)).toBe(true);
      expect(ehAtributoDegrade(attr.toUpperCase())).toBe(true);
    }
    expect(ehAtributoDegrade('variante')).toBe(false);
  });

  it('aceita gradientes CSS válidos, em camadas e com variáveis de tema', () => {
    const validos = [
      'linear-gradient(135deg, #00e08a, #00b4d8)',
      'radial-gradient(circle at top left, rgba(0, 224, 138, 0.2), transparent 70%)',
      'conic-gradient(from 90deg, #ff6b6b, #ffd166, #06d6a0)',
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 10px, transparent 10px 20px)',
      'linear-gradient(135deg, color-mix(in srgb, var(--ui-cor-primaria) 20%, transparent), transparent)',
      'linear-gradient(180deg, rgba(255,255,255,0.06), transparent), linear-gradient(135deg, #111, #222)',
      'var(--meu-degrade-tema)',
      'var(--meu-degrade-tema, linear-gradient(90deg, #111, #333))'
    ];

    for (const css of validos) {
      expect(gradienteSeguro(css)).toBe(css);
    }
  });

  it('rejeita entradas hostis, XSS, injeção de CSS e parênteses quebrados', () => {
    const hostis = [
      '',
      '   ',
      'javascript:alert(1)',
      'url(https://evil.example/a.png)',
      'linear-gradient(red, url(https://evil.example/a.png))',
      'linear-gradient(red, blue); background: red',
      'linear-gradient(red, blue) } body { display: none',
      'linear-gradient(red, expression(alert(1)))',
      'linear-gradient(<script>alert(1)</script>)',
      'linear-gradient(red, "blue")',
      'linear-gradient(red, blue',
      'var(nao-e-custom)',
      'image-set(url(a.png) 1x)',
      '#ff0000',
      'linear-gradient(' + 'a'.repeat(600) + ')'
    ];

    for (const entrada of hostis) {
      expect(gradienteSeguro(entrada)).toBeNull();
    }
  });

  it('resolve modos booleano, desativado, presets semânticos e customizados', () => {
    expect(resolverDegrade(null)).toEqual({ ativo: false, explicito: null });
    expect(resolverDegrade(undefined)).toEqual({ ativo: false, explicito: null });

    for (const off of ['false', '0', 'off', 'none', 'nao', 'não', 'no']) {
      expect(resolverDegrade(off)).toEqual({ ativo: false, explicito: null });
    }

    for (const on of ['', 'true', '1', 'sim', 'yes']) {
      expect(resolverDegrade(on)).toEqual({ ativo: true, explicito: null });
      expect(resolverDegrade(on, PRESETS_DEGRADE.primario)).toEqual({
        ativo: true,
        explicito: PRESETS_DEGRADE.primario
      });
    }

    expect(resolverDegrade('primario')).toEqual({
      ativo: true,
      explicito: 'var(--ui-gradiente-primario)'
    });
    expect(resolverDegrade('destaque')).toEqual({
      ativo: true,
      explicito: 'var(--ui-gradiente-destaque)'
    });
    expect(resolverDegrade('linear-gradient(90deg, #111, #333)')).toEqual({
      ativo: true,
      explicito: 'linear-gradient(90deg, #111, #333)'
    });
    expect(resolverDegrade('javascript:alert(1)')).toEqual({
      ativo: false,
      explicito: null
    });
  });

  it('aplica e limpa --ui-degrade-interno e data-degrade no elemento alvo de forma idempotente', () => {
    const host = document.createElement('div');
    const alvo = document.createElement('div');

    expect(aplicarDegradeNoElemento(host, alvo)).toBe(false);
    expect(alvo.getAttribute('data-degrade')).toBeNull();

    host.setAttribute('degrade', '');
    expect(aplicarDegradeNoElemento(host, alvo)).toBe(true);
    expect(alvo.getAttribute('data-degrade')).toBe('ativo');
    expect(alvo.style.getPropertyValue('--ui-degrade-interno')).toBe('');

    host.setAttribute('degrade', 'linear-gradient(90deg, #00e08a, #00b4d8)');
    expect(aplicarDegradeNoElemento(host, alvo)).toBe(true);
    expect(alvo.style.getPropertyValue('--ui-degrade-interno')).toBe(
      'linear-gradient(90deg, #00e08a, #00b4d8)'
    );

    host.setAttribute('degrade', 'false');
    expect(aplicarDegradeNoElemento(host, alvo)).toBe(false);
    expect(alvo.style.getPropertyValue('--ui-degrade-interno')).toBe('');
    expect(alvo.getAttribute('data-degrade')).toBeNull();

    host.removeAttribute('degrade');
    host.classList.add('degrade');
    expect(aplicarDegradeNoElemento(host, alvo)).toBe(true);
    expect(alvo.getAttribute('data-degrade')).toBe('ativo');
  });
});
