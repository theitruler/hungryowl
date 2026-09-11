// Avoid logging messages, SQL, request bodies, or connection strings: database
// adapters can include submitted data and credentials in their wrapped errors.
export function errorDiagnostics(error: unknown) {
  const errors: { type: string; code?: string }[] = [];
  const seen = new Set<object>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current) && errors.length < 5) {
    seen.add(current);
    const entry = current as { name?: unknown; code?: unknown; cause?: unknown };
    const type =
      typeof entry.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(entry.name)
        ? entry.name
        : "UnknownError";
    const code =
      typeof entry.code === "string" && /^[A-Z0-9_]{1,64}$/.test(entry.code)
        ? entry.code
        : undefined;
    errors.push({ type, ...(code ? { code } : {}) });
    current = entry.cause;
  }
  return errors.length ? errors : [{ type: "UnknownError" }];
}
