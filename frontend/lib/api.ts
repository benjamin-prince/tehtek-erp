const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API = `${BASE_URL}/api/v1`;

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

type FetchOptions = RequestInit & {
  auth?: boolean;
  token?: string;
};

/**
 * Extract a readable message from a FastAPI error body.
 *
 * Shapes we need to handle:
 *  - { "detail": "some string" }                              (HTTPException)
 *  - { "detail": [{ "loc": [...], "msg": "...", ... }, ...] } (422 validation)
 *  - { "error": "Name", "detail": "some string" }             (our AppError handler)
 */
function extractDetail(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;

  // 422 validation errors: detail is an array of error objects
  if (Array.isArray(b.detail)) {
    return b.detail
      .map((e: unknown) => {
        if (typeof e !== "object" || e === null) return String(e);
        const err = e as Record<string, unknown>;
        const loc = Array.isArray(err.loc) ? err.loc.slice(1).join(".") : "";
        const msg = typeof err.msg === "string" ? err.msg : "invalid";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join("; ");
  }

  if (typeof b.detail === "string") return b.detail;
  if (typeof b.error === "string") return b.error;
  return undefined;
}

async function request<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { auth = true, token, ...rest } = opts;
  const headers = new Headers(rest.headers);
  headers.set("Content-Type", "application/json");

  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...rest, headers });
  } catch (e) {
    // Network-level failure (CORS, DNS, mixed content, connection refused).
    // Re-throw as ApiError with status 0 so the UI can still show something useful.
    const msg = e instanceof Error ? e.message : "Network error";
    throw new ApiError(0, "Network error", msg);
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = extractDetail(body);
    } catch {
      // Not a JSON body — fall back to status text
      detail = res.statusText;
    }
    throw new ApiError(res.status, `Request failed (${res.status})`, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, opts?: FetchOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body: unknown, opts?: FetchOptions) =>
    request<T>(path, { ...opts, method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, opts?: FetchOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string, opts?: FetchOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

export { BASE_URL };