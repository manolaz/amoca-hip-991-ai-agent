// Lightweight PII redaction helpers for user-provided text and JSON-like objects.
// Intentionally conservative to avoid over-redaction while covering common PII patterns.

export function sanitizeText(input: string): string {
  if (!input) return input;
  let out = input;

  // Emails
  out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");

  // SSN (US)
  out = out.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[ssn]");

  // Credit card-ish sequences (13-16 digits possibly spaced/dashed)
  out = out.replace(/\b(?:\d[ -]*?){13,16}\b/g, "[card]");

  // Phone numbers (general, 8-20 chars of digits and separators)
  out = out.replace(/\+?\d[\d\-()\.\s]{6,}\d/g, "[phone]");

  // URLs
  out = out.replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[url]");

  // Street-like addresses (simple heuristic)
  out = out.replace(
    /\b\d{1,5}\s+[\w'.-]+(?:\s+[\w'.-]+)*\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl)\b/gi,
    "[address]"
  );

  // Simple wallet or key-like long hex strings
  out = out.replace(/\b0x[a-f0-9]{16,}\b/gi, "[hex]");

  return out;
}

export function deepSanitize<T = any>(val: T): T {
  if (val == null) return val;
  if (typeof val === "string") return sanitizeText(val) as unknown as T;
  if (Array.isArray(val)) return (val.map((v) => deepSanitize(v)) as unknown) as T;
  if (typeof val === "object") {
    const out: Record<string, any> = Array.isArray(val) ? [] : {};
    for (const [k, v] of Object.entries(val as Record<string, any>)) {
      out[k] = deepSanitize(v);
    }
    return out as T;
  }
  return val;
}
