export async function mutate<T = { ok: boolean }>(
  url: string,
  body: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response
    .json()
    .catch(() => ({ error: "The server could not complete this request." }));
  if (!response.ok) throw new Error(result.error || "Please try again.");
  return result as T;
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
