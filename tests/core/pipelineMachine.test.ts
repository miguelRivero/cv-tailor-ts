/**
 * Unit tests for src/core/pipeline/machine.ts
 */

import {
  createInitialPipelineState,
  pipelineReducer,
  PipelineState,
} from '../../src/core/pipeline/machine';
import { Keywords } from '../../src/core/types/keywords';
import { ServerEvent, TailorResult } from '../../src/core/types/api';

const KEYWORDS: Keywords = {
  company_name: 'Acme',
  hard_skills: ['React'],
  soft_skills: [],
  technologies: ['TypeScript'],
  responsibilities: [],
  company_culture: [],
  synonyms: { Vue_to_React: [], general: [] },
};

const RESULT: TailorResult = {
  jobTitle: 'senior-frontend-developer',
  keywords: KEYWORDS,
  html: '<div class="content"></div>',
  summary: 'Adapted for a frontend role.',
};

function reduce(
  state: PipelineState,
  ...events: Parameters<typeof pipelineReducer>[1][]
): PipelineState {
  return events.reduce(pipelineReducer, state);
}

describe('createInitialPipelineState', () => {
  it('starts idle with every step pending', () => {
    const state = createInitialPipelineState();
    expect(state.status).toBe('idle');
    expect(state.warnings).toHaveLength(0);
    for (const step of Object.values(state.steps)) {
      expect(step.status).toBe('pending');
    }
  });
});

describe('offer fetch', () => {
  it('marks fetch-offer active while fetching', () => {
    const state = reduce(createInitialPipelineState(), {
      type: 'FETCH_OFFER_START',
      url: 'https://x.com',
    });
    expect(state.status).toBe('fetching-offer');
    expect(state.steps['fetch-offer'].status).toBe('active');
  });

  it('stores the offer text on success and marks the step done', () => {
    const state = reduce(
      createInitialPipelineState(),
      { type: 'FETCH_OFFER_START', url: 'https://x.com' },
      { type: 'FETCH_OFFER_SUCCESS', offerText: 'We are hiring...' }
    );
    expect(state.offerText).toBe('We are hiring...');
    expect(state.steps['fetch-offer'].status).toBe('done');
    expect(state.offerFetchError).toBeUndefined();
  });

  it('records a failure separately from the pipeline error field, and returns to idle', () => {
    const state = reduce(createInitialPipelineState(), {
      type: 'FETCH_OFFER_FAILURE',
      reason: 'login_wall',
      message: 'LinkedIn blocks automated readers.',
    });

    expect(state.status).toBe('idle');
    expect(state.offerFetchError).toEqual({
      reason: 'login_wall',
      message: 'LinkedIn blocks automated readers.',
    });
    // A failed fetch is not a pipeline failure - the generic error tier
    // used by the result view must stay untouched.
    expect(state.error).toBeUndefined();
  });
});

describe('GENERATE_START', () => {
  it('moves straight to running and resets the downstream steps', () => {
    const state = reduce(createInitialPipelineState(), {
      type: 'GENERATE_START',
      offerText: 'text',
    });

    expect(state.status).toBe('running');
    expect(state.offerText).toBe('text');
    expect(state.steps['fetch-offer'].status).toBe('done');
    expect(state.steps['extract-title'].status).toBe('active');
    expect(state.steps['extract-keywords'].status).toBe('pending');
  });

  it('clears a previous run’s result, warnings and error', () => {
    const finished: PipelineState = {
      ...createInitialPipelineState(),
      status: 'failed',
      result: RESULT,
      warnings: ['stale warning'],
      error: { code: 'internal', message: 'boom', retryable: true },
    };

    const state = pipelineReducer(finished, { type: 'GENERATE_START', offerText: 'a new offer' });

    expect(state.result).toBeUndefined();
    expect(state.warnings).toHaveLength(0);
    expect(state.error).toBeUndefined();
    expect(state.status).toBe('running');
  });
});

describe('server events', () => {
  function running(): PipelineState {
    return reduce(createInitialPipelineState(), { type: 'GENERATE_START', offerText: 'text' });
  }

  it('captures the job title as soon as it partially arrives', () => {
    const event: ServerEvent = {
      type: 'status',
      step: 'extract-title',
      state: 'done',
      jobTitle: 'dev',
    };
    const state = reduce(running(), { type: 'SERVER_EVENT', event });

    expect(state.jobTitle).toBe('dev');
    expect(state.steps['extract-title'].status).toBe('done');
  });

  it('captures keywords as soon as they partially arrive', () => {
    const event: ServerEvent = {
      type: 'status',
      step: 'extract-keywords',
      state: 'done',
      keywords: KEYWORDS,
    };
    const state = reduce(running(), { type: 'SERVER_EVENT', event });

    expect(state.keywords).toEqual(KEYWORDS);
    expect(state.steps['extract-keywords'].status).toBe('done');
  });

  it('moves adapt to active on start and marks post-process active once a result arrives', () => {
    const state = reduce(
      running(),
      { type: 'SERVER_EVENT', event: { type: 'status', step: 'adapt', state: 'start' } },
      { type: 'SERVER_EVENT', event: { type: 'result', result: RESULT } }
    );

    expect(state.steps.adapt.status).toBe('done');
    expect(state.steps['post-process'].status).toBe('active');
    expect(state.result).toEqual(RESULT);
    // Still not "succeeded" - that only happens once the browser-side
    // post-processing step actually finishes.
    expect(state.status).toBe('running');
  });

  it('finishes the run on POST_PROCESS_DONE', () => {
    const withResult = reduce(running(), {
      type: 'SERVER_EVENT',
      event: { type: 'result', result: RESULT },
    });

    const state = pipelineReducer(withResult, {
      type: 'POST_PROCESS_DONE',
      html: '<div class="content">final</div>',
      warnings: ['The model altered the layout slightly.'],
    });

    expect(state.status).toBe('succeeded');
    expect(state.processedHtml).toBe('<div class="content">final</div>');
    expect(state.warnings).toEqual(['The model altered the layout slightly.']);
    expect(state.steps['post-process'].status).toBe('done');
  });

  it('an error after partial results keeps the partial results visible (error-after-partial)', () => {
    const withPartials = reduce(
      running(),
      {
        type: 'SERVER_EVENT',
        event: { type: 'status', step: 'extract-title', state: 'done', jobTitle: 'dev' },
      },
      {
        type: 'SERVER_EVENT',
        event: { type: 'status', step: 'extract-keywords', state: 'done', keywords: KEYWORDS },
      },
      { type: 'SERVER_EVENT', event: { type: 'status', step: 'adapt', state: 'start' } }
    );

    const state = pipelineReducer(withPartials, {
      type: 'SERVER_EVENT',
      event: {
        type: 'error',
        error: {
          code: 'rate_limited',
          step: 'adapt',
          message: 'Try again shortly.',
          retryable: true,
        },
      },
    });

    expect(state.status).toBe('failed');
    expect(state.error).toEqual({
      code: 'rate_limited',
      step: 'adapt',
      message: 'Try again shortly.',
      retryable: true,
    });
    // Not wiped out by the failure - the user already "paid" for these.
    expect(state.jobTitle).toBe('dev');
    expect(state.keywords).toEqual(KEYWORDS);
    expect(state.steps.adapt.status).toBe('error');
  });

  it('treats a stream that ends with no result as a failure', () => {
    const state = reduce(running(), { type: 'SERVER_EVENT', event: { type: 'done' } });

    expect(state.status).toBe('failed');
    expect(state.error?.retryable).toBe(true);
  });

  it('does not fail when done arrives after a result (the normal, successful order)', () => {
    const state = reduce(
      running(),
      { type: 'SERVER_EVENT', event: { type: 'result', result: RESULT } },
      { type: 'SERVER_EVENT', event: { type: 'done' } }
    );

    // Still driven by POST_PROCESS_DONE, not by `done` - the stream
    // ending after a result is not itself a terminal signal.
    expect(state.status).toBe('running');
    expect(state.result).toEqual(RESULT);
  });

  it('out-of-order: a stray step-start for a later step does not crash or lose earlier data', () => {
    const state = reduce(
      running(),
      { type: 'SERVER_EVENT', event: { type: 'status', step: 'adapt', state: 'start' } },
      {
        type: 'SERVER_EVENT',
        event: { type: 'status', step: 'extract-title', state: 'done', jobTitle: 'dev' },
      }
    );

    expect(state.jobTitle).toBe('dev');
    expect(state.steps.adapt.status).toBe('active');
    expect(state.steps['extract-title'].status).toBe('done');
  });
});

describe('cancellation and terminal-state guards', () => {
  it('cancels a running pipeline', () => {
    const state = reduce(
      createInitialPipelineState(),
      { type: 'GENERATE_START', offerText: 'text' },
      { type: 'CANCELLED' }
    );
    expect(state.status).toBe('cancelled');
  });

  it('ignores a late SERVER_EVENT that arrives after cancellation', () => {
    const cancelled = reduce(
      createInitialPipelineState(),
      { type: 'GENERATE_START', offerText: 'text' },
      { type: 'CANCELLED' }
    );

    const state = pipelineReducer(cancelled, {
      type: 'SERVER_EVENT',
      event: { type: 'status', step: 'extract-title', state: 'done', jobTitle: 'zombie' },
    });

    // The event must not resurrect a run the user already cancelled.
    expect(state).toBe(cancelled);
    expect(state.jobTitle).toBeUndefined();
  });

  it('ignores a late SERVER_EVENT that arrives after the run already succeeded', () => {
    const succeeded: PipelineState = {
      ...createInitialPipelineState(),
      status: 'succeeded',
      result: RESULT,
    };

    const state = pipelineReducer(succeeded, {
      type: 'SERVER_EVENT',
      event: {
        type: 'error',
        error: { code: 'internal', message: 'late failure', retryable: false },
      },
    });

    expect(state).toBe(succeeded);
  });

  it('ignores a late POST_PROCESS_DONE after cancellation', () => {
    const cancelled = reduce(
      createInitialPipelineState(),
      { type: 'GENERATE_START', offerText: 'text' },
      { type: 'CANCELLED' }
    );

    const state = pipelineReducer(cancelled, {
      type: 'POST_PROCESS_DONE',
      html: '<div class="content">too late</div>',
      warnings: [],
    });

    expect(state).toBe(cancelled);
  });

  it('RESET always works, even from a terminal state', () => {
    const failed: PipelineState = {
      ...createInitialPipelineState(),
      status: 'failed',
      error: { code: 'internal', message: 'boom', retryable: false },
    };

    const state = pipelineReducer(failed, { type: 'RESET' });
    expect(state).toEqual(createInitialPipelineState());
  });
});
