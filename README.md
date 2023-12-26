# ansi

<!-- prettier-ignore -->
> A pure JavaScript ANSI parser library.
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
import { parse } from '@nuintun/ansi';
```

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
