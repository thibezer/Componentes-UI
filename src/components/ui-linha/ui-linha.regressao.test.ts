import { describe, it, expect, beforeEach } from 'vitest';
import './ui-linha';
import { UILinha } from './ui-linha';
import fs from 'node:fs';
import path from 'node:path';

const estilos = fs.readFileSync(path.resolve(__dirname, './ui-linha.css'), 'utf-8');

describe('<ui-linha> - robustez', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('valores hostis em tamanho/altura não escrevem CSS nem lançam', () => {
    const linha = document.createElement('ui-linha') as UILinha;
    document.body.appendChild(linha);
    for (const v of ['', 'enorme', '<script>', '1;color:red', 'calc(1px)', 'NaN', '-3', 'Infinity']) {
      expect(() => {
        linha.setAttribute('tamanho', v);
        linha.setAttribute('altura', v);
      }).not.toThrow();
      expect(linha.style.getPropertyValue('--ui-campo-altura')).toBe('');
    }
  });

  it('muitos filhos e alternâncias rápidas de atributos não quebram', () => {
    const linha = document.createElement('ui-linha') as UILinha;
    for (let i = 0; i < 2000; i++) linha.appendChild(document.createElement('span'));
    document.body.appendChild(linha);
    for (let i = 0; i < 200; i++) linha.setAttribute('tamanho', i % 2 ? 'sm' : 'lg');
    expect(linha.style.getPropertyValue('--ui-campo-altura')).toBe('var(--ui-altura-sm, 26px)'); // último i (199) é ímpar
    expect(linha.children.length).toBe(2000);
  });

  it('não adiciona listeners: desconectar e mexer depois não lança', () => {
    const linha = document.createElement('ui-linha') as UILinha;
    document.body.appendChild(linha);
    linha.remove();
    expect(() => linha.setAttribute('tamanho', 'sm')).not.toThrow();
  });

  it('o CSS declara o contrato de linha (alinhar, espaço, quebra, filhos sem 100%)', () => {
    expect(estilos).toMatch(/:host\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(estilos).toMatch(/align-items:\s*center/);
    expect(estilos).toContain(':host([sem-quebra])');
    expect(estilos).toMatch(/::slotted\(\*\)\s*\{[^}]*width:\s*auto/);
    expect(estilos).toContain('::slotted([expandir])');
    for (const a of ['inicio', 'centro', 'fim', 'esticar']) expect(estilos).toContain(`:host([alinhar='${a}'])`);
    for (const e of ['nenhum', 'xs', 'sm', 'md', 'lg']) expect(estilos).toContain(`:host([espaco='${e}'])`);
  });

  it('o CSS não usa cores fixas', () => {
    expect(estilos).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
