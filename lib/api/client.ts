const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

type Envelope<T> =
  | { success: true; message: string; data: T; pagination?: Pagination }
  | { success: false; message: string; errors?: { field: string; message: string }[] };

export class ApiError extends Error {
  constructor(
    message: string,
    public fieldErrors?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Single fetch wrapper. Unwraps the standard envelope so callers get the payload
 * directly. For list endpoints, returns `{ data, pagination }` via `apiFetchPaged`.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  if (res.status === 204) return undefined as T;

  const body = (await res.json()) as Envelope<T>;
  if (!body.success) {
    throw new ApiError(body.message, 'errors' in body ? body.errors : undefined);
  }
  return body.data;
}

/** Like apiFetch, but keeps the pagination block alongside the data array. */
export async function apiFetchPaged<T>(path: string, init: RequestInit = {}): Promise<Paged<T>> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const body = (await res.json()) as Envelope<T[]>;
  if (!body.success) {
    throw new ApiError(body.message, 'errors' in body ? body.errors : undefined);
  }
  return {
    data: body.data,
    pagination: body.pagination ?? { page: 1, limit: body.data.length, total: body.data.length, totalPages: 1 },
  };
}

/** Build a query string from a partial params object, dropping null/undefined/''. */
export function toQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
