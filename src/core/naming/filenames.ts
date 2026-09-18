/**
 * Naming helpers shared by the CLI, the web app and the worker, so that
 * a tailored CV gets the same filename and the same header title
 * regardless of which surface produced it.
 */

import slugify from 'slugify';

/**
 * Slugify the candidate's display name for use in filenames, e.g.
 * "Miguel Rivero López" -> "Miguel-Rivero-Lopez".
 */
export function slugifyCandidate(candidateName: string): string {
  return slugify(candidateName, {
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
}

/**
 * Turn a job-title slug (e.g. "senior-frontend-developer") back into a
 * human-readable header title (e.g. "Senior Frontend Developer").
 */
export function formatJobTitleForHeader(jobTitleSlug: string): string {
  return jobTitleSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Generate the output filename for a tailored CV.
 */
export function generateOutputFilename(
  jobTitle: string,
  candidateName: string = 'Miguel-Rivero-Lopez',
  extension: string = 'html'
): string {
  return `${candidateName}-${jobTitle}.${extension}`;
}
