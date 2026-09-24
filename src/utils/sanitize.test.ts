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

  it('blocks data:text/html payloads while keeping inline images', () => {
    expect(sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')).not.toContain(
      'data:text/html',
    );
    expect(sanitizeHtml('<img src="data:image/png;base64,iVBORw0KGgo=" />')).toContain(
      'data:image/png',
    );
  });

  it('keeps safe and relative links with rel hardening', () => {
    expect(sanitizeHtml('<a href="/collections/all">all</a>')).toContain('href="/collections/all"');
    expect(sanitizeHtml('<a href="mailto:hello@example.com">mail</a>')).toContain(
      'href="mailto:hello@example.com"',
    );
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
