/**
 * Canned stand-in for the Cloudflare Worker, used to build and click
 * through the whole UI (Phase 5 of the plan) before the worker was
 * wired. The live path is web/src/lib/api/client.ts, which keeps the
 * same two function signatures so this file can be swapped back in for
 * UI-only work without a worker.
 *
 * A handful of magic strings in the offer URL/text let every UI state
 * reachable from real traffic be reached here too, on demand:
 *
 *   URL host contains "linkedin"           -> login_wall fetch failure
 *   URL host contains "indeed" or "glassdoor" -> bot_check fetch failure
 *   URL host contains "empty-offer"        -> empty fetch failure
 *   URL does not parse as a URL at all     -> bad_scheme fetch failure
 *   offer text contains "trigger-ratelimit" -> a retryable `error` event
 *   offer text contains "trigger-warning"   -> adapted HTML missing
 *                                              <link rel="stylesheet">,
 *                                              so post-processing reports
 *                                              a structure warning
 */
import type {
  FetchOfferResponse,
  OfferUnreadableReason,
  ServerEvent,
  TailorRequest,
} from '@core/types/api';
import type { Keywords } from '@core/types/keywords';

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

const UNREADABLE_HOSTS: Record<string, OfferUnreadableReason> = {
  linkedin: 'login_wall',
  indeed: 'bot_check',
  glassdoor: 'bot_check',
};

const REASON_MESSAGES: Record<OfferUnreadableReason, string> = {
  login_wall: 'This page requires signing in to read it.',
  bot_check: 'This site blocked our automated reader.',
  empty: 'The page loaded but had no readable job description in it.',
  too_large: 'The page text is too long to process.',
  timeout: 'The page took too long to respond.',
  blocked_host: 'That address cannot be fetched.',
  bad_scheme: 'Only http:// and https:// links can be fetched.',
  http_error: 'The page could not be loaded.',
};

const MOCK_OFFER_TEXT = `Senior Frontend Developer - Acme Robotics

We're looking for a Senior Frontend Developer to join our platform team. You'll build
the React-based control console our field engineers use every day.

Requirements: 5+ years with React and TypeScript, strong CSS fundamentals, experience
with state management and testing. Familiarity with WebSockets and real-time UIs is a
plus. You'll work closely with our design and firmware teams in a collaborative,
fast-paced environment.`;

export async function mockFetchOffer(
  url: string,
  signal?: AbortSignal
): Promise<FetchOfferResponse> {
  await delay(900, signal);

  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return {
      ok: false,
      code: 'OFFER_UNREADABLE',
      reason: 'bad_scheme',
      message: REASON_MESSAGES.bad_scheme,
    };
  }

  const matched = Object.keys(UNREADABLE_HOSTS).find((needle) => host.includes(needle));
  if (matched) {
    const reason = UNREADABLE_HOSTS[matched];
    return { ok: false, code: 'OFFER_UNREADABLE', reason, message: REASON_MESSAGES[reason] };
  }
  if (host.includes('empty-offer')) {
    return {
      ok: false,
      code: 'OFFER_UNREADABLE',
      reason: 'empty',
      message: REASON_MESSAGES.empty,
    };
  }

  return {
    ok: true,
    text: MOCK_OFFER_TEXT,
    finalUrl: url,
    sourceHost: host,
    charCount: MOCK_OFFER_TEXT.length,
    truncated: false,
  };
}

const MOCK_KEYWORDS: Keywords = {
  company_name: 'Acme Robotics',
  hard_skills: ['React', 'TypeScript', 'CSS', 'WebSockets', 'Testing'],
  soft_skills: ['Collaboration', 'Communication'],
  technologies: ['React', 'TypeScript', 'WebSockets'],
  responsibilities: [
    'Build the field engineering control console',
    'Work with design and firmware teams',
  ],
  company_culture: ['Fast-paced', 'Collaborative'],
  synonyms: {
    Vue_to_React: ['Vue', 'Vuex'],
    general: ['frontend', 'front-end', 'client-side'],
  },
};

const MOCK_HTML_WITH_STYLESHEET = `<div class="content">
  <p>Miguel Rivero López</p>
  <p>senior-frontend-developer</p>
  <p>Frontend engineer with 6 years building React and TypeScript products.</p>
  <p>Experience</p>
  <p>Led the migration of a legacy control console to React and TypeScript, cutting load time by 40%.</p>
</div>`;

function buildMockHtml(includeStylesheetLink: boolean): string {
  const head = includeStylesheetLink
    ? '<head><link rel="stylesheet" href="shared.css" /></head>'
    : '<head></head>';
  return `<html>${head}<body>${MOCK_HTML_WITH_STYLESHEET}</body></html>`;
}

const MOCK_SUMMARY =
  "Tailored Miguel's CV to foreground React, TypeScript and the real-time UI work Acme Robotics " +
  'asked for, and reworded the experience section around the control-console migration.';

export type MockTailorEventHandler = (event: ServerEvent) => void;

export async function mockTailorStream(
  request: TailorRequest,
  onEvent: MockTailorEventHandler,
  signal?: AbortSignal
): Promise<void> {
  const triggerRateLimit = request.offerText.includes('trigger-ratelimit');
  const triggerWarning = request.offerText.includes('trigger-warning');

  onEvent({ type: 'status', step: 'extract-title', state: 'start' });
  await delay(700, signal);
  const jobTitle = 'senior-frontend-developer';
  onEvent({ type: 'status', step: 'extract-title', state: 'done', jobTitle });

  onEvent({ type: 'status', step: 'extract-keywords', state: 'start' });
  await delay(900, signal);
  onEvent({ type: 'status', step: 'extract-keywords', state: 'done', keywords: MOCK_KEYWORDS });

  onEvent({ type: 'status', step: 'adapt', state: 'start' });
  if (triggerRateLimit) {
    await delay(600, signal);
    onEvent({
      type: 'error',
      error: {
        code: 'rate_limited',
        step: 'adapt',
        message: 'OpenAI rate-limited this request. Wait a moment and try again.',
        retryable: true,
      },
    });
    onEvent({ type: 'done' });
    return;
  }

  for (const chars of [800, 1600, 2400]) {
    await delay(500, signal);
    onEvent({ type: 'status', step: 'adapt', state: 'delta', chars });
  }
  onEvent({ type: 'status', step: 'adapt', state: 'done' });

  onEvent({
    type: 'result',
    result: {
      jobTitle,
      keywords: MOCK_KEYWORDS,
      html: buildMockHtml(!triggerWarning),
      summary: MOCK_SUMMARY,
      usage: { model: request.model ?? 'gpt-4o', promptTokens: 1800, completionTokens: 900 },
    },
  });
  onEvent({ type: 'done' });
}
