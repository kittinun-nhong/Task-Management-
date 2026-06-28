import 'server-only';
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

interface PageInfo {
  page: number;
  limit: number;
}

export const ok = <T>(data: T) =>
  NextResponse.json({ success: true, message: 'OK', data });

export const created = <T>(data: T) =>
  NextResponse.json({ success: true, message: 'Created', data }, { status: 201 });

export const paginated = <T>(data: T[], total: number, q: PageInfo) =>
  NextResponse.json({
    success: true,
    message: 'OK',
    data,
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    },
  });

export const badRequest = (message: string, error?: ZodError) =>
  NextResponse.json(
    {
      success: false,
      message,
      errors: error?.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    },
    { status: 400 },
  );

export const unauthorized = (message = 'Unauthorized') =>
  NextResponse.json({ success: false, message }, { status: 401 });

export const forbidden = (message = 'Forbidden') =>
  NextResponse.json({ success: false, message }, { status: 403 });

export const notFound = (message = 'Not found') =>
  NextResponse.json({ success: false, message }, { status: 404 });

export const internalError = (err: unknown) => {
  console.error(err); // log internally, never expose
  return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
};

/** Server Actions return this discriminated result instead of an HTTP envelope. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };
