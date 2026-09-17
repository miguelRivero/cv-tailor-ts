/**
 * Pack a tailored CV into the file(s) the browser will download.
 *
 * Filenames go through generateOutputFilename/slugifyCandidate so a
 * download from the web app is byte-identical in name to what the CLI
 * writes. The `inlineCss` flag is the advanced-options switch: on means
 * one self-contained HTML file (what the CLI inlines only for PDF);
 * off means HTML plus a sibling shared.css, matching saveAdaptedCV.
 */

import { inlineStylesheet } from '../html/cvStructure.js';
import { generateOutputFilename, slugifyCandidate } from '../naming/filenames.js';

export interface DownloadFile {
  filename: string;
  contents: string;
  mimeType: string;
}

export function buildDownloadFiles(options: {
  html: string;
  css: string;
  jobTitle: string;
  candidateName: string;
  inlineCss: boolean;
}): DownloadFile[] {
  const candidateSlug = slugifyCandidate(options.candidateName);
  const htmlName = generateOutputFilename(options.jobTitle, candidateSlug, 'html');

  if (options.inlineCss) {
    return [
      {
        filename: htmlName,
        contents: inlineStylesheet(options.html, options.css),
        mimeType: 'text/html;charset=utf-8',
      },
    ];
  }

  return [
    {
      filename: htmlName,
      contents: options.html,
      mimeType: 'text/html;charset=utf-8',
    },
    {
      filename: 'shared.css',
      contents: options.css,
      mimeType: 'text/css;charset=utf-8',
    },
  ];
}
