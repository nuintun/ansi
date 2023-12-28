# ansi

<!-- prettier-ignore -->
> A pure JavaScript ANSI style parser library.
>
> [![NPM Version][npm-image]][npm-url]
> [![Download Status][download-image]][npm-url]
> [![Languages Status][languages-image]][github-url]
> [![Tree Shakeable][tree-shakeable-image]][bundle-phobia-url]
> [![Side Effect][side-effect-image]][bundle-phobia-url]
> [![License][license-image]][license-url]

### interface

```ts
export type AnsiColor = [
  // Red
  R: number,
  // Green
  G: number,
  // Blue
  B: number
];

export interface AnsiStyle {
  dim: boolean;
  bold: boolean;
  blink: boolean;
  hidden: boolean;
  italic: boolean;
  inverse: boolean;
  overline: boolean;
  underline: boolean;
  strikethrough: boolean;
  color: AnsiColor | null;
  background: AnsiColor | null;
}

export interface AnsiBlock {
  url?: string;
  value: string;
  style: AnsiStyle;
}

export interface Theme {
  red?: AnsiColor;
  blue?: AnsiColor;
  cyan?: AnsiColor;
  black?: AnsiColor;
  green?: AnsiColor;
  white?: AnsiColor;
  yellow?: AnsiColor;
  magenta?: AnsiColor;
  brightRed?: AnsiColor;
  brightBlue?: AnsiColor;
  brightCyan?: AnsiColor;
  brightBlack?: AnsiColor;
  brightGreen?: AnsiColor;
  brightWhite?: AnsiColor;
  brightYellow?: AnsiColor;
  brightMagenta?: AnsiColor;
}

export class Ansi {
  /**
   * @public
   * @constructor
   * @description Constructor for the Ansi class.
   * @param theme The theme object containing color values.
   */
  public constructor(theme?: Theme);

  /**
   * @public
   * @description Writes the given text to the buffer and processes it.
   * @param text The text to be written.
   * @param callback The callback function to be called for each processed AnsiBlock.
   */
  public write(text: string, callback: (block: AnsiBlock) => void): void;

  /**
   * @public
   * @description Flushes the buffer and invokes the callback with the flushed block.
   * @param callback - The callback function to invoke with the flushed block.
   */
  public flush(callback: (block: AnsiBlock) => void): void;
}
```

### Usage

```ts
import Ansi, { AnsiBlock, Theme } from '@nuintun/ansi';

function escapeHTML(text: string): string {
  return text.replace(/[&<>"']/gm, match => {
    switch (match) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#x27;';
      default:
        return match;
    }
  });
}

function blockToHTML({ style, value, url }: AnsiBlock): string {
  const styles: string[] = [];
  const textDecorations: string[] = [];

  if (style.dim) {
    styles.push(`opacity: 0.5`);
  }

  if (style.bold) {
    styles.push(`font-weight: bold`);
  }

  if (style.italic) {
    styles.push(`font-style: italic`);
  }

  if (style.inverse) {
    styles.push(`filter: invert(1)`);
  }

  if (style.hidden) {
    styles.push(`visibility: hidden`);
  }

  if (style.blink) {
    textDecorations.push('blink');
  }

  if (style.overline) {
    textDecorations.push('overline');
  }

  if (style.underline) {
    textDecorations.push('underline');
  }

  if (style.strikethrough) {
    textDecorations.push('line-through');
  }

  const { color, background } = style;

  if (color) {
    styles.push(`color: rgb(${color})`);
  }

  if (background) {
    styles.push(`background-color: rgb(${background})`);
  }

  if (textDecorations.length > 0) {
    styles.push(`text-decoration: ${textDecorations.join(' ')}`);
  }

  const escapedValue = escapeHTML(value);
  const href = url ? JSON.stringify(new URL(url).toString()) : null;

  if (styles.length <= 0) {
    if (!href) {
      return escapedValue;
    }

    return `<a href=${href} target="_blank">${escapedValue}</a>`;
  }

  const inlineStyle = JSON.stringify(`${styles.join('; ')};`);

  if (!href) {
    return `<span style=${inlineStyle}>${escapedValue}</span>`;
  }

  return `<a style=${inlineStyle} href=${href} target="_blank">${escapedValue}</a>`;
}

export function ansiToHTML(text: string, theme?: Theme): string {
  let html = '';

  const ansi = new Ansi(theme);

  ansi.write(text, block => {
    html += blockToHTML(block);
  });

  ansi.flush(block => {
    html += blockToHTML(block);
  });

  return html;
}
```

### References

> Optimized and modified by [drudru/ansi_up](https://github.com/drudru/ansi_up)

[npm-image]: https://img.shields.io/npm/v/@nuintun/ansi?style=flat-square
[npm-url]: https://www.npmjs.org/package/@nuintun/ansi
[download-image]: https://img.shields.io/npm/dm/@nuintun/ansi?style=flat-square
[languages-image]: https://img.shields.io/github/languages/top/nuintun/ansi?style=flat-square
[github-url]: https://github.com/nuintun/ansi
[tree-shakeable-image]: https://img.shields.io/badge/tree--shakeable-true-brightgreen?style=flat-square
[side-effect-image]: https://img.shields.io/badge/side--effect-free-brightgreen?style=flat-square
[bundle-phobia-url]: https://bundlephobia.com/result?p=@nuintun/ansi
[license-image]: https://img.shields.io/github/license/nuintun/ansi?style=flat-square
[license-url]: https://github.com/nuintun/ansi/blob/master/LICENSE
