import type { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from './errors';

type RouteHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  ctx: { params: P }
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a route handler so that any thrown AppError (or ZodError) is
 * converted into the standard API error envelope response.
 */
export function routeHandler<P extends Record<string, string> = Record<string, string>>(
  handler: RouteHandler<P>
) {
  return async (req: NextRequest, ctx: { params: P }) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
