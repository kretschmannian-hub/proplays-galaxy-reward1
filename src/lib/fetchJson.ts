/**
 * Fetches a JSON API endpoint and always resolves to a discriminated
 * result — never throws on a malformed/non-JSON response (e.g. a raw 500
 * HTML error page), which previously surfaced to users as a generic
 * "Network error" with no way to tell what actually happened.
 */
export async function postJson<T = Record<string, unknown>>(
  url: string,
  body: unknown
): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, error: "Couldn't reach the server. Check your connection and try again." };
  }

  let parsed: any;
  try {
    parsed = await res.json();
  } catch {
    return {
      ok: false,
      status: res.status,
      error:
        res.status >= 500
          ? "The server ran into a problem. Please try again in a moment."
          : "Something went wrong. Please try again.",
    };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: parsed?.error ?? "Something went wrong. Please try again." };
  }
  return { ok: true, status: res.status, data: parsed as T };
}
