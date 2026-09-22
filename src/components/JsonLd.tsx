/**
 * Renders a JSON-LD structured-data block.
 *
 * `<` is escaped so user-controlled strings (product titles, descriptions)
 * cannot break out of the script element.
 */
const JsonLd = ({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(data).replace(/</g, '\\u003c'),
    }}
  />
);

export default JsonLd;
