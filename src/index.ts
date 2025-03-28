/**
 * @module index
 */

import { TokenType } from './enum';
import { CSI_RE, OSC_RE, OSC_ST_RE } from './regexp';
import { COLORS256_FIXED, getThemeColor, toUint8 } from './utils';
import { AnsiBlock, AnsiColor, AnsiStyle, AnsiToken, BlockToken, Theme } from './interface';

export type { AnsiBlock, AnsiColor, AnsiStyle, Theme };

export class Ansi {
  #buffer = '';

  #style: AnsiStyle = {
    dim: false,
    bold: false,
    color: null,
    blink: false,
    hidden: false,
    italic: false,
    inverse: false,
    overline: false,
    background: null,
    underline: false,
    strikethrough: false
  };

  #colors16: AnsiColor[];
  #colors256: AnsiColor[];

  /**
   * @public
   * @constructor
   * @description Constructor for the Ansi class.
   * @param theme The theme object containing color values.
   */
  constructor(theme: Theme = {}) {
    // Colors 16 bit
    // https://gist.github.com/jasonm23/2868981
    const colors16: AnsiColor[] = [
      // Black
      getThemeColor([0, 0, 0], theme.black),
      // Red
      getThemeColor([128, 0, 0], theme.red),
      // Green
      getThemeColor([0, 128, 0], theme.green),
      // Yellow
      getThemeColor([128, 128, 0], theme.yellow),
      // Blue
      getThemeColor([0, 0, 128], theme.blue),
      // Magenta
      getThemeColor([128, 0, 128], theme.magenta),
      // Cyan
      getThemeColor([0, 128, 128], theme.cyan),
      // White
      getThemeColor([192, 192, 192], theme.white),
      // Bright Black
      getThemeColor([128, 128, 128], theme.brightBlack),
      // Bright Red
      getThemeColor([255, 0, 0], theme.brightRed),
      // Bright Green
      getThemeColor([0, 255, 0], theme.brightGreen),
      // Bright Yellow
      getThemeColor([255, 255, 0], theme.brightYellow),
      // Bright Blue
      getThemeColor([0, 0, 255], theme.brightBlue),
      // Bright Magenta
      getThemeColor([255, 0, 255], theme.brightMagenta),
      // Bright Cyan
      getThemeColor([0, 255, 255], theme.brightCyan),
      // Bright White
      getThemeColor([255, 255, 255], theme.brightWhite)
    ];

    // User defined colors 256 bit
    const themeColors256 = theme.colors256 ?? [];

    // Colors 256 bit
    const colors256: AnsiColor[] = [
      // Index 0..15 : Ansi-Colors
      ...colors16,
      // Index 16..255 : Ansi-Colors
      ...COLORS256_FIXED
    ].map((color, index) => {
      return getThemeColor(color, themeColors256[index]);
    });

    // Init ANSI colors
    this.#colors16 = colors16;
    this.#colors256 = colors256;
  }

  /**
   * @private
   * @description Read the next ANSI token from the buffer.
   * @returns The next ANSI token.
   */
  #read(): AnsiToken {
    const buffer = this.#buffer;
    const { length } = buffer;

    // Nothing in buffer
    if (length === 0) {
      return {
        type: TokenType.EOS
      };
    }

    // Find ESC
    const pos = buffer.indexOf('\x1B');

    // The most common case, no ESC codes
    if (pos < 0) {
      this.#buffer = '';

      return {
        value: buffer,
        type: TokenType.TEXT
      };
    }

    if (pos > 0) {
      this.#buffer = buffer.slice(pos);

      return {
        type: TokenType.TEXT,
        value: buffer.slice(0, pos)
      };
    }

    // All of the sequences typically need at least 3 characters
    // So, wait until we have at least that many
    if (length < 3) {
      return {
        type: TokenType.INCESC
      };
    }

    const peek = buffer.charAt(1);

    // We treat this as a single ESC
    // Which effecitvely shows
    if (peek !== '[' && peek !== ']' && peek !== '(') {
      this.#buffer = buffer.slice(1);

      // DeMorgan
      return {
        type: TokenType.ESC
      };
    }

    // OK is this an SGR or OSC that we handle
    // SGR CHECK
    if (peek === '[') {
      // We do this regex initialization here so
      // we can keep the regex close to its use (Readability)
      // All ansi codes are typically in the following format.
      // We parse it and focus specifically on the
      // graphics commands (SGR)
      //
      // CONTROL-SEQUENCE-INTRODUCER CSI             (ESC, '[')
      // PRIVATE-MODE-CHAR                           (!, <, >, ?)
      // Numeric parameters separated by semicolons  ('0' - '9', ';')
      // Intermediate-modifiers                      (0x20 - 0x2f)
      // COMMAND-CHAR                                (0x40 - 0x7e)
      const match = buffer.match(CSI_RE);

      // This match is guaranteed to terminate (even on
      // invalid input). The key is to match on legal and
      // illegal sequences.
      // The first alternate matches everything legal and
      // the second matches everything illegal.
      //
      // If it doesn't match, then we have not received
      // either the full sequence or an illegal sequence.
      // If it does match, the presence of field 4 tells
      // us whether it was legal or illegal.
      if (match === null) {
        return {
          type: TokenType.INCESC
        };
      }

      // match is an array
      // 0 - total match
      // 1 - private mode chars group
      // 2 - digits and semicolons group
      // 3 - command
      // 4 - illegal char
      if (match[4]) {
        this.#buffer = buffer.slice(1);

        // Illegal sequence, just remove the ESC
        return {
          type: TokenType.ESC
        };
      }

      this.#buffer = buffer.slice(match[0].length);

      // If not a valid SGR, we don't handle
      if (match[1] !== '' || match[3] !== 'm') {
        return {
          type: TokenType.UNKNOWN
        };
      }

      return {
        signal: match[2],
        type: TokenType.SGR
      };
    }

    // OSC CHECK
    if (peek === ']') {
      if (length < 4) {
        return {
          type: TokenType.INCESC
        };
      }

      if (buffer.charAt(2) !== '8' || buffer.charAt(3) !== ';') {
        this.#buffer = buffer.slice(1);

        // This is not a match, so we'll just treat it as ESC
        return {
          type: TokenType.ESC
        };
      }

      // We do this regex initialization here so
      // we can keep the regex close to its use (Readability)

      // Matching a Hyperlink OSC with a regex is difficult
      // because Javascript's regex engine doesn't support
      // 'partial match' support.
      //
      // Therefore, we require the system to match the
      // string-terminator(ST) before attempting a match.
      // Once we find it, we attempt the Hyperlink-Begin
      // match.
      // If that goes ok, we scan forward for the next
      // ST.
      // Finally, we try to match it all and return
      // the sequence.
      // Also, it is important to note that we consider
      // certain control characters as an invalidation of
      // the entire sequence.

      // We do regex initializations here so
      // we can keep the regex close to its use (Readability)

      // STRING-TERMINATOR
      // This is likely to terminate in most scenarios
      // because it will terminate on a newline

      // VERY IMPORTANT
      // We do a stateful regex match with exec.
      // If the regex is global, and it used with 'exec',
      // then it will search starting at the 'lastIndex'
      // If it matches, the regex can be used again to
      // find the next match.
      OSC_ST_RE.lastIndex = 0;

      // We might have the prefix and URI
      // Lets start our search for the ST twice
      for (let count = 0; count < 2; count++) {
        const match = OSC_ST_RE.exec(buffer);

        if (match === null) {
          return {
            type: TokenType.INCESC
          };
        }

        // If an illegal character was found, bail on the match
        if (match[3]) {
          this.#buffer = buffer.slice(1);

          // Illegal sequence, just remove the ESC
          return {
            type: TokenType.ESC
          };
        }
      }

      // OK, at this point we should have a FULL match!
      // Lets try to match that now
      const match = buffer.match(OSC_RE);

      if (match === null) {
        this.#buffer = buffer.slice(1);

        // Illegal sequence, just remove the ESC
        return {
          type: TokenType.ESC
        };
      }

      this.#buffer = buffer.slice(match[0].length);

      // If a valid SGR
      // match is an array
      // 0 - total match
      // 1 - URL
      // 2 - Text
      return {
        url: match[1],
        value: match[2],
        type: TokenType.OSC
      };
    }

    return {
      type: TokenType.EOS
    };
  }

  /**
   * @private
   * @description Resets the style properties of the element.
   */
  #reset(): void {
    const style = this.#style;

    style.dim = false;
    style.bold = false;
    style.color = null;
    style.blink = false;
    style.hidden = false;
    style.italic = false;
    style.inverse = false;
    style.background = null;
    style.underline = false;
    style.strikethrough = false;
  }

  /**
   * @private
   * @description Process the given signal and update the style accordingly.
   * @param signal The signal to process.
   */
  #process(signal: string): void {
    let index = 0;

    // ANSI style and colors
    const style = this.#style;
    const colors16 = this.#colors16;
    const colors256 = this.#colors256;

    // Ok - we have a valid "SGR" (Select Graphic Rendition)
    const sequences = signal.split(';');
    const maxIndex = sequences.length - 1;

    // Read cmd by index
    const read = () => parseInt(sequences[index++], 10);

    // Each of these params affects the SGR state
    // Why do we shift through the array instead of a forEach??
    // ... because some commands consume the params that follow !
    for (; index <= maxIndex; index++) {
      const code = read();

      switch (code) {
        case 0:
          this.#reset();
          break;
        case 1:
          style.bold = true;
          break;
        case 2:
          style.dim = true;
          break;
        case 3:
          style.italic = true;
          break;
        case 4:
          style.underline = true;
          break;
        case 5:
          style.blink = true;
          break;
        case 7:
          style.inverse = true;
          break;
        case 8:
          style.hidden = true;
          break;
        case 9:
          style.strikethrough = true;
          break;
        case 21:
          style.bold = false;
          break;
        case 22:
          style.dim = false;
          style.bold = false;
          break;
        case 23:
          style.italic = false;
          break;
        case 24:
          style.underline = false;
          break;
        case 25:
          style.blink = false;
          break;
        case 27:
          style.inverse = false;
          break;
        case 28:
          style.hidden = false;
          break;
        case 29:
          style.strikethrough = false;
          break;
        case 38:
        case 48:
          // Extended set foreground/background color
          // validate that param exists
          if (index < maxIndex) {
            const mode = read();

            // Extend color (38=fg, 48=bg)
            const isForeground = code === 38;

            switch (mode) {
              // MODE 2 - True Color
              case 2:
                if (index + 2 <= maxIndex) {
                  const r = toUint8(read());
                  const g = toUint8(read());
                  const b = toUint8(read());

                  // True Color
                  const color: AnsiColor = [r, g, b];

                  if (isForeground) {
                    style.color = color;
                  } else {
                    style.background = color;
                  }
                }
                break;
              // MODE 5 - 256 color palette
              case 5:
                // Extended set foreground/background color
                // validate that param exists
                if (index <= maxIndex) {
                  const index = toUint8(read());

                  if (isForeground) {
                    style.color = colors256[index];
                  } else {
                    style.background = colors256[index];
                  }
                }
                break;
            }
          }
          break;
        case 39:
          style.color = null;
          break;
        case 49:
          style.background = null;
          break;
        case 53:
          style.overline = true;
          break;
        case 55:
          style.overline = false;
          break;
        default:
          if (code >= 30 && code < 38) {
            // The color index offset starts at 0: code - 30 + 0
            style.color = colors16[code - 30];
          } else if (code >= 40 && code < 48) {
            // The color index offset starts at 0: code - 40 + 0
            style.background = colors16[code - 40];
          } else if (code >= 90 && code < 98) {
            // The bright color index offset starts at 8: code - 90 + 8
            style.color = colors16[code - 82];
          } else if (code >= 100 && code < 108) {
            // The bright color index offset starts at 8: code - 100 + 8
            style.background = colors16[code - 92];
          }
          break;
      }
    }
  }

  /**
   * @private
   * @description Creates an AnsiBlock object based on the given BlockToken.
   * @param token The BlockToken to create the AnsiBlock from.
   * @returns The created AnsiBlock.
   */
  #block(token: BlockToken): AnsiBlock {
    const block: AnsiBlock = {
      value: token.value,
      style: { ...this.#style }
    };

    if ('url' in token) {
      block.url = token.url;
    }

    return block;
  }

  /**
   * @public
   * @description Writes the given text to the buffer and processes it.
   * @param text The text to be written.
   * @param callback The callback function to be called for each processed AnsiBlock.
   */
  public write(text: string, callback: (block: AnsiBlock) => void): void {
    this.#buffer += text;

    while (this.#buffer) {
      const token = this.#read();

      switch (token.type) {
        case TokenType.EOS:
        case TokenType.INCESC:
          break;
        case TokenType.ESC:
        case TokenType.UNKNOWN:
          continue;
        case TokenType.SGR:
          this.#process(token.signal);
          continue;
        case TokenType.OSC:
        case TokenType.TEXT:
          callback(this.#block(token));
          continue;
        default:
          continue;
      }
    }
  }

  /**
   * @public
   * @description Flushes the buffer and invokes the callback with the flushed block.
   * @param callback - The callback function to invoke with the flushed block.
   */
  public flush(callback: (block: AnsiBlock) => void): void {
    const buffer = this.#buffer;

    // Get flush block
    if (buffer !== '') {
      callback(
        this.#block({
          value: buffer,
          type: TokenType.TEXT
        })
      );
    }

    // Reset
    this.#reset();

    // Flush buffer
    this.#buffer = '';
  }
}
