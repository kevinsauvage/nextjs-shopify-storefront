import { sanitizeHtml } from './sanitize';

import { describe, expect, it } from 'vitest';

describe('sanitizeHtml', () => {
  it('returns an empty string for nullish input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });

  it('keeps allowed formatting markup', () => {
    expect(sanitizeHtml('<p>Hello <strong>world</strong></p>')).toBe(
      '<p>Hello <strong>world</strong></p>',
    );
  });

  it('strips script tags', () => {
    const output = sanitizeHtml('<p>Hi</p><script>alert(1)</script>');

    expect(output).not.toContain('script');
    expect(output).toContain('<p>Hi</p>');
  });

  it('strips event handler attributes', () => {
    const output = sanitizeHtml('<img src="x" onerror="alert(1)" />');

    expect(output).not.toContain('onerror');
  });

  it('neutralizes javascript: URLs', () => {
    const output = sanitizeHtml('<a href="javascript:alert(1)">click</a>');

    expect(output).not.toContain('javascript:');
  });

  it('adds rel hardening to safe links', () => {
    const output = sanitizeHtml('<a href="https://example.com">link</a>');

    expect(output).toContain('rel="noopener noreferrer nofollow"');
  });

  it('strips data attributes', () => {
    const output = sanitizeHtml('<p data-evil="1">text</p>');

    expect(output).not.toContain('data-evil');
  });
});
