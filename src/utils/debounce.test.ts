import debounce from './debounce';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('invokes once with the latest arguments after the delay', () => {
    const function_ = vi.fn();
    const debounced = debounce(function_, 500);

    debounced('a');
    debounced('b');
    expect(function_).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(function_).toHaveBeenCalledTimes(1);
    expect(function_).toHaveBeenCalledWith('b');
  });

  it('restarts the delay on every call', () => {
    const function_ = vi.fn();
    const debounced = debounce(function_, 500);

    debounced('a');
    vi.advanceTimersByTime(400);
    debounced('b');
    vi.advanceTimersByTime(400);
    expect(function_).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(function_).toHaveBeenCalledTimes(1);
    expect(function_).toHaveBeenCalledWith('b');
  });

  it('cancels a pending invocation', () => {
    const function_ = vi.fn();
    const debounced = debounce(function_, 500);

    debounced('a');
    debounced.cancel();
    vi.advanceTimersByTime(500);

    expect(function_).not.toHaveBeenCalled();
  });
});
