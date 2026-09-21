import { cn } from './cn';

import { describe, expect, it } from 'vitest';

describe('cn', () => {
  it('keeps a text color utility when a custom font-size class is merged', () => {
    const result = cn('bg-primary text-primary-foreground text-sm', 'w-full text-body-lg');

    expect(result).toContain('text-primary-foreground');
    expect(result).toContain('text-body-lg');
    expect(result).not.toContain('text-sm');
  });

  it('keeps color and custom typography classes together', () => {
    const result = cn('text-white/80', 'text-eyebrow');

    expect(result).toContain('text-white/80');
    expect(result).toContain('text-eyebrow');
  });

  it('still resolves real color conflicts in favor of the last class', () => {
    expect(cn('text-foreground', 'text-white')).toBe('text-white');
  });
});
