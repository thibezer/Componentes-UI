import { describe, it, expect, afterEach } from 'vitest';
import L from 'leaflet';
import { GerenciadorFeicoes } from '../src/components/ui-canvas-cad/cad-feicoes';
import { CanvasLayerManager } from '../src/gerencigeo-canvas/layer_manager';
import type { ControleDesenho } from '../src/gerencigeo-canvas/feature_desenho_controle';
import type { Feicao, LatLonPar } from '../src/gerencigeo-canvas/feature_types';

afterEach(() => { document.body.innerHTML = ''; });

function novo() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800 });
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  document.body.appendChild(el);
  const map = L.map(el, { preferCanvas: true, center: [-23.505, -46.595], zoom: 16 });
  const lm = new CanvasLayerManager([]);
  const eventos: Array<[string, any]> = [];
  const ferramentas: Array<string | null> = [];
  const g = new GerenciadorFeicoes({
    obterLayerManager: () => lm, obterMapa: () => map,
    emitir: (e, d) => eventos.push([e, d]),
    aoFerramenta: (f) => ferramentas.push(f)
  });
  lm.attachMap(map, { config: {}, graphicScale: {}, onLayerAction: () => undefined } as never);
  const ev = (nome: string) => eventos.filter(([e]) => e === nome).map(([, d]) => d);
  const desenho = () => (g as unknown as { desenho: ControleDesenho }).desenho;
  const tecla = (key: string, o: KeyboardEventInit = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...o }));
  return { g, lm, map, el, eventos, ev, ferramentas, desenho, tecla };
}

const quad = (id: string): Record<string, unknown> => ({
  id, geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]]] }
});

describe('ativação das ferramentas', () => {
  it('ferramenta desconhecida é recusada; criação sem camada de desenho também (e avisa)', () => {
    const { g, ev } = novo();
    expect(g.ativarFerramenta('xyz')).toEqual({ ok: false, motivo: 'ferramenta-invalida' });
    expect(g.ativarFerramenta('linha')).toEqual({ ok: false, motivo: 'sem-camada' });
    expect(ev('cad-desenho-recusado')).toEqual([{ ferramenta: 'linha', motivo: 'sem-camada' }]);
    expect(g.ferramentaAtiva).toBeNull();
  });

  it('medir, dividir e conta-gotas não precisam de camada de desenho', () => {
    const { g } = novo();
    for (const f of ['medir-distancia', 'medir-area', 'dividir', 'conta-gotas']) {
      expect(g.ativarFerramenta(f).ok).toBe(true);
      expect(g.ferramentaAtiva).toBe(f);
    }
  });

  it('recusa camada de outro tipo e camada bloqueada', () => {
    const { g, lm } = novo();
    const outro = new CanvasLayerManager();
    const g2 = new GerenciadorFeicoes({ obterLayerManager: () => outro, obterMapa: () => novo().map, emitir: () => undefined });
    g2.definirCamadaDesenho('perimetro');
    expect(g2.ativarFerramenta('ponto').motivo).toBe('camada-invalida');

    g.definirCamadaDesenho('rascunho');
    g.definirFeicoes('rascunho', []);
    lm.setLayerBlocked('rascunho', true);
    expect(g.ativarFerramenta('ponto').motivo).toBe('camada-bloqueada');
  });

  it('alternar liga e desliga; trocar de ferramenta emite a mudança e atualiza o estado', () => {
    const { g, ferramentas, ev } = novo();
    g.definirCamadaDesenho('r');
    g.alternarFerramenta('linha');
    expect(g.ferramentaAtiva).toBe('linha');
    g.alternarFerramenta('poligono');
    expect(g.ferramentaAtiva).toBe('poligono');
    g.alternarFerramenta('poligono');
    expect(g.ferramentaAtiva).toBeNull();
    expect(ferramentas.filter(Boolean)).toEqual(['linha', 'poligono']);
    expect(ferramentas[ferramentas.length - 1]).toBeNull();
    expect(ev('cad-ferramenta').pop()).toEqual({ ferramenta: null });
  });

  it('mostra o HUD e a classe no mapa; desativar remove tudo', () => {
    const { g, el, map } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('linha');
    expect(el.querySelector('#cm-draw-hud')?.textContent).toContain('Linha');
    expect(map.getContainer().classList.contains('cad-ferramenta-ativa')).toBe(true);
    g.desativarFerramenta();
    expect(el.querySelector('#cm-draw-hud')).toBeNull();
    expect(map.getContainer().classList.contains('cad-ferramenta-ativa')).toBe(false);
  });
});

describe('criação de feições', () => {
  it('linha: cliques + Enter criam a feição na camada de desenho, que nasce sob demanda', () => {
    const { g, lm, ev, desenho, tecla } = novo();
    expect(lm.getLayerDef('rascunho')).toBeUndefined();
    g.definirCamadaDesenho('rascunho');
    g.ativarFerramenta('linha');
    desenho().clicarEm([-23.5, -46.6]);
    desenho().clicarEm([-23.5, -46.59]);
    desenho().clicarEm([-23.51, -46.59]);
    tecla('Enter');

    const criadas = g.obterFeicoes('rascunho');
    expect(criadas).toHaveLength(1);
    expect(criadas[0].geometria).toMatchObject({ tipo: 'LineString' });
    expect(lm.getLayerDef('rascunho')?.tipo).toBe('feicoes');
    expect(ev('cad-feicao-criada')).toHaveLength(1);
    expect(g.ferramentaAtiva).toBe('linha'); // continua ativa para a próxima
    expect(desenho().ferramenta).toBe('linha');
  });

  it('polígono, retângulo, círculo, ponto e caneta criam o tipo certo', () => {
    const { g, desenho, tecla } = novo();
    g.definirCamadaDesenho('r');

    g.ativarFerramenta('poligono');
    for (const p of [[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59]] as LatLonPar[]) desenho().clicarEm(p);
    tecla('Enter');
    g.ativarFerramenta('retangulo');
    desenho().clicarEm([-23.52, -46.6]);
    desenho().clicarEm([-23.53, -46.59]);
    g.ativarFerramenta('circulo');
    desenho().clicarEm([-23.54, -46.6]);
    desenho().clicarEm([-23.54, -46.599]);
    g.ativarFerramenta('ponto');
    desenho().clicarEm([-23.55, -46.6]);
    g.ativarFerramenta('caneta');
    desenho().clicarEm([-23.56, -46.6]);
    desenho().clicarEm([-23.56, -46.59]);
    tecla('Enter');

    expect(g.obterFeicoes('r').map((f) => f.geometria.tipo)).toEqual(['Polygon', 'Polygon', 'Circle', 'Point', 'LineString']);
  });

  it('ids são únicos mesmo com muitas criações seguidas', () => {
    const { g, desenho } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('ponto');
    for (let i = 0; i < 50; i++) desenho().clicarEm([-23.5 - i * 1e-4, -46.6]);
    const ids = g.obterFeicoes('r').map((f) => f.id);
    expect(ids).toHaveLength(50);
    expect(new Set(ids).size).toBe(50);
  });

  it('aplica o estilo de desenho às feições novas', () => {
    const { g, desenho } = novo();
    g.definirCamadaDesenho('r');
    g.definirEstiloDesenho({ corTraco: '#ff0000', espessuraTraco: 4 });
    g.ativarFerramenta('ponto');
    desenho().clicarEm([-23.5, -46.6]);
    expect(g.obterFeicoes('r')[0].estilo).toMatchObject({ corTraco: '#ff0000', espessuraTraco: 4 });
    expect(g.obterEstiloDesenho()).toEqual({ corTraco: '#ff0000', espessuraTraco: 4 });
  });

  it('texto: pede o conteúdo num campo; Enter cria, vazio e Esc não criam nada', () => {
    const { g, el, desenho, tecla } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('texto');
    desenho().clicarEm([-23.5, -46.6]);
    const campo = el.querySelector('#cm-draw-hud input') as HTMLInputElement;
    expect(campo).toBeTruthy();
    campo.value = 'Poço <1>';
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const [t] = g.obterFeicoes('r');
    expect(t.geometria).toMatchObject({ tipo: 'Text', texto: 'Poço <1>' });
    expect(el.querySelector('#cm-draw-hud input')).toBeNull();

    desenho().clicarEm([-23.51, -46.6]);
    (el.querySelector('#cm-draw-hud input') as HTMLInputElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(g.obterFeicoes('r')).toHaveLength(1); // texto vazio não cria

    desenho().clicarEm([-23.52, -46.6]);
    tecla('Escape');
    expect(el.querySelector('#cm-draw-hud input')).toBeNull();
    expect(g.obterFeicoes('r')).toHaveLength(1);
    expect(g.ferramentaAtiva).toBe('texto'); // Esc só fechou o campo
  });

  it('Esc cancela o desenho em andamento; Esc de novo desativa; Backspace desfaz o último vértice', () => {
    const { g, desenho, tecla } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('linha');
    desenho().clicarEm([-23.5, -46.6]);
    desenho().clicarEm([-23.5, -46.59]);
    desenho().clicarEm([-23.51, -46.59]);
    tecla('Backspace');
    tecla('Enter');
    expect((g.obterFeicoes('r')[0].geometria as { coordenadas: LatLonPar[] }).coordenadas).toHaveLength(2);

    desenho().clicarEm([-23.5, -46.6]);
    tecla('Escape');
    tecla('Enter'); // nada em andamento: não cria
    expect(g.obterFeicoes('r')).toHaveLength(1);
    expect(g.ferramentaAtiva).toBe('linha');
    tecla('Escape');
    expect(g.ferramentaAtiva).toBeNull();
  });

  it('com a ferramenta ativa, o clique numa feição não seleciona e o Esc não limpa a seleção', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quad('q')]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'q' }]);
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('linha');
    const f = g.obterFeicoes('c')[0];
    expect(g.tratarAcaoCamada('feicao-clique', { camadaId: 'c', feicao: f })).toBeNull();
    g.aoPedirLimpeza();
    expect(g.obterFeicoesSelecionadas()).toHaveLength(1);
    g.desativarFerramenta();
    expect(g.tratarAcaoCamada('feicao-clique', { camadaId: 'c', feicao: f })).toBe('cad-feicao-clique');
  });

  it('iniciar a edição de vértices desativa a ferramenta', () => {
    const { g } = novo();
    g.definirFeicoes('c', [quad('q')]);
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('linha');
    expect(g.iniciarEdicao('c', 'q').ok).toBe(true);
    expect(g.ferramentaAtiva).toBeNull();
    expect(g.editando).toBe(true);
    g.ativarFerramenta('medir-distancia');
    expect(g.editando).toBe(false);
  });
});

describe('medição', () => {
  it('distância: mostra rótulos por trecho, emite o total e não cria feição', () => {
    const { g, ev, desenho, tecla, el } = novo();
    g.ativarFerramenta('medir-distancia');
    desenho().clicarEm([-23.5, -46.6]);
    desenho().clicarEm([-23.5, -46.59]);
    desenho().clicarEm([-23.51, -46.59]);
    tecla('Enter');
    const [m] = ev('cad-medicao');
    expect(m.tipo).toBe('distancia');
    expect(m.pontos).toHaveLength(3);
    expect(m.comprimentoM).toBeGreaterThan(1900);
    // com 3+ pontos a régua também informa área e perímetro (do contorno fechado), sem criar feição
    expect(m.areaM2).toBeGreaterThan(0);
    expect(m.perimetroM).toBeGreaterThan(m.comprimentoM);
    expect(g.obterFeicoes('r')).toHaveLength(0);
    expect(el.querySelectorAll('.leaflet-marker-icon div').length).toBeGreaterThanOrEqual(2);
  });

  it('área: emite área e perímetro; nova medição e limparMedicao apagam a anterior', () => {
    const { g, ev, desenho, tecla, map } = novo();
    g.ativarFerramenta('medir-area');
    for (const p of [[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]] as LatLonPar[]) desenho().clicarEm(p);
    tecla('Enter');
    const [m] = ev('cad-medicao');
    expect(m.tipo).toBe('area');
    expect(m.areaM2).toBeGreaterThan(1.1e6);
    expect(m.perimetroM).toBeGreaterThan(4000);

    const camadasAntes = Object.keys((map as unknown as { _layers: object })._layers).length;
    g.limparMedicao();
    const camadasDepois = Object.keys((map as unknown as { _layers: object })._layers).length;
    expect(camadasDepois).toBeLessThan(camadasAntes);
  });
});

describe('dividir', () => {
  const linhaDeCorte = (): LatLonPar[] => [[-23.49, -46.595], [-23.52, -46.595]];

  it('divide o polígono cortado, troca o original pelas partes e avisa', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [quad('q')]);
    expect(g.dividirComLinha(linhaDeCorte())).toBe(true);
    const ids = g.obterFeicoes('c').map((f) => f.id).sort();
    expect(ids).toEqual(['q-1', 'q-2']);
    const [d] = ev('cad-feicao-dividida');
    expect(d.origem.id).toBe('q');
    expect(d.partes).toHaveLength(2);
  });

  it('as partes herdam estilo e propriedades', () => {
    const { g } = novo();
    g.definirFeicoes('c', [{ ...quad('q'), estilo: { corTraco: '#00ff00' }, propriedades: { name: 'Gleba' } }]);
    g.dividirComLinha(linhaDeCorte());
    for (const f of g.obterFeicoes('c')) {
      expect(f.estilo?.corTraco).toBe('#00ff00');
      expect(f.propriedades.name).toBe('Gleba');
    }
  });

  it('falha com motivo: sem polígonos, linha que não corta, polígono bloqueado ou com furos', () => {
    const { g, ev } = novo();
    expect(g.dividirComLinha(linhaDeCorte())).toBe(false);
    g.definirFeicoes('c', [quad('q')]);
    expect(g.dividirComLinha([[-23.4, -46.7], [-23.4, -46.8]])).toBe(false);
    g.definirFeicoes('b', [{ ...quad('b'), bloqueada: true }]);
    g.alternarSelecaoFeicao({ camadaId: 'b', id: 'b' });
    expect(g.dividirComLinha(linhaDeCorte())).toBe(false);
    expect(ev('cad-divisao-falhou').map((d) => d.motivo)).toEqual(['nenhum-poligono', 'sem-intersecao', 'bloqueada']);

    const { g: g2, ev: ev2 } = novo();
    g2.definirFeicoes('c', [{ id: 'f', geometria: { tipo: 'Polygon', aneis: [
      [[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]],
      [[-23.503, -46.597], [-23.503, -46.593], [-23.507, -46.593], [-23.507, -46.597]]
    ] } }]);
    expect(g2.dividirComLinha(linhaDeCorte())).toBe(false);
    expect(ev2('cad-divisao-falhou')[0].motivo).toBe('poligono-com-furos');
  });

  it('com seleção, só os polígonos selecionados são divididos', () => {
    const { g } = novo();
    g.definirFeicoes('c', [
      quad('a'),
      { id: 'b', geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.598], [-23.5, -46.592], [-23.51, -46.592], [-23.51, -46.598]]] } }
    ]);
    g.selecionarFeicoes([{ camadaId: 'c', id: 'b' }]);
    g.dividirComLinha(linhaDeCorte());
    expect(g.obterFeicoes('c').map((f) => f.id).sort()).toEqual(['a', 'b-1', 'b-2']);
  });

  it('pela ferramenta: desenhar a linha de corte e Enter aplica', () => {
    const { g, desenho, tecla } = novo();
    g.definirFeicoes('c', [quad('q')]);
    g.ativarFerramenta('dividir');
    desenho().clicarEm([-23.49, -46.595]);
    desenho().clicarEm([-23.52, -46.595]);
    tecla('Enter');
    expect(g.obterFeicoes('c')).toHaveLength(2);
  });
});

describe('conta-gotas', () => {
  it('copia o estilo da feição sob o clique para o estilo de desenho e avisa', () => {
    const { g, ev, map } = novo();
    g.definirFeicoes('c', [{ ...quad('q'), estilo: { corTraco: '#123456', corPreenchimento: '#abcdef', espessuraTraco: 5 } }]);
    g.ativarFerramenta('conta-gotas');
    const centro = map.getCenter();
    (g as unknown as { amostrarEstilo: (c: LatLonPar) => void }).amostrarEstilo([-23.505, -46.595]);
    expect(centro).toBeTruthy();
    const [d] = ev('cad-conta-gotas');
    expect(d.cor).toBe('#123456');
    expect(d.feicao.id).toBe('q');
    expect(g.obterEstiloDesenho()).toMatchObject({ corTraco: '#123456', corPreenchimento: '#abcdef', espessuraTraco: 5 });
  });

  it('usa a cor da camada quando a feição não tem estilo próprio; clique no vazio avisa sem mexer no estilo', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [quad('q')], { estilo: { corPrimaria: '#ff8800' } });
    const amostrar = (c: LatLonPar) => (g as unknown as { amostrarEstilo: (c: LatLonPar) => void }).amostrarEstilo(c);
    amostrar([-23.505, -46.595]);
    expect(ev('cad-conta-gotas')[0].cor).toBe('#ff8800');
    g.definirEstiloDesenho({ corTraco: '#111111' });
    amostrar([-23.4, -46.4]);
    expect(ev('cad-conta-gotas')[1]).toMatchObject({ cor: '', feicao: null });
    expect(g.obterEstiloDesenho()).toEqual({ corTraco: '#111111' });
  });

  it('a próxima feição desenhada sai com a cor amostrada', () => {
    const { g, desenho } = novo();
    g.definirFeicoes('c', [{ ...quad('q'), estilo: { corTraco: '#654321' } }]);
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('conta-gotas');
    (g as unknown as { amostrarEstilo: (c: LatLonPar) => void }).amostrarEstilo([-23.505, -46.595]);
    g.ativarFerramenta('ponto');
    desenho().clicarEm([-23.6, -46.6]);
    expect(g.obterFeicoes('r')[0].estilo?.corTraco).toBe('#654321');
  });

  it('copia também o tipo de linha, a escala, a opacidade, as pontas, os cantos e o deslocamento', () => {
    const { g, desenho } = novo();
    const linhaCad = { tipoLinha: 'centro', escalaTipoLinha: 2, opacidadeTraco: 0.5, terminacaoTraco: 'reta', juncaoTraco: 'angular', deslocamentoTracejado: 3 } as const;
    g.definirFeicoes('c', [{ ...quad('q'), estilo: linhaCad }]);
    g.definirCamadaDesenho('r');
    (g as unknown as { amostrarEstilo: (c: LatLonPar) => void }).amostrarEstilo([-23.505, -46.595]);
    expect(g.obterEstiloDesenho()).toMatchObject(linhaCad);
    g.ativarFerramenta('ponto');
    desenho().clicarEm([-23.6, -46.6]);
    expect(g.obterFeicoes('r')[0].estilo).toMatchObject(linhaCad);
  });
});

describe('utilitários da API', () => {
  const ponto = (id: string, lat: number, lon: number) => ({ id, geometria: { tipo: 'Point', coordenada: [lat, lon] } });

  it('gerarBuffer cria o polígono na camada de destino, com a origem registrada', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [ponto('p', -23.5, -46.6)]);
    const b = g.gerarBuffer('c', 'p', 100, { camadaDestino: 'buffers' })!;
    expect(b.geometria.tipo).toBe('Polygon');
    expect(b.propriedades.origem).toBe('p');
    expect(g.obterFeicoes('buffers')).toHaveLength(1);
    expect(g.obterFeicoes('c')).toHaveLength(1);
    expect(ev('cad-feicao-criada')).toHaveLength(1);
    expect(g.gerarBuffer('c', 'p', 0)).toBeNull();
    expect(g.gerarBuffer('c', 'nada', 5)).toBeNull();
  });

  it('duplicarFeicao desloca a cópia e mantém a original', () => {
    const { g } = novo();
    g.definirFeicoes('c', [ponto('p', -23.5, -46.6)]);
    const c = g.duplicarFeicao('c', 'p', { lesteM: 100, norteM: 0 })!;
    expect(c.id).not.toBe('p');
    expect((c.geometria as { coordenada: LatLonPar }).coordenada[1]).toBeGreaterThan(-46.6);
    expect((g.obterFeicoes('c').find((f) => f.id === 'p')!.geometria as { coordenada: LatLonPar }).coordenada).toEqual([-23.5, -46.6]);
    expect(g.obterFeicoes('c')).toHaveLength(2);
  });

  it('juntarFeicoes encadeia linhas e troca as originais pelo resultado', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [
      { id: 'a', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59]] } },
      { id: 'b', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.58], [-23.5, -46.59]] } }
    ]);
    const r = g.juntarFeicoes('c', ['a', 'b'])!;
    expect((r.geometria as { coordenadas: LatLonPar[] }).coordenadas).toHaveLength(3);
    expect(g.obterFeicoes('c').map((f) => f.id)).toEqual([r.id]);
    expect(ev('cad-feicao-unida')[0].origens).toHaveLength(2);
  });

  it('juntarFeicoes falha com motivo (poucas feições, tipos misturados, sem ligação) e não altera nada', () => {
    const { g, ev } = novo();
    g.definirFeicoes('c', [
      { id: 'a', geometria: { tipo: 'LineString', coordenadas: [[-23.5, -46.6], [-23.5, -46.59]] } },
      { id: 'b', geometria: { tipo: 'LineString', coordenadas: [[-23.4, -46.4], [-23.4, -46.3]] } },
      ponto('p', -23.5, -46.6)
    ]);
    expect(g.juntarFeicoes('c', ['a'])).toBeNull();
    expect(g.juntarFeicoes('c', ['a', 'p'])).toBeNull();
    expect(g.juntarFeicoes('c', ['a', 'b'], { toleranciaM: 5 })).toBeNull();
    expect(ev('cad-uniao-falhou').map((d) => d.motivo)).toEqual(['feicoes-insuficientes', 'tipos-incompativeis', 'sem-ligacao']);
    expect(g.obterFeicoes('c')).toHaveLength(3);
  });

  it('juntarFeicoes une dois polígonos vizinhos', () => {
    const { g } = novo();
    g.definirFeicoes('c', [
      { id: 'a', geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.6], [-23.5, -46.59], [-23.51, -46.59], [-23.51, -46.6]]] } },
      { id: 'b', geometria: { tipo: 'Polygon', aneis: [[[-23.5, -46.59], [-23.5, -46.58], [-23.51, -46.58], [-23.51, -46.59]]] } }
    ]);
    const r = g.juntarFeicoes('c', ['a', 'b'], { toleranciaM: 1 })!;
    expect(r.geometria.tipo).toBe('Polygon');
    expect(g.obterFeicoes('c')).toHaveLength(1);
  });
});

describe('desenho, tipos recebidos', () => {
  it('uma feição criada pelas ferramentas é normalizada como qualquer outra', () => {
    const { g, desenho } = novo();
    g.definirCamadaDesenho('r');
    g.ativarFerramenta('circulo');
    desenho().clicarEm([-23.5, -46.6]);
    desenho().clicarEm([-23.5, -46.599]);
    const [c] = g.obterFeicoes('r') as Feicao[];
    expect(c.geometria).toMatchObject({ tipo: 'Circle' });
    expect(c.status).toBe('oficial');
    expect(c.camadaId).toBe('r');
  });
});
