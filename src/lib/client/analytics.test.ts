import { CONSENT_UPDATED_EVENT, dispatchConsentUpdated, withGtag } from './analytics';

import { afterEach, describe, expect, it, vi } from 'vitest';

type TestWindow = {
  dispatchEvent?: (event: Event) => boolean;
  gtag?: (...args: Array<unknown>) => void;
};

const setWindow = (value: TestWindow | undefined): void => {
  (globalThis as unknown as { window?: TestWindow }).window = value;
};

afterEach(() => {
  setWindow(undefined);
});

describe('CONSENT_UPDATED_EVENT', () => {
  it('is the stable event name listeners subscribe to', () => {
    expect(CONSENT_UPDATED_EVENT).toBe('localConsentUpdated');
  });
});

describe('withGtag', () => {
  it('does nothing when window is unavailable', () => {
    setWindow(undefined);
    const callback = vi.fn();

    withGtag(callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('does nothing when gtag is not installed', () => {
    setWindow({});
    const callback = vi.fn();

    withGtag(callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('invokes the callback with gtag when available', () => {
    const gtag = vi.fn();
    setWindow({ gtag });
    const callback = vi.fn();

    withGtag(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(gtag);
  });
});

describe('dispatchConsentUpdated', () => {
  it('does nothing when window is unavailable', () => {
    setWindow(undefined);

    expect(() => dispatchConsentUpdated()).not.toThrow();
  });

  it('dispatches the consent-updated event on window', () => {
    const dispatchEvent = vi.fn();
    setWindow({ dispatchEvent });

    dispatchConsentUpdated();

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0]?.[0] as Event | undefined;

    expect(event).toBeInstanceOf(Event);
    expect(event?.type).toBe(CONSENT_UPDATED_EVENT);
  });
});
