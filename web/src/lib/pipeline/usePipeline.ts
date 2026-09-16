/**
 * Bridges the pure core reducer (src/core/pipeline/machine.ts) to real
 * async work: fetching the offer, running the tailor call, then
 * post-processing the result. The reducer itself stays untouched here -
 * this hook only ever dispatches actions into it and reacts to state it
 * already exposes.
 *
 * Today "real async work" means web/src/lib/api/mock.ts. Phase 7 swaps
 * that import for web/src/lib/api/client.ts's fetchOffer/tailorStream,
 * which share the same signatures, so nothing below changes.
 */
import { useCallback, useMemo, useReducer, useRef } from 'react';
import {
  createInitialPipelineState,
  pipelineReducer,
  type PipelineState,
} from '@core/pipeline/machine';
import {
  rewriteTitleAndNormalize,
  stageRemoveWatermarks,
  validateFinalStructure,
} from '@core/pipeline/postProcess';
import { normalizeOutputHtml } from '@core/html/cvStructure';
import type { FrameworkMode } from '@core/config/types';
import { mockFetchOffer, mockTailorStream } from '@/lib/api/mock';

export interface GenerateOptions {
  framework: FrameworkMode;
  baseHtml: string;
  candidateName: string;
  model: string;
  temperature: number;
  checkWatermarks: boolean;
  rewriteTitle: boolean;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function usePipeline() {
  const [state, dispatch] = useReducer(pipelineReducer, undefined, createInitialPipelineState);
  const abortRef = useRef<AbortController | null>(null);

  const runGenerate = useCallback(async (offerText: string, options: GenerateOptions) => {
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'GENERATE_START', offerText });

    try {
      await mockTailorStream(
        {
          offerText,
          baseHtml: options.baseHtml,
          framework: options.framework,
          model: options.model,
          temperature: options.temperature,
        },
        (event) => {
          dispatch({ type: 'SERVER_EVENT', event });

          if (event.type === 'result') {
            // Mirrors applyPostProcessing (src/core/pipeline/postProcess.ts)
            // step by step rather than calling it directly, because the
            // "rewrite the header job title" advanced option needs to be
            // able to skip the title stage - applyPostProcessing always
            // runs it.
            const stage1 = stageRemoveWatermarks(event.result.html, {
              checkWatermarks: options.checkWatermarks,
            });
            const html = options.rewriteTitle
              ? rewriteTitleAndNormalize(stage1.html, {
                  jobTitle: event.result.jobTitle,
                  candidateName: options.candidateName,
                })
              : normalizeOutputHtml(stage1.html);
            const warnings = [...stage1.structureWarnings, ...validateFinalStructure(html)];
            dispatch({ type: 'POST_PROCESS_DONE', html, warnings });
          }
        },
        controller.signal
      );
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
    }
  }, []);

  const fetchOffer = useCallback(
    async (url: string, options: GenerateOptions) => {
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: 'FETCH_OFFER_START', url });

      try {
        const response = await mockFetchOffer(url, controller.signal);
        if (!response.ok) {
          dispatch({
            type: 'FETCH_OFFER_FAILURE',
            reason: response.reason,
            message: response.message,
          });
          return;
        }
        dispatch({ type: 'FETCH_OFFER_SUCCESS', offerText: response.text });
        // Let the "fetched" success row (see OfferInputCard) actually be
        // seen for a beat before the run moves on to tailoring - without
        // this the reducer would jump straight from fetching-offer to
        // running inside the same tick.
        await new Promise((resolve) => setTimeout(resolve, 500));
        await runGenerate(response.text, options);
      } catch (error) {
        if (!isAbortError(error)) {
          throw error;
        }
      }
    },
    [runGenerate]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'CANCELLED' });
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return useMemo(
    () => ({ state, fetchOffer, runGenerate, cancel, reset }),
    [state, fetchOffer, runGenerate, cancel, reset]
  );
}

export type { PipelineState };
