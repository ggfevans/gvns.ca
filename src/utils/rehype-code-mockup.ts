import type { ShikiTransformer } from 'shiki';
import type { Element, ElementContent } from 'hast';
import { h } from 'hastscript';
import { toString } from 'hast-util-to-string';

const TERMINAL_LANGS = new Set(['bash', 'sh', 'zsh', 'shell', 'console', 'terminal']);

function makeCopyIcon(): Element {
  return h('svg', {
    class: 'icon-copy',
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }, [
    h('rect', { x: 9, y: 9, width: 13, height: 13, rx: 2, ry: 2 }),
    h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }),
  ]) as Element;
}

function makeCheckIcon(): Element {
  return h('svg', {
    class: 'icon-check',
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }, [
    h('polyline', { points: '20 6 9 17 4 12' }),
  ]) as Element;
}

export function codeMockupTransformer(): ShikiTransformer {
  return {
    name: 'gvns-code-mockup',
    root(root) {
      // The root contains a single <pre> element from Shiki
      const preNode = root.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'pre'
      );
      if (!preNode) return;

      // Extract language from data-language attribute
      const lang = (preNode.properties?.dataLanguage as string) || 'plaintext';
      const isTerminal = TERMINAL_LANGS.has(lang);

      // Extract raw text for copy button
      const rawCode = toString(preNode);

      // Skip empty code blocks
      if (!rawCode.trim()) return;

      // Count lines
      const lines = rawCode.split('\n');
      if (lines.length > 1 && lines[lines.length - 1] === '') {
        lines.pop();
      }
      const lineCount = lines.length;

      // Build line number / prompt elements
      const lineElements: Element[] = [];
      for (let i = 1; i <= lineCount; i++) {
        lineElements.push(
          h('span', isTerminal ? '$' : String(i)) as Element
        );
      }

      const linesClass = isTerminal
        ? 'gvns-code-mockup__lines gvns-code-mockup__lines--terminal'
        : 'gvns-code-mockup__lines';

      // Build the wrapper structure
      const wrapper = h('div', {
        class: `gvns-code-mockup${isTerminal ? ' gvns-code-mockup--terminal' : ''}`,
        dataLanguage: lang,
      }, [
        h('div', { class: 'gvns-code-mockup__header' }, [
          h('div', { class: 'gvns-code-mockup__dots' }, [
            h('span'),
            h('span'),
            h('span'),
          ]),
          h('span', { class: 'gvns-code-mockup__lang' }, lang),
          h('button', {
            class: 'gvns-code-mockup__copy',
            dataCode: rawCode,
            ariaLabel: 'Copy code',
            type: 'button',
          }, [
            makeCopyIcon(),
            makeCheckIcon(),
          ]),
        ]),
        h('div', { class: 'gvns-code-mockup__body' }, [
          h('div', {
            class: linesClass,
            ariaHidden: 'true',
          }, lineElements),
          preNode,
        ]),
      ]) as Element;

      // Replace root children with our wrapper
      root.children = [wrapper as ElementContent];
    },
  };
}
