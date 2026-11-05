const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const ALLOWED_TAGS: Record<string, true> = {
  svg: true,
  g: true,
  path: true,
  rect: true,
  circle: true,
  ellipse: true,
  line: true,
  polyline: true,
  polygon: true,
  text: true,
  tspan: true,
  defs: true,
  lineargradient: true,
  radialgradient: true,
  stop: true,
  clippath: true,
  mask: true,
  pattern: true,
  marker: true,
  symbol: true,
  use: true,
  title: true,
  desc: true,
};

const ALLOWED_ATTRS: Record<string, true> = {
  id: true,
  viewbox: true,
  width: true,
  height: true,
  x: true,
  y: true,
  x1: true,
  y1: true,
  x2: true,
  y2: true,
  cx: true,
  cy: true,
  r: true,
  rx: true,
  ry: true,
  d: true,
  points: true,
  dx: true,
  dy: true,
  fill: true,
  'fill-opacity': true,
  'fill-rule': true,
  stroke: true,
  'stroke-width': true,
  'stroke-linecap': true,
  'stroke-linejoin': true,
  'stroke-miterlimit': true,
  'stroke-dasharray': true,
  'stroke-dashoffset': true,
  'stroke-opacity': true,
  transform: true,
  'transform-origin': true,
  opacity: true,
  color: true,
  'font-family': true,
  'font-size': true,
  'font-weight': true,
  'font-style': true,
  'text-anchor': true,
  'dominant-baseline': true,
  'clip-path': true,
  'clip-rule': true,
  mask: true,
  filter: true,
  gradientunits: true,
  gradienttransform: true,
  spreadmethod: true,
  offset: true,
  'stop-color': true,
  'stop-opacity': true,
  patternunits: true,
  patterncontentunits: true,
  patterntransform: true,
  markerwidth: true,
  markerheight: true,
  markerunits: true,
  orient: true,
  refx: true,
  refy: true,
  preserveaspectratio: true,
  xmlns: true,
  role: true,
  'aria-label': true,
  'aria-hidden': true,
  href: true,
  'xlink:href': true,
};

const SAFE_LOCAL_URL_RE = /^url\(\s*['"]?#([a-zA-Z0-9_-]+)['"]?\s*\)$/i;

export function sanitizeSvg(source: string, idPrefix: string): { svg: string | null; error?: string } {
  const trimmed = source.trim();
  if (!trimmed) {
    return { svg: null, error: 'Empty SVG content' };
  }
  if (!/<svg[\s/>]/i.test(trimmed)) {
    return { svg: null, error: 'No <svg> root element found' };
  }

  // Fail closed when DOMParser is unavailable (no unsafe regex fallback)
  if (typeof DOMParser === 'undefined') {
    return { svg: null, error: 'DOMParser is unavailable in this environment' };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'image/svg+xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return { svg: null, error: 'Malformed SVG XML' };
    }

    const root = doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== 'svg' || root.namespaceURI !== SVG_NAMESPACE) {
      return { svg: null, error: 'Root is not an <svg> element in SVG namespace' };
    }

    // 1. Tag & Namespace Allowlist: remove any tag not strictly allowlisted or not in SVG namespace
    const allDescendants = Array.from(root.querySelectorAll('*'));
    for (const el of allDescendants) {
      const tag = el.localName?.toLowerCase() ?? el.tagName.toLowerCase();
      if (el.namespaceURI !== SVG_NAMESPACE || !ALLOWED_TAGS[tag]) {
        el.remove();
      }
    }

    // 2. Discover ALL defined local IDs in this document
    const definedIds = new Set<string>();
    const elementsWithId: Element[] = [];
    if (root.hasAttribute('id')) {
      elementsWithId.push(root);
    }
    for (const el of Array.from(root.querySelectorAll('[id]'))) {
      elementsWithId.push(el);
    }
    for (const el of elementsWithId) {
      const idVal = el.getAttribute('id')?.trim();
      if (idVal && !idVal.startsWith(`${idPrefix}-`)) {
        definedIds.add(idVal);
      }
    }

    // Map each defined ID to a unique scoped ID
    const idMap = new Map<string, string>();
    for (const idVal of definedIds) {
      idMap.set(idVal, `${idPrefix}-${idVal}`);
    }

    // Scope all defined IDs on their elements
    for (const el of elementsWithId) {
      const idVal = el.getAttribute('id')?.trim();
      if (idVal) {
        const scoped = idMap.get(idVal);
        if (scoped) {
          el.setAttribute('id', scoped);
        } else {
          el.removeAttribute('id');
        }
      }
    }

    // 3. Attribute Allowlist & Strict URL sanitization
    const remainingNodes = [root, ...Array.from(root.querySelectorAll('*'))];
    for (const el of remainingNodes) {
      const toRemove: string[] = [];
      const toSet: Array<{ name: string; value: string }> = [];

      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (!attr) continue;
        const attrName = attr.name.toLowerCase();
        const attrValue = attr.value.trim();

        // Reject any attribute starting with 'on' or not in allowlist
        if (attrName.startsWith('on') || !ALLOWED_ATTRS[attrName]) {
          toRemove.push(attr.name);
          continue;
        }

        // Reject javascript: anywhere
        if (/javascript:/i.test(attrValue.replace(/\s+/g, ''))) {
          toRemove.push(attr.name);
          continue;
        }

        // href / xlink:href: ONLY permitted on <use> pointing to an existing local ID
        if (attrName === 'href' || attrName === 'xlink:href') {
          if (el.tagName.toLowerCase() !== 'use') {
            toRemove.push(attr.name);
            continue;
          }
          if (attrValue.startsWith('#')) {
            const rawRef = attrValue.slice(1);
            const mapped = idMap.get(rawRef);
            if (mapped) {
              toSet.push({ name: attr.name, value: `#${mapped}` });
            } else {
              // Unreferenced/external fragment: strip it
              toRemove.push(attr.name);
            }
          } else {
            toRemove.push(attr.name);
          }
          continue;
        }

        // Presentation attributes capable of holding URLs
        const isUrlCapableAttr = attrName === 'fill' || attrName === 'stroke' || attrName === 'filter' || attrName === 'clip-path' || attrName === 'mask' || attrName.startsWith('marker');
        if (isUrlCapableAttr) {
          // Reject backslash escapes or CSS comments that evade simple matching
          if (attrValue.includes('\\') || attrValue.includes('/*')) {
            toRemove.push(attr.name);
            continue;
          }
          // If it references a url, enforce strict local defined ID format
          if (/url/i.test(attrValue)) {
            const match = SAFE_LOCAL_URL_RE.exec(attrValue);
            if (match) {
              const targetId = match[1]!;
              const mapped = idMap.get(targetId);
              if (mapped) {
                toSet.push({ name: attr.name, value: `url(#${mapped})` });
              } else {
                toRemove.push(attr.name);
              }
            } else {
              toRemove.push(attr.name);
            }
            continue;
          }
        }
      }

      for (const name of toRemove) {
        el.removeAttribute(name);
      }
      for (const { name, value } of toSet) {
        el.setAttribute(name, value);
      }
    }

    // Ensure valid SVG namespace
    root.setAttribute('xmlns', SVG_NAMESPACE);

    const serializer = new XMLSerializer();
    return { svg: serializer.serializeToString(root) };
  } catch (e) {
    return { svg: null, error: e instanceof Error ? e.message : 'SVG parsing failed' };
  }
}
