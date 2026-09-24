import { afterEach, describe, expect, it, vi } from 'vitest';

const { registerErrorReporter, validateEnv } = vi.hoisted(() => ({
  registerErrorReporter: vi.fn(),
  validateEnv: vi.fn(),
}));

vi.mock('@/config/env', () => ({ validateEnv }));
vi.mock('@/lib/server/error-reporter', () => ({ registerErrorReporter }));

import { register } from './instrumentation';

describe('register', () => {
  afterEach(() => {
    registerErrorReporter.mockReset();
    validateEnv.mockReset();
    vi.unstubAllEnvs();
  });

  it('validates the env and wires error reporting on the nodejs runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');

    await register();

    expect(validateEnv).toHaveBeenCalledTimes(1);
    expect(registerErrorReporter).toHaveBeenCalledTimes(1);
  });

  it('does nothing on other runtimes', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');

    await register();

    expect(validateEnv).not.toHaveBeenCalled();
    expect(registerErrorReporter).not.toHaveBeenCalled();
  });
});
