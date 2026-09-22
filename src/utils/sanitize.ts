import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
];

const ALLOWED_ATTR = [
  'alt',
  'class',
  'colspan',
  'height',
  'href',
  'loading',
  'rel',
  'rowspan',
  'src',
  'target',
  'title',
  'width',
];

// Harden outbound links after sanitization (adds rel, drops unsafe targets).
if (typeof window === 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
}

/**
 * Sanitize store/merchant-provided HTML (product descriptions, Shopify legal
 * policies) before it is injected with `dangerouslySetInnerHTML`.
 *
 * Neutralizes `<script>`, event-handler attributes, `javascript:` URLs and any
 * other active content while preserving the formatting Shopify emits.
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOW_DATA_ATTR: false,
    ALLOWED_ATTR,
    ALLOWED_TAGS,
  });
};

export default sanitizeHtml;
