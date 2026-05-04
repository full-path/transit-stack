/**
 * Greedy word-wrap for SVG text. Returns an array of lines that each fit
 * within maxWidth, using an estimated character width of fontPx * 0.7
 * (intentionally generous to account for uppercase glyphs and emoji).
 */
export function wrapText(text, maxWidth, fontPx) {
  const charW = fontPx * 0.7;
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? cur + " " + word : word;
    if (cur && test.length * charW > maxWidth) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
