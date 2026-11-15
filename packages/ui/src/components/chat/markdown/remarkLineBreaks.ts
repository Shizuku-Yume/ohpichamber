import type { Root, RootContent } from 'mdast';

const lineEnding = /\r\n|\r|\n/;

/**
 * Turns a newline inside prose into a visible break, as `remark-breaks` does,
 * so reasoning text keeps one line per thought. Code, HTML and math are literal
 * nodes rather than text, so fenced blocks, inline code and authored markup keep
 * their own line endings; phrasing nested in a paragraph (emphasis, links)
 * splits the same way a paragraph does.
 */
export function remarkLineBreaks() {
  return (tree: Root) => {
    splitText(tree);
  };
}

function splitText(node: Root | RootContent): void {
  if (!('children' in node)) return;
  const children: RootContent[] = node.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.type !== 'text') {
      splitText(child);
      continue;
    }
    const lines = child.value.split(lineEnding);
    if (lines.length === 1) continue;
    const replacement: RootContent[] = [];
    for (const [index, line] of lines.entries()) {
      if (index > 0) replacement.push({ type: 'break' });
      if (line.length > 0) replacement.push({ type: 'text', value: line });
    }
    children.splice(i, 1, ...replacement);
    i += replacement.length - 1;
  }
}
