/* ====================================================
   Custom Elements Manifest + tipos para frameworks
   Gera em dist/: custom-elements.json, tipos-elementos.d.ts,
   tipos-react.d.ts e tipos-vue.d.ts
   (executado por `npm run build`, depois do vite build)
   ==================================================== */

import fs from 'node:fs';
import path from 'node:path';

const SAIDA = 'dist';
/** Tipos das classes, relativo a dist/ (o index exporta todas as classes de componentes). */
const TIPOS_DAS_CLASSES = './index.js';

/** Strings entre aspas simples/duplas/crase dentro de um trecho de código. */
const literais = (trecho) => Array.from(trecho.matchAll(/(['"`])([^'"`]+)\1/g), (m) => m[2]);

function lerFontesDaPasta(pasta) {
  return fs.readdirSync(pasta)
    .filter((arquivo) => arquivo.endsWith('.ts') && !arquivo.endsWith('.test.ts'))
    .map((arquivo) => fs.readFileSync(path.join(pasta, arquivo), 'utf-8'))
    .join('\n');
}

/** Nomes expostos via `part="..."`, `setAttribute('part', ...)` e `alternarPart(el, '...')`. */
function coletarParts(fonte) {
  const nomes = new Set();
  for (const m of fonte.matchAll(/part="([^"$]+)"/g)) m[1].split(/\s+/).forEach((n) => nomes.add(n));
  for (const m of fonte.matchAll(/setAttribute\(\s*'part'\s*,([^)]*)\)/g)) literais(m[1]).forEach((t) => t.split(/\s+/).forEach((n) => nomes.add(n)));
  for (const m of fonte.matchAll(/alternarPart\([^,]+,\s*'([^']+)'/g)) nomes.add(m[1]);
  return [...nomes].filter((n) => /^[a-z][a-z0-9-]*$/.test(n)).sort();
}

/** Eventos `ui-*` disparados em qualquer módulo da pasta do componente (inclusive auxiliares). */
function coletarEventos(fonte) {
  const padrao = /(?:new CustomEvent(?:<[^>]*>)?|\.dispararEvento)\(\s*'(ui-[a-z-]+)'/g;
  return [...new Set(Array.from(fonte.matchAll(padrao), (m) => m[1]))].sort();
}

/** Nome de evento real: `ui-*` ou nativo (change, input); descarta variáveis lidas como nome (ex.: `nome`). */
const eventoValido = (nome) => /^ui-[a-z-]+$/.test(nome) || ['change', 'input'].includes(nome);

/**
 * Adapta o analisador às convenções do kit:
 * - tags registradas com `definirCustomElement('ui-x', Classe)` (em vez de customElements.define);
 * - `observedAttributes` que retorna uma constante importada de outro módulo;
 * - parts e eventos declarados em módulos auxiliares (templates, renderizadores).
 */
function convencoesDoKit() {
  return {
    name: 'ui-kit:convencoes',
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'definirCustomElement') return;
      const [tag, classe] = node.arguments;
      if (!tag || !ts.isStringLiteral(tag) || !classe || !ts.isIdentifier(classe)) return;

      const declaracao = moduleDoc.declarations?.find((d) => d.name === classe.text);
      if (!declaracao) return;
      declaracao.customElement = true;
      declaracao.tagName = tag.text;
      moduleDoc.exports = [
        ...(moduleDoc.exports ?? []),
        { kind: 'custom-element-definition', name: tag.text, declaration: { name: classe.text, module: moduleDoc.path } },
      ];
    },

    packageLinkPhase({ customElementsManifest }) {
      const modulos = customElementsManifest.modules;
      const classes = modulos.flatMap((m) => (m.declarations ?? []).filter((d) => d.kind === 'class').map((d) => ({ d, m })));
      const variaveis = new Map(modulos.flatMap((m) => (m.declarations ?? []).filter((d) => d.kind === 'variable').map((d) => [d.name, d])));
      const subclassesDe = (nome) => classes.filter(({ d }) => d.superclass?.name === nome);

      // 1. observedAttributes -> constante de outro módulo
      for (const { d, m } of classes) {
        if (d.attributes?.length) continue;
        const fonte = fs.readFileSync(m.path, 'utf-8');
        const constante = fonte.match(/static get observedAttributes\(\)\s*\{\s*return\s+([A-Z_][A-Z0-9_]*)\s*;?\s*\}/)?.[1];
        const valor = constante && variaveis.get(constante)?.default;
        if (!valor) continue;
        const atributos = literais(valor).map((name) => ({ name }));
        d.attributes = atributos;
        for (const { d: sub } of subclassesDe(d.name)) {
          if (!sub.attributes?.length) sub.attributes = atributos.map((a) => ({ ...a, inheritedFrom: { name: d.name, module: m.path } }));
        }
      }

      // 2. parts e eventos por pasta, quando a pasta contém um único componente (e seus aliases)
      const porPasta = new Map();
      for (const item of classes) {
        if (!item.d.tagName) continue;
        const pasta = path.dirname(item.m.path);
        porPasta.set(pasta, [...(porPasta.get(pasta) ?? []), item]);
      }
      for (const [pasta, itens] of porPasta) {
        for (const { d } of itens) d.events = (d.events ?? []).filter((e) => eventoValido(e.name));

        const nomes = new Set(itens.map(({ d }) => d.name));
        // Raiz: componente cujo pai não é outro componente da pasta (aliases como ui-select herdam da raiz)
        const raizes = itens.filter(({ d }) => !nomes.has(d.superclass?.name));
        // Pastas com componentes irmãos (ribbon/paleta, mapa/marcador/linha) mantêm só o que o analisador achou
        if (raizes.length !== 1) continue;

        const fonte = lerFontesDaPasta(pasta);
        const parts = coletarParts(fonte);
        const eventos = coletarEventos(fonte);
        for (const { d } of itens) {
          if (parts.length) d.cssParts = parts.map((name) => ({ name }));
          const existentes = new Set(d.events.map((e) => e.name));
          d.events.push(...eventos.filter((e) => !existentes.has(e)).map((name) => ({ name, type: { text: 'CustomEvent' } })));
        }
      }
    },
  };
}

/* ==========================================
   Tipos para frameworks (gerados a partir do manifesto)
   ========================================== */

/** Herdadas de HTMLElement ou detalhes internos que o analisador lista como campos. */
const PROPRIEDADES_IGNORADAS = new Set(['innerHTML', 'textContent', 'id', 'htmlFor', 'className', 'style', 'formAssociated', 'title', 'hidden', 'tabIndex']);
/** Eventos nativos já tipados pelos frameworks (onChange/onInput, @change/@input). */
const EVENTOS_NATIVOS = new Set(['change', 'input']);

const camel = (nome) => nome.replace(/-([a-z0-9])/g, (_, letra) => letra.toUpperCase());
const pascal = (nome) => camel(nome).replace(/^./, (letra) => letra.toUpperCase());
const chave = (nome) => (/^[A-Za-z_$][\w$]*$/.test(nome) ? nome : `'${nome}'`);
const eventosDoComponente = (c) => (c.events ?? []).filter((e) => !EVENTOS_NATIVOS.has(e.name));

function descreverComponente(c) {
  const linhas = [`\`<${c.tagName}>\``];
  const eventos = eventosDoComponente(c).map((e) => e.name);
  if (eventos.length) linhas.push(`Eventos: ${eventos.join(', ')}`);
  if (c.cssParts?.length) linhas.push(`Parts (::part): ${c.cssParts.map((p) => p.name).join(', ')}`);
  return `/**\n * ${linhas.join('\n * ')}\n */`;
}

/**
 * Props de uma tag. Propriedades públicas usam o tipo exato da classe (ex.: UITabela['colunas']);
 * atributos sem propriedade correspondente aceitam qualquer valor serializável.
 */
function propsDoComponente(c, nomeDaChave) {
  const propriedades = (c.members ?? []).filter((m) =>
    m.kind === 'field' && !m.static && !m.readonly && !m.name.startsWith('_') &&
    (m.privacy === undefined || m.privacy === 'public') && !PROPRIEDADES_IGNORADAS.has(m.name)
  );
  const nomesDePropriedade = new Set(propriedades.map((m) => m.name));
  const props = new Map();

  for (const atributo of c.attributes ?? []) {
    const propriedade = camel(atributo.name);
    const tipo = nomesDePropriedade.has(propriedade) ? `${c.name}['${propriedade}']` : 'ValorDeAtributo';
    props.set(nomeDaChave(atributo.name), tipo);
  }
  for (const m of propriedades) props.set(nomeDaChave(m.name), `${c.name}['${m.name}']`);
  return props;
}

function corpoDeProps(props, eventos) {
  return [
    ...[...props].map(([nome, tipo]) => `  ${chave(nome)}?: ${tipo};`),
    ...eventos.map(([nome]) => `  ${chave(nome)}?: (evento: CustomEvent) => void;`),
  ].join('\n');
}

function gerarTipos(componentes) {
  const classes = [...new Set(componentes.map((c) => c.name))].sort();
  const cabecalho = '/* Gerado por custom-elements-manifest.config.mjs a partir de custom-elements.json. Não edite. */\n';
  const importarClasses = `import type {\n  ${classes.join(',\n  ')}\n} from '${TIPOS_DAS_CLASSES}';`;

  // 1. Agnóstico de framework: props + eventos no formato `onui-evento` (React 19, Preact)
  const elementos = [
    cabecalho,
    importarClasses,
    '',
    '/** Atributos HTML aceitam texto, número ou booleano (presença). */',
    'export type ValorDeAtributo = string | number | boolean;\n',
    ...componentes.map((c) => {
      const eventos = eventosDoComponente(c).map((e) => [`on${e.name}`]);
      return `${descreverComponente(c)}\nexport interface Props${pascal(c.tagName)} {\n${corpoDeProps(propsDoComponente(c, (n) => n), eventos)}\n}\n`;
    }),
    '/** Mapa tag -> props, para registrar em qualquer JSX (React, Preact, Solid...). */',
    'export interface ElementosUI {',
    ...componentes.map((c) => `  '${c.tagName}': Props${pascal(c.tagName)};`),
    '}\n',
  ].join('\n');

  // 2. React 18.3+/19: atributos HTML padrão do React + props e eventos do componente
  const react = [
    cabecalho,
    "import type { DetailedHTMLProps, HTMLAttributes } from 'react';",
    importarClasses,
    "import type { ElementosUI } from './tipos-elementos';\n",
    '/** Props React de uma tag: atributos HTML do React + props e eventos do componente. */',
    'type PropsReact<Elemento extends HTMLElement, Props> =',
    '  Omit<DetailedHTMLProps<HTMLAttributes<Elemento>, Elemento>, keyof Props> & Props & { class?: string };\n',
    "declare module 'react' {",
    '  namespace JSX {',
    '    interface IntrinsicElements {',
    ...componentes.map((c) => `      '${c.tagName}': PropsReact<${c.name}, ElementosUI['${c.tagName}']>;`),
    '    }',
    '  }',
    '}\n',
    'export {};\n',
  ].join('\n');

  // 3. Vue 3: GlobalComponents com props em camelCase e eventos onUiEvento (como `@ui-evento` compila)
  const vue = [
    cabecalho,
    "import type { DefineComponent } from 'vue';",
    importarClasses,
    "import type { ValorDeAtributo } from './tipos-elementos';\n",
    ...componentes.map((c) => {
      const eventos = eventosDoComponente(c).map((e) => [`on${pascal(e.name)}`]);
      return `${descreverComponente(c)}\ntype PropsVue${pascal(c.tagName)} = {\n${corpoDeProps(propsDoComponente(c, camel), eventos)}\n};\n`;
    }),
    "declare module 'vue' {",
    '  interface GlobalComponents {',
    ...componentes.map((c) => `    '${c.tagName}': DefineComponent<PropsVue${pascal(c.tagName)}>;`),
    '  }',
    '}\n',
    'export {};\n',
  ].join('\n');

  fs.mkdirSync(SAIDA, { recursive: true });
  fs.writeFileSync(path.join(SAIDA, 'tipos-elementos.d.ts'), elementos);
  fs.writeFileSync(path.join(SAIDA, 'tipos-react.d.ts'), react);
  fs.writeFileSync(path.join(SAIDA, 'tipos-vue.d.ts'), vue);
}

function tiposParaFrameworks() {
  return {
    name: 'ui-kit:tipos-frameworks',
    packageLinkPhase({ customElementsManifest }) {
      const componentes = customElementsManifest.modules
        .flatMap((m) => m.declarations ?? [])
        .filter((d) => d.kind === 'class' && d.tagName)
        .sort((a, b) => a.tagName.localeCompare(b.tagName));
      gerarTipos(componentes);
    },
  };
}

export default {
  globs: ['src/components/**/*.ts', 'src/core/*.ts'],
  exclude: ['src/**/*.test.ts'],
  outdir: SAIDA,
  plugins: [convencoesDoKit(), tiposParaFrameworks()],
};
