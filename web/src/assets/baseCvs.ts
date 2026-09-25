/**
 * The public page ships the blank template and shared.css only.
 * A visitor's own CV stays in that browser's localStorage.
 *
 * `?raw` is Vite's built-in "give me the file's text, don't parse it"
 * import suffix (typed by the "vite/client" entry already in
 * tsconfig.app.json's `types`). It is required here, not a style choice:
 * a bare import of an .html file would have Vite try to process it as an
 * entry HTML document, and shared.css in particular must never be
 * imported any other way (see the comment in ../../vite.config.ts) since
 * it carries a bare `* { margin: 0 }` reset that would leak into this
 * app's own styling.
 */
import blankCvHtml from '@assets/cv_template.html?raw';
import sharedCss from '@assets/shared.css?raw';

export const BLANK_CV_HTML = blankCvHtml;

export { sharedCss };
