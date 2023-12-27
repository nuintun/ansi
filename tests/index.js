import Ansi from '@nuintun/ansi';

function escapeHTML(text) {
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

function blockToHTML({ style, value, url }) {
  const styles = [];
  const textDecorations = [];

  if (style.dim) {
    styles.push(`opacity:0.5`);
  }

  if (style.bold) {
    styles.push(`font-weight:bold`);
  }

  if (style.italic) {
    styles.push(`font-style:italic`);
  }

  if (style.inverse) {
    styles.push(`filter:invert(1)`);
  }

  if (style.hidden) {
    styles.push(`visibility:hidden`);
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
    styles.push(`color:rgb(${color})`);
  }

  if (background) {
    styles.push(`background-color:rgb(${background})`);
  }

  if (textDecorations.length > 0) {
    styles.push(`text-decoration:${textDecorations.join(' ')}`);
  }

  const escapedValue = escapeHTML(value);
  const href = url ? JSON.stringify(new URL(url).toString()) : null;

  if (styles.length <= 0) {
    if (!href) {
      return escapedValue;
    }

    return `<a href=${href} target="_blank">${escapedValue}</a>`;
  }

  const inlineStyle = JSON.stringify(`${styles.join(';')};`);

  if (!href) {
    return `<span style=${inlineStyle}>${escapedValue}</span>`;
  }

  return `<a style=${inlineStyle} href=${href} target="_blank">${escapedValue}</a>`;
}

export function ansiToHTML(text, theme) {
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

const message = '[\u001b[38;2;92;157;255;1;4m@nuintun/ansi\u001b[0m]';

console.log(ansiToHTML(message));
