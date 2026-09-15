/**
 * Extracts visible body text from a fetched job-offer page.
 *
 * Reproduces what src/node/parsers/parseOffer.ts does for the CLI
 * (cheerio: remove script/style, take $('body').text(), split into
 * trimmed non-empty lines) using HTMLRewriter instead of cheerio.
 * HTMLRewriter is Cloudflare's native streaming HTML parser: it costs
 * almost nothing against the Workers free plan's 10ms CPU budget,
 * whereas building a full cheerio DOM for a multi-megabyte job board
 * page can exceed that budget on its own before any real work happens.
 */

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'iframe', 'head', 'svg']);

export interface ExtractResult {
  text: string;
  truncated: boolean;
}

export async function extractVisibleText(
  response: Response,
  maxChars: number
): Promise<ExtractResult> {
  const chunks: string[] = [];
  let skipDepth = 0;
  let totalLen = 0;
  let truncated = false;

  const rewriter = new HTMLRewriter().on('*', {
    element(el) {
      if (!SKIP_TAGS.has(el.tagName)) {
        return;
      }
      skipDepth++;
      // onEndTag fires for the matching close tag even on a
      // conditionally-skipped element; it does not fire for a
      // self-closing/void element, but every tag in SKIP_TAGS is one
      // that always has a real end tag in HTML.
      el.onEndTag(() => {
        skipDepth = Math.max(0, skipDepth - 1);
      });
    },
    text(chunk) {
      if (truncated || skipDepth > 0) {
        return;
      }
      const value = chunk.text;
      if (!value) {
        return;
      }
      if (totalLen + value.length > maxChars) {
        chunks.push(value.slice(0, Math.max(0, maxChars - totalLen)));
        totalLen = maxChars;
        truncated = true;
        return;
      }
      chunks.push(value);
      totalLen += value.length;
    },
  });

  // transform() is lazy - nothing runs until the transformed body is
  // actually consumed. We only want the side effects above, not the
  // bytes, so arrayBuffer() just drives the rewriter to completion.
  await rewriter.transform(response).arrayBuffer();

  const lines = chunks
    .join('')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return { text: lines.join('\n'), truncated };
}
