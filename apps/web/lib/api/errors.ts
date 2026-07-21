import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiError } from "./response";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super("Validation failed", 422, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
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
    return apiError(
      422,
      "Validation failed",
      error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  if (error instanceof Error) {
    const details: Record<string, unknown> = { message: error.message };
    if ("params" in error) details.params = (error as any).params;
    if ("cause" in error && error.cause instanceof Error) {
      details.cause = { message: error.cause.message };
      if ("code" in (error.cause as any))
        details.code = (error.cause as any).code;
      if ("detail" in (error.cause as any))
        details.detail = (error.cause as any).detail;
      if ("constraint" in (error.cause as any))
        details.constraint = (error.cause as any).constraint;
    }
    console.error("[API Error]", JSON.stringify(details, null, 2));
  } else {
    console.error("[API Error]", error);
  }

  return apiError(500, "Internal server error");
}
