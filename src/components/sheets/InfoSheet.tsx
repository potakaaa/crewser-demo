/** Stub for dev-2: explainer / info sheet (sheet id picks the topic). */
export function InfoSheet({ id }: { id?: string }) {
  return <p className="sheet-empty">Info sheet ({id ?? 'general'}) coming soon.</p>;
}
