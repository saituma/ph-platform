import type { Request } from "express";

/**
 * Default and maximum pagination limits used across all list endpoints.
 */
export const PAGINATION_DEFAULTS = {
  limit: 50,
  maxLimit: 200,
  offset: 0,
} as const;

export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Extract and validate `limit` and `offset` query parameters from a request.
 *
 * - `limit` is clamped to `[1, maxLimit]` and defaults to `defaultLimit`.
 * - `offset` is clamped to `>= 0` and defaults to `0`.
 *
 * Usage:
 * ```ts
 * const { limit, offset } = parsePagination(req);
 * const rows = await db.select().from(table).limit(limit).offset(offset);
 * ```
 */
export function parsePagination(
  req: Request,
  options?: { defaultLimit?: number; maxLimit?: number },
): PaginationParams {
  const defaultLimit = options?.defaultLimit ?? PAGINATION_DEFAULTS.limit;
  const maxLimit = options?.maxLimit ?? PAGINATION_DEFAULTS.maxLimit;

  const rawLimit = Number(req.query.limit);
  const rawOffset = Number(req.query.offset);

  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), maxLimit) : defaultLimit;

  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;

  return { limit, offset };
}

/**
 * Clamp a programmatic limit value (e.g. from a service-layer `options` bag)
 * to a safe range. Returns `fallback` when the input is not a finite number.
 */
export function clampLimit(
  value: number | null | undefined,
  fallback: number = PAGINATION_DEFAULTS.limit,
  max: number = PAGINATION_DEFAULTS.maxLimit,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}
