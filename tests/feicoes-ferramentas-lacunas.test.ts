import { describe, it, expect, afterEach, vi } from 'vitest';
import L from 'leaflet';
import '../src/components/ui-canvas-cad';
import type { UICanvasCAD } from '../src/components/ui-canvas-cad';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import { SessaoDesenho, RAIO_MINIMO_CIRCULO_M } from '../src/gerencigeo-canvas/feature_desenho';
import type { ControleDesenho } from '../src/gerencigeo-canvas/feature_desenho_controle';
import type { LatLonPar } from '../src/gerencigeo-canvas/feature_types';

afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); });

function novo(prevenir = false) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  /** O que `ferramentaAtiva` valia no instante em que cada evento saiu. */
  const ferramentaNoEvento: Array<[string, string | null]> = [];
  const ouvintes = new Map<string, Array<(d: any) => void>>();
  const g: GerenciadorFeicoes = new GerenciadorFeicoes({
    obterLayerManager: () => lm, obterMapa: () => map,
    emitir: (e, d, cancelavel) => {
      eventos.push([e, d]);
      ferramentaNoEvento.push([e, g.ferramentaAtiva]);
      for (const f of ouvintes.get(e) ?? []) f(d);
      return cancelavel ? prevenir : undefined;
    }
  });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  const ouvir = (nome: string, f: (d: any) => void) => { ouvintes.set(nome, [...(ouvintes.get(nome) ?? []), f]); };
  const desenho = () => (g as unknown as { desenho: ControleDesenho }).desenho;
  const tecla = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  const clicarNoMapa = (c: LatLonPar) => map.fire('click', { latlng: L.latLng(c[0], c[1]), containerPoint: map.latLngToContainerPoint(c) });
  return { g, lm, map, el, eventos, ev, ouvir, desenho, tecla, ferramentaNoEvento, clicarNoMapa };
}

const A: LatLonPar = [-23.5, -46.6];
const B: LatLonPar = [-23.5, -46.59];
const C: LatLonPar = [-23.51, -46.59];
const D: LatLonPar = [-23.51, -46.6];
const quad = (id: string) => ({ id, geometria: { tipo: 'Polygon', aneis: [[[-23.499, -46.601], [-23.499, -46.589], [-23.511, -46.589], [-23.511, -46.601]]] } });

describe('medir-distancia com 3+ pontos', () => {
  it('com 2 pontos só há distância; com 3+ vêm área e perímetro, sem criar feição', () => {
    const { g, ev, desenho, tecla } = novo();
    g.ativarFerramenta('medir-distancia');
    desenho().clicarEm(A);
    desenho().clicarEm(B);
    tecla('Enter');
    const dois = ev('cad-medicao')[0];
    expect(dois.areaM2).toBeUndefined();
    expect(dois.perimetroM).toBeUndefined();

    for (const p of [A, B, C]) desenho().clicarEm(p);
    tecla('Enter');
    const tres = ev('cad-medicao')[1];
    expect(tres.tipo).toBe('distancia');
    expect(tres.comprimentoM).toBeGreaterThan(1900);
    expect(tres.areaM2).toBeGreaterThan(500_000); // triângulo de ~1,1 km x 1,0 km (≈ 0,57 km²)
    expect(tres.perimetroM).toBeGreaterThan(tres.comprimentoM); // inclui o lado que fecha
    expect(g.obterFeicoes('r')).toHaveLength(0);
  });

  it('o HUD mostra área e perímetro assim que há 3 pontos', () => {
    const { g, desenho } = novo();
    g.ativarFerramenta('medir-distancia');
    const hud = () => document.getElementById('cm-draw-hud')!.querySelector('[data-campo="medida"]')!.textContent ?? '';
    desenho().clicarEm(A);
    desenho().clicarEm(B);
    expect(hud()).toContain('Extensão');
    expect(hud()).not.toContain('Área');
    desenho().clicarEm(C);
    expect(hud()).toContain('Extensão');
    expect(hud()).toContain('Área');
    expect(hud()).toContain('Perímetro');
  });

  it('medir-area continua como estava', () => {
    const { g, ev, desenho, tecla } = novo();
    g.ativarFerramenta('medir-area');
    for (const p of [A, B, C, D]) desenho().clicarEm(p);
    tecla('Enter');
    const m = ev('cad-medicao')[0];
    expect(m.tipo).toBe('area');
    expect(m.areaM2).toBeGreaterThan(0);
    expect(m.perimetroM).toBeGreaterThan(0);
  });
});

describe('círculo: raio mínimo', () => {
  const metros = (m: number): LatLonPar => [A[0] + m / 111_320, A[1]];

  it('a sessão ignora o clique abaixo de 2 m e aceita a partir daí', () => {
    expect(RAIO_MINIMO_CIRCULO_M).toBe(2);
    const s = new SessaoDesenho('circulo');
    s.clicar(A);
    expect(s.clicar(A).concluida).toBeUndefined();
    expect(s.clicar(metros(1.5)).concluida).toBeUndefined();
    expect(s.nos).toBe(1); // continua esperando o clique do raio
    const ok = s.clicar(metros(2.5)).concluida;
    expect(ok).toMatchObject({ tipo: 'Circle' });
    expect((ok as { raioMetros: number }).raioMetros).toBeGreaterThanOrEqual(2);
  });

  it('a prévia também só aparece a partir de 2 m', () => {
    const s = new SessaoDesenho('circulo');
    s.clicar(A);
    s.mover(metros(1));
    expect(s.previa()).toBeNull();
    s.mover(metros(5));
    expect(s.previa()).toMatchObject({ tipo: 'Circle' });
  });

  it('pela ferramenta: clique a 1 m não cria; a 10 m cria', () => {
    const { g, ev, desenho } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('circulo');
    desenho().clicarEm(A);
    desenho().clicarEm(metros(1));
    expect(g.obterFeicoes('r')).toHaveLength(0);
    expect(ev('cad-desenho-recusado')).toEqual([]);
    desenho().clicarEm(metros(10));
    expect(g.obterFeicoes('r')).toHaveLength(1);
  });

  it('dados de entrada continuam aceitando qualquer raio positivo', () => {
    const { g } = novo();
    expect(g.definirFeicoes('c', [{ id: 'c1', geometria: { tipo: 'Circle', centro: A, raioMetros: 0.5 } }]).aceitas).toBe(1);
  });
});

describe('auditoria de ordem de eventos: toda ferramenta pode ser desativada por quem escuta a conclusão', () => {
  interface Caso {
    nome: string;
    /** Evento de conclusão em que o ouvinte desativa a ferramenta. */
    evento: string;
    preparar?: (t: ReturnType<typeof novo>) => void;
    concluir: (t: ReturnType<typeof novo>) => void;
    cria?: boolean;
  }

  const clicks = (t: ReturnType<typeof novo>, ...ps: LatLonPar[]) => { for (const p of ps) t.desenho().clicarEm(p); };

  const casos: Caso[] = [
    { nome: 'ponto', evento: 'cad-feicao-criada', cria: true, concluir: (t) => clicks(t, A) },
    { nome: 'linha', evento: 'cad-feicao-criada', cria: true, concluir: (t) => { clicks(t, A, B); t.tecla('Enter'); } },
    { nome: 'poligono', evento: 'cad-feicao-criada', cria: true, concluir: (t) => { clicks(t, A, B, C); t.tecla('Enter'); } },
    { nome: 'retangulo', evento: 'cad-feicao-criada', cria: true, concluir: (t) => clicks(t, A, C) },
    { nome: 'elipse', evento: 'cad-feicao-criada', cria: true, concluir: (t) => clicks(t, A, C) },
    { nome: 'poligono-regular', evento: 'cad-feicao-criada', cria: true, concluir: (t) => clicks(t, A, B) },
    { nome: 'estrela', evento: 'cad-feicao-criada', cria: true, concluir: (t) => clicks(t, A, B) },
    { nome: 'circulo', evento: 'cad-feicao-criada', cria: true, concluir: (t) => clicks(t, A, B) },
    {
      nome: 'texto', evento: 'cad-feicao-criada', cria: true,
      concluir: (t) => {
        clicks(t, A);
        const campo = document.querySelector('#cm-draw-hud input') as HTMLInputElement;
        campo.value = 'Poço';
        campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    },
    { nome: 'caneta', evento: 'cad-feicao-criada', cria: true, concluir: (t) => { clicks(t, A, B); t.tecla('Enter'); } },
    { nome: 'medir-distancia', evento: 'cad-medicao', concluir: (t) => { clicks(t, A, B, C); t.tecla('Enter'); } },
    { nome: 'medir-area', evento: 'cad-medicao', concluir: (t) => { clicks(t, A, B, C); t.tecla('Enter'); } },
    {
      nome: 'dividir', evento: 'cad-feicao-dividida',
      preparar: (t) => { t.g.definirFeicoes('c', [quad('q')]); t.g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]); },
      concluir: (t) => { clicks(t, [-23.495, -46.595], [-23.515, -46.595]); t.tecla('Enter'); }
    },
    {
      nome: 'selecao-laco', evento: 'cad-selecao',
      preparar: (t) => { t.g.definirFeicoes('c', [quad('q')]); },
      concluir: (t) => { clicks(t, [-23.4, -46.7], [-23.4, -46.5], [-23.6, -46.5]); t.tecla('Enter'); }
    },
    {
      nome: 'conta-gotas', evento: 'cad-conta-gotas',
      preparar: (t) => { t.g.definirFeicoes('c', [{ ...quad('q'), estilo: { corTraco: '#ff0000' } }]); },
      concluir: (t) => t.clicarNoMapa([-23.505, -46.595])
    }
  ];

  it.each(casos)('$nome', (caso) => {
    const t = novo();
    t.g.definirCamadaDesenho('r');
    caso.preparar?.(t);
    expect(t.g.ativarFerramenta(caso.nome).ok).toBe(true);
    expect(t.g.ferramentaAtiva).toBe(caso.nome);

    let desativou = false;
    t.ouvir(caso.evento, () => {
      if (desativou) return;
      desativou = true;
      t.g.desativarFerramenta();
    });
    caso.concluir(t);
    expect(desativou).toBe(true);

    // 1. a ferramenta ficou mesmo desligada e sem resíduos
    expect(t.g.ferramentaAtiva).toBeNull();
    expect(t.desenho().ativo).toBe(false);
    expect(t.map.getContainer().classList.contains('cad-ferramenta-ativa')).toBe(false);
    expect(t.map.getContainer().style.cursor).toBe('');
    expect(document.getElementById('cm-draw-hud')).toBeNull();
    expect(t.g.nosDesenho).toBe(0);

    // 2. uma ativação e uma desativação, nessa ordem, sem eventos extras de ferramenta
    expect(t.ev('cad-ferramenta')).toEqual([{ ferramenta: caso.nome }, { ferramenta: null }]);

    // 3. depois disso nada mais reage (teclas, cliques no mapa)
    const antes = t.eventos.length;
    t.tecla('Enter');
    t.tecla('Escape');
    t.clicarNoMapa(A);
    t.clicarNoMapa(B);
    expect(t.eventos.length).toBe(antes);

    // 4. criou o que devia, uma vez só
    if (caso.cria) expect(t.g.obterFeicoes('r')).toHaveLength(1);
    if (caso.nome === 'dividir') expect(t.g.obterFeicoes('c').length).toBeGreaterThanOrEqual(2);
    if (caso.nome === 'medir-distancia' || caso.nome === 'medir-area') expect(t.ev('cad-medicao')).toHaveLength(1);

    // 5. `cad-selecao` nunca sai com a ferramenta ainda ativa quando a seleção é consequência dela
    for (const [nome, ferramenta] of t.ferramentaNoEvento) {
      if (nome === 'cad-selecao' && (caso.nome === 'selecao-laco' || caso.nome === 'dividir')) expect(ferramenta).toBeNull();
    }
  });

  it('dividir sem seleção continua ativa para o próximo corte (nada mudou na seleção)', () => {
    const t = novo();
    t.g.definirFeicoes('c', [quad('q')]);
    t.g.ativarFerramenta('dividir');
    clicks(t, [-23.495, -46.595], [-23.515, -46.595]);
    t.tecla('Enter');
    expect(t.ev('cad-feicao-dividida')).toHaveLength(1);
    expect(t.ev('cad-selecao')).toEqual([]);
    expect(t.g.ferramentaAtiva).toBe('dividir');
  });

  it('dividir com a original selecionada: a ferramenta encerra antes de `cad-selecao`', () => {
    const t = novo();
    t.g.definirFeicoes('c', [quad('q')]);
    t.g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    t.g.ativarFerramenta('dividir');
    clicks(t, [-23.495, -46.595], [-23.515, -46.595]);
    t.tecla('Enter');
    const ordem = t.eventos.map(([e]) => e).filter((e) => ['cad-ferramenta', 'cad-selecao', 'cad-feicao-dividida'].includes(e));
    // seleção do teste, ativar, [corte: desativar -> seleção esvaziada -> dividida]
    expect(ordem).toEqual(['cad-selecao', 'cad-ferramenta', 'cad-ferramenta', 'cad-selecao', 'cad-feicao-dividida']);
    expect(t.ev('cad-ferramenta')).toEqual([{ ferramenta: 'dividir' }, { ferramenta: null }]);
    const selecoesDuranteDivisao = t.ferramentaNoEvento.filter(([e]) => e === 'cad-selecao').map(([, f]) => f);
    expect(selecoesDuranteDivisao[selecoesDuranteDivisao.length - 1]).toBeNull();
    expect(t.g.ferramentaAtiva).toBeNull();
  });

  it('medir: o ouvinte de `cad-medicao` que desativa não deixa a sessão ressuscitar', () => {
    const t = novo();
    t.g.ativarFerramenta('medir-distancia');
    t.ouvir('cad-medicao', () => t.g.desativarFerramenta());
    clicks(t, A, B);
    t.tecla('Enter');
    expect(t.g.ferramentaAtiva).toBeNull();
    expect(t.desenho().ferramenta).toBeNull();
  });

  it('o ouvinte pode trocar de ferramenta no evento de conclusão', () => {
    const t = novo();
    t.g.definirCamadaDesenho('r');
    t.g.ativarFerramenta('ponto');
    t.ouvir('cad-feicao-criada', () => { t.g.ativarFerramenta('linha'); });
    clicks(t, A);
    expect(t.g.ferramentaAtiva).toBe('linha');
    clicks(t, A, B);
    t.tecla('Enter');
    expect(t.g.obterFeicoes('r')).toHaveLength(2);
  });
});

describe('popup: ação copiar', () => {
  function comAreaDeTransferencia() {
    const escrever = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText: escrever } });
    return escrever;
  }
  const acao = (g: GerenciadorFeicoes, nome: string) =>
    (g as unknown as { tratarAcaoPopup: (a: string, f: unknown) => void }).tratarAcaoPopup(nome, g.obterFeicoes('c')[0]);

  it('por padrão grava na área de transferência e emite cad-feicao-acao', () => {
    const escrever = comAreaDeTransferencia();
    const t = novo();
    t.g.definirFeicoes('c', [{ id: 'p', geometria: { tipo: 'Point', coordenada: A } }]);
    expect(t.g.obterOpcoesPopup().copiarParaAreaDeTransferencia).toBe(true);
    acao(t.g, 'copiar');
    expect(escrever).toHaveBeenCalledWith('-23.500000, -46.600000');
    expect(t.ev('cad-feicao-acao')).toMatchObject([{ acao: 'copiar' }]);
  });

  it('com copiarParaAreaDeTransferencia: false só emite o evento (o app decide o toast)', () => {
    const escrever = comAreaDeTransferencia();
    const t = novo();
    t.g.definirFeicoes('c', [{ id: 'p', geometria: { tipo: 'Point', coordenada: A } }]);
    t.g.definirOpcoesPopup({ copiarParaAreaDeTransferencia: false });
    acao(t.g, 'copiar');
    expect(escrever).not.toHaveBeenCalled();
    expect(t.ev('cad-feicao-acao')).toMatchObject([{ acao: 'copiar' }]);
    t.g.definirOpcoesPopup({ copiarParaAreaDeTransferencia: true });
    acao(t.g, 'copiar');
    expect(escrever).toHaveBeenCalledOnce();
  });

  it('as outras ações não dependem da opção', () => {
    comAreaDeTransferencia();
    const t = novo();
    t.g.definirFeicoes('c', [{ id: 'p', geometria: { tipo: 'Point', coordenada: A } }]);
    t.g.definirOpcoesPopup({ copiarParaAreaDeTransferencia: false });
    acao(t.g, 'inspecionar');
    expect(t.ev('cad-feicao-acao')).toMatchObject([{ acao: 'inspecionar' }]);
  });
});

describe('texto: cad-texto-solicitado', () => {
  it('sem preventDefault mantém o campo inline e o evento sai antes', () => {
    const t = novo(false);
    t.g.definirCamadaDesenho('r');
    t.g.ativarFerramenta('texto');
    t.desenho().clicarEm(A);
    expect(t.ev('cad-texto-solicitado')).toHaveLength(1);
    expect(t.ev('cad-texto-solicitado')[0]).toMatchObject({ coordenada: A, camadaId: 'r' });
    expect(document.querySelector('#cm-draw-hud input')).toBeTruthy();
  });

  it('com preventDefault não abre o campo; concluir(texto) cria a feição na camada de desenho', () => {
    const t = novo(true);
    t.g.definirCamadaDesenho('r');
    t.g.definirEstiloDesenho({ corTraco: '#ff00ff' });
    t.g.ativarFerramenta('texto');
    t.desenho().clicarEm(B);
    expect(document.querySelector('#cm-draw-hud input')).toBeNull();
    expect(t.g.ferramentaAtiva).toBe('texto'); // segue ativa para o próximo clique
    const d = t.ev('cad-texto-solicitado')[0];
    expect(d.coordenada).toEqual(B);

    expect(d.concluir('   ')).toBeNull();
    const f = d.concluir('  Poço 3 ');
    expect(f).toMatchObject({ geometria: { tipo: 'Text', coordenada: B, texto: 'Poço 3' }, estilo: { corTraco: '#ff00ff' } });
    expect(t.g.obterFeicoes('r')).toHaveLength(1);
    expect(t.ev('cad-feicao-criada')).toHaveLength(1);
  });

  it('cancelar é só não chamar concluir; sem camada de desenho, concluir devolve null', () => {
    const t = novo(true);
    t.g.definirCamadaDesenho('r');
    t.g.ativarFerramenta('texto');
    t.desenho().clicarEm(A);
    t.g.definirCamadaDesenho(null);
    expect(t.ev('cad-texto-solicitado')[0].concluir('x')).toBeNull();
    expect(t.g.obterFeicoes('r')).toHaveLength(0);
  });

  it('o consumidor pode desativar a ferramenta dentro do evento sem sobrar campo', () => {
    const t = novo(false);
    t.g.definirCamadaDesenho('r');
    t.g.ativarFerramenta('texto');
    t.ouvir('cad-texto-solicitado', () => t.g.desativarFerramenta());
    t.desenho().clicarEm(A);
    expect(document.getElementById('cm-draw-hud')).toBeNull();
    expect(t.g.ferramentaAtiva).toBeNull();
  });

  it('no componente o evento é cancelável e burbulha pelo shadow DOM', () => {
    const el = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el);
    const mapa = el.inicializarAgora()!;
    el.definirCamadaDesenho('r');
    let evento: CustomEvent | null = null;
    el.addEventListener('cad-texto-solicitado', (e) => {
      evento = e as CustomEvent;
      e.preventDefault();
    });
    expect(el.definirFerramenta('texto').ok).toBe(true);
    mapa.fire('click', { latlng: L.latLng(A[0], A[1]), containerPoint: mapa.latLngToContainerPoint(A) });
    expect(evento).not.toBeNull();
    expect((evento as unknown as CustomEvent).cancelable).toBe(true);
    expect((evento as unknown as CustomEvent).detail.coordenada).toEqual([A[0], A[1]]);
    expect(el.getMap()!.getContainer().querySelector('#cm-draw-hud input')).toBeNull();
    const f = (evento as unknown as CustomEvent).detail.concluir('Marco');
    expect(f.geometria.texto).toBe('Marco');
    expect(el.obterFeicoes('r')).toHaveLength(1);

    // sem preventDefault o campo inline aparece
    const el2 = document.createElement('ui-canvas-cad') as UICanvasCAD;
    document.body.appendChild(el2);
    const mapa2 = el2.inicializarAgora()!;
    el2.definirCamadaDesenho('r');
    el2.definirFerramenta('texto');
    mapa2.fire('click', { latlng: L.latLng(A[0], A[1]), containerPoint: mapa2.latLngToContainerPoint(A) });
    expect(mapa2.getContainer().querySelector('#cm-draw-hud input')).toBeTruthy();
  });
});
