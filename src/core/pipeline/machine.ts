/**
 * Pure state machine for the web app's tailoring pipeline.
 *
 * This is deliberately just a (state, action) => state reducer with no
 * DOM, no fetch, no timers - the same shape React's useReducer expects,
 * and testable here in the Jest suite with no jsdom and no second test
 * runner. The web app's usePipeline hook owns the actual network calls
 * (fetching the offer, opening the SSE stream, running
 * applyPostProcessing) and dispatches the outcomes in here as actions.
 *
 * Two things this reducer guards deliberately, because both are easy to
 * get wrong once real network timing is involved:
 *
 *   - A failed offer fetch is not a pipeline failure. It is stored
 *     separately (offerFetchError), so the UI can reveal the paste
 *     textarea inline in the input card without ever touching the
 *     generic `error` field the result view reads.
 *   - Once the run has reached a terminal status (succeeded, failed,
 *     cancelled), further SERVER_EVENT or POST_PROCESS_DONE actions are
 *     ignored. An aborted fetch can still have a queued event in
 *     flight; without this guard a late event could resurrect a run the
 *     user already cancelled or that already finished.
 */

import type { Keywords } from '../types/keywords.js';
import type {
  OfferUnreadableReason,
  PipelineStepId,
  ServerEvent,
  TailorResult,
} from '../types/api.js';

export type StepStatus = 'pending' | 'active' | 'done' | 'error';

export interface StepInfo {
  status: StepStatus;
  startedAt?: number;
  endedAt?: number;
  detail?: string;
}

export type PipelineStatus =
  'idle' | 'fetching-offer' | 'running' | 'succeeded' | 'failed' | 'cancelled';

const STEP_IDS: PipelineStepId[] = [
  'fetch-offer',
  'extract-title',
  'extract-keywords',
  'adapt',
  'post-process',
];

const TERMINAL_STATUSES: PipelineStatus[] = ['succeeded', 'failed', 'cancelled'];

export interface PipelineState {
  status: PipelineStatus;
  steps: Record<PipelineStepId, StepInfo>;
  offerText?: string;
  offerFetchError?: { reason: OfferUnreadableReason; message: string };
  jobTitle?: string;
  keywords?: Keywords;
  result?: TailorResult;
  processedHtml?: string;
  warnings: string[];
  error?: { code: string; message: string; retryable: boolean; step?: PipelineStepId };
}

export type PipelineAction =
  | { type: 'RESET' }
  | { type: 'FETCH_OFFER_START'; url: string }
  | { type: 'FETCH_OFFER_SUCCESS'; offerText: string }
  | { type: 'FETCH_OFFER_FAILURE'; reason: OfferUnreadableReason; message: string }
  | { type: 'GENERATE_START'; offerText: string }
  | { type: 'SERVER_EVENT'; event: ServerEvent; now?: number }
  | { type: 'POST_PROCESS_DONE'; html: string; warnings: string[] }
  | { type: 'CANCELLED' };

function pendingStep(): StepInfo {
  return { status: 'pending' };
}

export function createInitialPipelineState(): PipelineState {
  return {
    status: 'idle',
    steps: {
      'fetch-offer': pendingStep(),
      'extract-title': pendingStep(),
      'extract-keywords': pendingStep(),
      adapt: pendingStep(),
      'post-process': pendingStep(),
    },
    warnings: [],
  };
}

function withStep(
  state: PipelineState,
  step: PipelineStepId,
  patch: Partial<StepInfo>
): PipelineState['steps'] {
  return {
    ...state.steps,
    [step]: { ...state.steps[step], ...patch },
  };
}

function isTerminal(status: PipelineStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case 'RESET':
      return createInitialPipelineState();

    case 'FETCH_OFFER_START': {
      const fresh = createInitialPipelineState();
      return {
        ...fresh,
        status: 'fetching-offer',
        steps: withStep(fresh, 'fetch-offer', { status: 'active', startedAt: Date.now() }),
      };
    }

    case 'FETCH_OFFER_SUCCESS':
      // Stays in 'fetching-offer' - GENERATE_START is what moves the run
      // into 'running', once the hook kicks off the /api/tailor call.
      return {
        ...state,
        offerText: action.offerText,
        offerFetchError: undefined,
        steps: withStep(state, 'fetch-offer', { status: 'done', endedAt: Date.now() }),
      };

    case 'FETCH_OFFER_FAILURE':
      // Not a pipeline failure: status returns to 'idle' so the input
      // card - not the result view's error tiers - owns showing this.
      return {
        ...state,
        status: 'idle',
        offerFetchError: { reason: action.reason, message: action.message },
        steps: withStep(state, 'fetch-offer', {
          status: 'error',
          endedAt: Date.now(),
          detail: action.reason,
        }),
      };

    case 'GENERATE_START': {
      const now = Date.now();
      let steps = state.steps;
      // A manual paste skips the fetch-offer step entirely; mark it done
      // so the progress list doesn't show a step that never ran.
      if (state.steps['fetch-offer'].status !== 'done') {
        steps = withStep(state, 'fetch-offer', { status: 'done', endedAt: now });
      }
      steps = {
        ...steps,
        'extract-title': { status: 'active', startedAt: now },
        'extract-keywords': pendingStep(),
        adapt: pendingStep(),
        'post-process': pendingStep(),
      };

      return {
        ...state,
        status: 'running',
        offerText: action.offerText,
        offerFetchError: undefined,
        jobTitle: undefined,
        keywords: undefined,
        result: undefined,
        processedHtml: undefined,
        warnings: [],
        error: undefined,
        steps,
      };
    }

    case 'SERVER_EVENT': {
      if (isTerminal(state.status)) {
        // A late event from an aborted or already-finished run. Ignore
        // it rather than resurrecting a run the user has moved on from.
        return state;
      }
      return applyServerEvent(state, action.event, action.now ?? Date.now());
    }

    case 'POST_PROCESS_DONE': {
      if (isTerminal(state.status)) {
        return state;
      }
      return {
        ...state,
        status: 'succeeded',
        processedHtml: action.html,
        warnings: action.warnings,
        steps: withStep(state, 'post-process', { status: 'done', endedAt: Date.now() }),
      };
    }

    case 'CANCELLED':
      if (isTerminal(state.status)) {
        return state;
      }
      return { ...state, status: 'cancelled' };

    default:
      return state;
  }
}

function applyServerEvent(state: PipelineState, event: ServerEvent, now: number): PipelineState {
  switch (event.type) {
    case 'status': {
      switch (event.state) {
        case 'start':
          return {
            ...state,
            steps: withStep(state, event.step, { status: 'active', startedAt: now }),
          };

        case 'done': {
          if (event.step === 'extract-title') {
            return {
              ...state,
              jobTitle: event.jobTitle,
              steps: withStep(state, 'extract-title', { status: 'done', endedAt: now }),
            };
          }
          if (event.step === 'extract-keywords') {
            return {
              ...state,
              keywords: event.keywords,
              steps: withStep(state, 'extract-keywords', { status: 'done', endedAt: now }),
            };
          }
          // adapt: state.step === 'adapt'
          return { ...state, steps: withStep(state, 'adapt', { status: 'done', endedAt: now }) };
        }

        case 'delta':
          return {
            ...state,
            steps: withStep(state, 'adapt', { detail: `${event.chars} characters generated` }),
          };

        default:
          return state;
      }
    }

    case 'result':
      // post-process runs next, entirely client-side; mark it active so
      // the progress list reflects that before POST_PROCESS_DONE lands.
      return {
        ...state,
        result: event.result,
        steps: {
          ...state.steps,
          adapt: { ...state.steps.adapt, status: 'done', endedAt: now },
          'post-process': { ...state.steps['post-process'], status: 'active', startedAt: now },
        },
      };

    case 'error': {
      const activeStep = STEP_IDS.find((id) => state.steps[id].status === 'active');
      let steps = state.steps;
      if (activeStep) {
        steps = withStep(state, activeStep, { status: 'error', endedAt: now });
      }
      // jobTitle/keywords already captured from earlier partials are
      // deliberately left in place: a failed adapt step shouldn't hide
      // extraction results the user already paid for and can still see.
      return {
        ...state,
        status: 'failed',
        error: {
          code: event.error.code,
          message: event.error.message,
          retryable: event.error.retryable,
          step: event.error.step,
        },
        steps,
      };
    }

    case 'done':
      // The stream ended. If a result already arrived, POST_PROCESS_DONE
      // will move the run to 'succeeded' shortly. If not - the worker
      // closed the stream without ever sending `result` - the run must
      // not sit in 'running' forever, so treat it as a failure now.
      if (state.result) {
        return state;
      }
      return {
        ...state,
        status: 'failed',
        error: {
          code: 'internal',
          message: 'The connection ended before a result arrived. Please try again.',
          retryable: true,
        },
      };

    default:
      return state;
  }
}
