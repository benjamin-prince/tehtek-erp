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

async function request<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { auth = true, token, ...rest } = opts;
  const headers = new Headers(rest.headers);
  headers.set("Content-Type", "application/json");

  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API}${path}`, { ...rest, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.error || detail;
    } catch {
      // no JSON body
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