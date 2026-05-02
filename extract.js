const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { optimize } = require('svgo');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'assets', 'draw');
const HTML_FILE = path.join(ROOT, 'index.html');
const CSS_FILE = path.join(ROOT, 'styles.css');
const JS_FILE = path.join(ROOT, 'mascot.js');
const SVG_NS = 'http://www.w3.org/2000/svg';
const INK = '#1c1612';

const html = fs.readFileSync(HTML_FILE, 'utf8');
const css = fs.readFileSync(CSS_FILE, 'utf8');
const mascotJs = fs.readFileSync(JS_FILE, 'utf8');

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const dom = new JSDOM(html, {
  pretendToBeVisual: true,
  runScripts: 'outside-only',
  url: 'http://localhost/',
});

const { document, NodeFilter } = dom.window;
const styleElement = document.createElement('style');
styleElement.textContent = css;
document.head.append(styleElement);

// Browser APIs used by mascot.js but not needed for export.
dom.window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
dom.window.requestAnimationFrame = () => 0;
dom.window.cancelAnimationFrame = () => {};
Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'getContext', {
  value: () => null,
});

try {
  dom.window.eval(mascotJs);
  dom.window.openPortal?.({ quick: true });
} catch (error) {
  console.warn('Dynamic SVG generation had a recoverable problem:', error.message);
}

const presentationAttributes = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'fill-rule',
  'clip-rule',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
];

const unsupportedElements = [
  'desc',
  'defs',
  'filter',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDropShadow',
  'feFlood',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMorphology',
  'feOffset',
  'feSpecularLighting',
  'feTile',
  'feTurbulence',
  'linearGradient',
  'radialGradient',
  'marker',
  'mask',
  'pattern',
  'style',
  'symbol',
  'title',
];

const unsupportedAttributes = [
  'aria-hidden',
  'aria-label',
  'aria-labelledby',
  'class',
  'clip-path',
  'data-character',
  'filter',
  'focusable',
  'id',
  'marker-end',
  'marker-mid',
  'marker-start',
  'role',
  'style',
  'tabindex',
];

function toKebab(propertyName) {
  return propertyName.replaceAll(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function getComputed(element, attribute) {
  try {
    const styles = dom.window.getComputedStyle(element);
    return styles.getPropertyValue(attribute) || styles[toKebab(attribute)] || '';
  } catch {
    return '';
  }
}

function resolveCustomProperty(element, name) {
  let cursor = element;
  while (cursor) {
    if (cursor.nodeType === 1) {
      const value = dom.window.getComputedStyle(cursor).getPropertyValue(name).trim();
      if (value) return value;
    }
    cursor = cursor.parentElement;
  }
  return dom.window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function parseColor(value) {
  const trimmed = value.trim();
  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let code = hex[1];
    if (code.length === 3) code = code.split('').map((char) => char + char).join('');
    return {
      r: Number.parseInt(code.slice(0, 2), 16),
      g: Number.parseInt(code.slice(2, 4), 16),
      b: Number.parseInt(code.slice(4, 6), 16),
    };
  }

  const rgb = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };

  if (trimmed === 'white') return { r: 255, g: 255, b: 255 };
  if (trimmed === 'black') return { r: 0, g: 0, b: 0 };
  if (trimmed === 'red') return { r: 255, g: 0, b: 0 };
  return null;
}

function toHex(channel) {
  return Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0');
}

function colorToHex(color) {
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function mixColors(first, firstPercent, second, secondPercent) {
  const total = firstPercent + secondPercent || 100;
  const a = firstPercent / total;
  const b = secondPercent / total;
  return colorToHex({
    r: first.r * a + second.r * b,
    g: first.g * a + second.g * b,
    b: first.b * a + second.b * b,
  });
}

function resolveColorMix(value) {
  const match = value.match(/^color-mix\(in srgb,\s*([^\s,]+)\s+([\d.]+)%?\s*,\s*([^\s,)]+)(?:\s+([\d.]+)%?)?\s*\)$/i);
  if (!match) return value;

  const first = parseColor(match[1]);
  const second = parseColor(match[3]);
  if (!first || !second) return value;

  const firstPercent = Number(match[2]);
  const secondPercent = match[4] ? Number(match[4]) : 100 - firstPercent;
  return mixColors(first, firstPercent, second, secondPercent);
}

function resolveValue(element, value, attributeName) {
  if (!value) return '';

  let resolved = value.trim();
  if (!resolved || resolved === 'initial' || resolved === 'inherit' || resolved === 'unset') return '';

  let safety = 0;
  while (resolved.includes('var(') && safety < 10) {
    resolved = resolved.replaceAll(/var\((--[^,\s)]+)(?:,\s*([^()]+))?\)/g, (_, name, fallback) => {
      const custom = resolveCustomProperty(element, name);
      return custom || fallback || '';
    });
    safety += 1;
  }

  if (resolved.includes('currentColor')) {
    const color = getComputed(element, 'color');
    const safeColor = color && color !== 'currentColor' ? resolveValue(element, color, 'color') || INK : INK;
    resolved = resolved.replaceAll('currentColor', safeColor);
  }

  if (/url\(/i.test(resolved)) {
    if (attributeName === 'fill') return 'rgba(28, 22, 18, 0.08)';
    return 'none';
  }

  return resolveColorMix(resolved).trim();
}

function isDrawable(node) {
  if (node.nodeType !== 1) return false;
  return ['circle', 'ellipse', 'g', 'line', 'path', 'polygon', 'polyline', 'rect', 'svg', 'text', 'tspan'].includes(node.tagName);
}

function shouldDefaultStroke(node) {
  return ['circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'rect'].includes(node.tagName);
}

function inlineChildStyles(sourceNode, clonedNode) {
  const sourceChildren = Array.from(sourceNode.children || []);
  const clonedChildren = Array.from(clonedNode.children || []);
  sourceChildren.forEach((child, index) => inlineStyles(child, clonedChildren[index]));
}

function setResolvedPresentationAttribute(sourceNode, clonedNode, attribute) {
    const authoredValue = sourceNode.getAttribute(attribute);
    const computedValue = getComputed(sourceNode, attribute);
    const candidate = authoredValue || computedValue;
    const resolved = resolveValue(sourceNode, candidate, attribute);

    if (!resolved) return;
    if (['fill', 'stroke'].includes(attribute) && /^(normal|auto)$/i.test(resolved)) return;
    if (attribute === 'stroke-dasharray' && resolved === 'none') return;

    const value = attribute === 'font-family' ? resolved.replaceAll('"', "'") : resolved;
    clonedNode.setAttribute(attribute, value);
}

function applyTextFallback(clonedNode) {
  if (!clonedNode.hasAttribute('fill')) clonedNode.setAttribute('fill', INK);
  clonedNode.removeAttribute('stroke');
}

function applyShapeFallback(sourceNode, clonedNode) {
  if (!shouldDefaultStroke(sourceNode) || clonedNode.hasAttribute('fill') || clonedNode.hasAttribute('stroke')) return;
  clonedNode.setAttribute('fill', 'none');
  clonedNode.setAttribute('stroke', INK);
  clonedNode.setAttribute('stroke-width', '2');
  clonedNode.setAttribute('stroke-linecap', 'round');
  clonedNode.setAttribute('stroke-linejoin', 'round');
}

function inlineStyles(sourceNode, clonedNode) {
  if (!isDrawable(sourceNode) || !clonedNode) return;

  if (sourceNode.tagName === 'svg' || sourceNode.tagName === 'g') {
    if (sourceNode.hasAttribute('opacity')) clonedNode.setAttribute('opacity', sourceNode.getAttribute('opacity'));
    inlineChildStyles(sourceNode, clonedNode);
    return;
  }

  presentationAttributes.forEach((attribute) => setResolvedPresentationAttribute(sourceNode, clonedNode, attribute));

  if (sourceNode.hasAttribute('opacity')) {
    clonedNode.setAttribute('opacity', sourceNode.getAttribute('opacity'));
  }

  if (sourceNode.tagName === 'text' || sourceNode.tagName === 'tspan') {
    applyTextFallback(clonedNode);
  } else {
    applyShapeFallback(sourceNode, clonedNode);
  }

  inlineChildStyles(sourceNode, clonedNode);
}

function cleanNode(root) {
  unsupportedElements.forEach((tagName) => {
    root.querySelectorAll(tagName).forEach((node) => node.remove());
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const nodes = [root];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    unsupportedAttributes.forEach((attribute) => node.removeAttribute(attribute));
    Array.from(node.attributes || []).forEach((attribute) => {
      if (attribute.name.startsWith('on') || attribute.name.startsWith('data-')) node.removeAttribute(attribute.name);
      if (/url\(#/.test(attribute.value)) node.removeAttribute(attribute.name);
      if (/var\(/.test(attribute.value)) node.removeAttribute(attribute.name);
    });
  });
}

function prepareMascot(svg) {
  const hiddenCuriousSelectors = [
    '.svg-cheek',
    '.svg-dizzy',
    '.svg-mouth.ajar',
    '.svg-mouth.open',
    '.svg-mouth-core',
    '.svg-mouth-shine',
    '.svg-mouth.flat',
    '.svg-mouth.grimace',
    '.svg-mouth.teeth',
    '.svg-mouth.ooh',
    '.svg-mouth.tremble',
    '.svg-mouth.smirk',
    '.svg-mouth.silly-open',
    '.svg-mouth.silly-tongue',
    '.svg-mouth.zip',
    '.svg-pupil-heart',
    '.svg-spark',
    '.svg-star',
    '.svg-sweat',
    '.svg-tear',
    '.svg-thought-bubble',
  ];
  hiddenCuriousSelectors.forEach((selector) => svg.querySelectorAll(selector).forEach((node) => node.remove()));
}

function wrapSource(source, viewBox) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', viewBox || source.getAttribute('viewBox') || '0 0 100 100');

  const cloned = source.cloneNode(true);
  if (source.tagName === 'svg') {
    inlineStyles(source, cloned);
    Array.from(cloned.childNodes).forEach((child) => svg.append(child));
  } else {
    inlineStyles(source, cloned);
    svg.append(cloned);
  }

  return svg;
}

function optimizeSvg(svg, name) {
  let data = svg.outerHTML;
  try {
    const result = optimize(data, {
      path: `${name}.svg`,
      multipass: true,
      plugins: [
        'removeDoctype',
        'removeXMLProcInst',
        'removeComments',
        'removeMetadata',
        'removeTitle',
        'removeDesc',
        'removeUselessDefs',
        'removeEditorsNSData',
        'removeEmptyAttrs',
        'removeHiddenElems',
        'removeEmptyText',
        'removeEmptyContainers',
        'cleanupEnableBackground',
        'convertColors',
        'convertPathData',
        'convertTransform',
        'cleanupNumericValues',
        'cleanupIds',
        'removeUnusedNS',
        'removeNonInheritableGroupAttrs',
        'moveElemsAttrsToGroup',
        'moveGroupAttrsToElems',
        'collapseGroups',
        'convertShapeToPath',
        'sortAttrs',
        'removeDimensions',
      ],
    });
    data = result.data;
  } catch (error) {
    console.warn(`SVGO skipped ${name}: ${error.message}`);
  }
  return data;
}

function saveSvg(source, name, viewBox, options = {}) {
  if (!source) return false;

  const svg = wrapSource(source, viewBox);
  if (options.prepare === 'mascot') prepareMascot(svg);
  cleanNode(svg);

  const data = optimizeSvg(svg, name);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.svg`), data, 'utf8');
  console.log(`✓ assets/draw/${name}.svg`);
  return true;
}

function query(selector, root = document) {
  return root.querySelector(selector);
}

function exportStaticGroups() {
  const sketchBg = query('.sketch-bg');
  if (!sketchBg) return;

  const groups = [
    ['.blueprint-drawing', 'background-blueprint', '0 0 470 380'],
    ['.perspective-drawing', 'background-perspective', '0 960 1440 380'],
    ['.grid-explosion', 'background-grid-explosion', '900 1420 560 430'],
    ['.micro-symbols', 'background-micro-symbols', '0 0 1440 2100'],
  ];

  groups.forEach(([selector, name, viewBox]) => saveSvg(query(selector, sketchBg), name, viewBox));
}

function exportStaticSvgElements() {
  saveSvg(query('.hero-underline'), 'hero-underline', '0 0 420 38');
  saveSvg(query('.click-arrow'), 'hero-click-arrow', '0 0 190 120');
  saveSvg(query('.portal-preview-sketch'), 'hero-portal-preview', '0 0 420 280');

  const powerNames = [
    'power-markdown',
    'power-drawing',
    'power-dashboard',
    'power-relational-data',
    'power-connected-apps',
    'power-collaboration',
  ];

  document.querySelectorAll('.power-illustration').forEach((svg, index) => {
    saveSvg(svg, powerNames[index] || `power-illustration-${index + 1}`, '0 0 180 140');
  });

  saveSvg(query('.workspace-illustration'), 'grid-workspace', '0 0 820 500');
}

function exportDynamicSvgElements() {
  saveSvg(query('.binocle__svg'), 'mascot-binocle-curious', '0 0 184 118', { prepare: 'mascot' });

  ['reader', 'student', 'chatter'].forEach((type) => {
    saveSvg(query(`[data-character="${type}"] svg`), `character-${type}`, '0 0 190 220');
  });

  saveSvg(query('.portal-note svg'), 'portal-login-arrow', '0 0 150 80');
  saveSvg(query('.night-desk'), 'portal-night-desk', '0 0 100 80');
  saveSvg(query('.portal-brand svg'), 'portal-brand-binocle', '0 0 88 42');

  const portalCardNames = ['portal-card-rules', 'portal-card-universe', 'portal-card-team'];
  document.querySelectorAll('.portal-card > svg').forEach((svg, index) => {
    saveSvg(svg, portalCardNames[index] || `portal-card-${index + 1}`, '0 0 120 90');
  });

  saveSvg(query('.portal__close svg'), 'portal-close-button', '0 0 54 54');
}

exportStaticGroups();
exportStaticSvgElements();
exportDynamicSvgElements();

dom.window.close();
console.log('Done. Exported clean Figma SVGs to assets/draw/.');
