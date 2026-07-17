import { NextResponse } from "next/server";

export interface ApiMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: ApiMeta;
}

export function apiSuccess<T>(data: T, meta?: ApiMeta) {
  return NextResponse.json({
    success: true,
    data,
    meta,
  } satisfies ApiResponse<T>);
}

export function apiError(
  status: number,
  message: string,
  errors?: Record<string, string[]>,
) {
  return NextResponse.json(
    { success: false, error: message, errors } satisfies ApiResponse,
    { status },
  );
}
