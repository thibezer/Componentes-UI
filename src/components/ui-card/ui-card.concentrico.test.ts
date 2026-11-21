import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import './ui-card';

const css = fs.readFileSync(path.resolve(__dirname, './ui-card.css'), 'utf-8');

describe('UICard: cantos concêntricos e escala de raio', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('ui-card');
    document.body.appendChild(el);
  });
  afterEach(() => el.remove());

  const base = () => el.shadowRoot!.querySelector('.ui-card') as HTMLElement;

  it('sem atributo `raio` não aplica modificador (vale o token de contêiner)', () => {
    expect(base().className).not.toMatch(/ui-card--raio-/);
  });

  it.each(['nenhum', 'sm', 'md', 'lg', 'xl'])('raio="%s" aplica o modificador', (raio) => {
    el.setAttribute('raio', raio);
    expect(base().classList.contains(`ui-card--raio-${raio}`)).toBe(true);
  });

  it('aceita o alias `radius` e ignora maiúsculas/espaços', () => {
    el.setAttribute('radius', ' XL ');
    expect(base().classList.contains('ui-card--raio-xl')).toBe(true);
  });

  it('valores hostis não viram classe (sem injeção por atributo)', () => {
    el.setAttribute('raio', 'lg ui-card--clicavel');
    expect(base().className).not.toMatch(/ui-card--raio-/);
    expect(base().classList.contains('ui-card--clicavel')).toBe(false);
    el.setAttribute('raio', '');
    expect(base().className).not.toMatch(/ui-card--raio-/);
  });

  it('trocar o raio remove o anterior', () => {
    el.setAttribute('raio', 'sm');
    el.setAttribute('raio', 'xl');
    expect(base().classList.contains('ui-card--raio-sm')).toBe(false);
    expect(base().classList.contains('ui-card--raio-xl')).toBe(true);
  });

  it('o CSS deriva o raio do filho: max(0, raio − folga − borda), exposto nas três seções', () => {
    expect(css).toMatch(
      /\.ui-card__header,\s*\.ui-card__body,\s*\.ui-card__footer\s*\{[^}]*--ui-card-raio-aninhado:\s*max\(0px,\s*calc\(var\(--_raio\)\s*-\s*var\(--_distancia\)\s*-\s*var\(--_borda\)\)\)/s
    );
  });

  it('o raio do card herda do card pai (aninhado) e o próprio token vence', () => {
    expect(css).toMatch(/--_raio:\s*var\(--ui-card-raio,\s*var\(--ui-card-raio-aninhado,\s*var\(--ui-raio-lg/);
    expect(css).toMatch(/border-radius:\s*var\(--_raio\)/);
  });

  it('o modo compacto reduz a folga usada na conta', () => {
    expect(css).toMatch(/\.ui-card--compacto\s*\{[^}]*--_distancia:\s*var\(--ui-card-padding,\s*12px\)/s);
  });

  it('o `raio` explícito vence o formato squircle', () => {
    expect(css).toMatch(/:host\(\[formato="squircle"\]\) \.ui-card:not\(\[class\*="ui-card--raio-"\]\)/);
  });
});

describe('UICard: tipografia (HIG)', () => {
  it('hierarquia por seção: cabeçalho semibold, corpo com entrelinha de leitura, rodapé menor e secundário', () => {
    expect(css).toMatch(/\.ui-card__header\s*\{[^}]*font-weight:\s*var\(--ui-card-peso-cabecalho,\s*var\(--ui-peso-seminegrito,\s*600\)\)/s);
    expect(css).toMatch(/\.ui-card__body\s*\{[^}]*line-height:\s*var\(--ui-altura-linha-corpo,\s*1\.5\)/s);
    expect(css).toMatch(/\.ui-card__footer\s*\{[^}]*font-size:\s*var\(--ui-card-fonte-rodape,\s*var\(--ui-tamanho-corpo-sm/s);
    expect(css).toMatch(/\.ui-card__footer\s*\{[^}]*color:\s*var\(--ui-cor-texto-secundario/s);
  });

  it('base regular (sem peso leve) e sem truncar: quebra palavras e empilha cabeçalho/rodapé', () => {
    expect(css).toMatch(/\.ui-card\s*\{[^}]*font-weight:\s*var\(--ui-peso-normal,\s*400\)/s);
    expect(css).toMatch(/\.ui-card\s*\{[^}]*overflow-wrap:\s*break-word/s);
    expect(css).toMatch(/\.ui-card__header\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(css).toMatch(/\.ui-card__footer\s*\{[^}]*flex-wrap:\s*wrap/s);
  });

  it('nenhum tamanho de fonte fixo abaixo do mínimo legível (11px)', () => {
    const tamanhos = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    expect(tamanhos.every((t) => t >= 11)).toBe(true);
  });
});
