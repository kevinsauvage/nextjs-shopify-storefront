/**
 * Branded cart illustration.
 *
 * Inlined (rather than shipped as a file) so the line-art can adopt the
 * surrounding theme via `currentColor` and the gold accent token, instead of
 * being frozen to the colours baked into a static asset. Decorative: the
 * accessible name comes from the empty-state heading, so it is `aria-hidden`.
 */
const EmptyCartIllustration = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Sparkles — gold accent, echo the editorial eyebrow rules. */}
      <g
        className="text-[var(--gold)]"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      >
        <path d="M28 92H14" />
        <path d="M34 70 22 62" />
        <path d="M212 92h14" />
        <path d="M206 70l12-8" />
        <path d="M40 128H26" />
        <path d="M200 128h14" />
      </g>

      {/* Bag body — inherits body text colour. */}
      <path
        d="M62 66h116l13 108a10 10 0 0 1-9.9 11H58.9A10 10 0 0 1 49 174L62 66Z"
        className="fill-[var(--gold-soft)]"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M96 82V56a24 24 0 0 1 48 0v26"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M62 106h116"
        className="text-[var(--gold)]"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="120" cy="140" r="9" stroke="currentColor" strokeWidth="3" opacity="0.35" />
    </svg>
  );
};

export default EmptyCartIllustration;
