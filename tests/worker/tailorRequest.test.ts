/**
 * The worker must not turn a missing framework into `agnostic`, and it
 * must not silently do the same for a value that is not a known mode.
 */

import { validateRequest } from '../../worker/src/lib/validateTailorRequest';

const BODY = { offerText: 'Build APIs', baseHtml: '<div class="content"></div>' };

function requestFrom(body: unknown) {
  const result = validateRequest(body, 1000);
  if ('error' in result) {
    throw new Error(result.error);
  }
  return result.request;
}

describe('validateRequest framework', () => {
  it('leaves framework unset when the field is omitted', () => {
    expect(requestFrom(BODY).framework).toBeUndefined();
  });

  it('leaves framework unset when the field is null', () => {
    expect(requestFrom({ ...BODY, framework: null }).framework).toBeUndefined();
  });

  it('keeps react, vue, and agnostic', () => {
    expect(requestFrom({ ...BODY, framework: 'react' }).framework).toBe('react');
    expect(requestFrom({ ...BODY, framework: 'vue' }).framework).toBe('vue');
    expect(requestFrom({ ...BODY, framework: 'agnostic' }).framework).toBe('agnostic');
  });

  it('rejects an unknown framework instead of dropping it', () => {
    const result = validateRequest({ ...BODY, framework: 'React' }, 1000);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/framework/i);
    }
  });
});
