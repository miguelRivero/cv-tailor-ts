/**
 * Base CV choices offered by BaseCvSelector.
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
import defaultCvHtml from '@assets/MR_cv_base.html?raw';
import blankCvHtml from '@assets/cv_template.html?raw';
import sharedCss from '@assets/shared.css?raw';

export interface BaseCvOption {
  id: 'default' | 'blank';
  label: string;
  html: string;
}

export const BASE_CV_OPTIONS: BaseCvOption[] = [
  { id: 'default', label: 'Default CV (Miguel Rivero López)', html: defaultCvHtml },
  { id: 'blank', label: 'Blank template', html: blankCvHtml },
];

export { sharedCss };
