type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * JSON-LD embedded in a script tag. JSON.stringify does not escape `<`, so a
 * stored event field containing `</script>` would terminate the element.
 * `\u003c` is valid JSON and restores to `<` when parsed.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export default function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data];

  return (
    <>
      {payload.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
        />
      ))}
    </>
  );
}
