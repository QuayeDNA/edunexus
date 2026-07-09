import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { apiError } from './response';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super('Validation failed', 422, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Converts a thrown error into a standardized API error response.
 * Use in a route wrapper so handlers can `throw new NotFoundError()` etc.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return apiError(error.statusCode, error.message, error.errors);
  }
  if (error instanceof ZodError) {
    return apiError(422, 'Validation failed', error.flatten().fieldErrors as Record<string, string[]>);
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  return apiError(500, message);
}
