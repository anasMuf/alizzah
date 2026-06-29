/**
 * Type-safe helpers to extract data from Orval-generated API responses.
 *
 * Orval response types are union types like:
 *   getV1PaymentsResponse = { data: GetV1Payments200, status: 200 } | { data: DtoErrorResponse, status: 401 }
 *
 * These helpers safely extract the success payload without `as any` casting.
 */

import type { DtoMeta } from "#/api/model/dtoMeta";

/** Generic success response shape: { data: { data: T, meta?: DtoMeta } } */
interface PaginatedWrapper<T> {
	data?: {
		data?: T[];
		meta?: DtoMeta;
	};
}

/** Generic single-item response shape: { data: { data: T } } */
interface SingleWrapper<T> {
	data?: {
		data?: T;
	};
}

/** Extract paginated list from response. Returns empty array on missing/error. */
export function extractListData<T>(response: unknown): T[] {
	const r = response as PaginatedWrapper<T> | undefined | null;
	if (!r?.data?.data) return [];
	return r.data.data;
}

/** Extract pagination metadata from response. */
export function extractMeta(response: unknown): {
	page: number;
	limit: number;
	total: number;
} {
	const r = response as PaginatedWrapper<unknown> | undefined | null;
	const meta = r?.data?.meta;
	return {
		page: meta?.page ?? 1,
		limit: meta?.limit ?? 20,
		total: meta?.total ?? 0,
	};
}

/** Extract single entity from response. Returns null if missing. */
export function extractItemData<T>(response: unknown): T | null {
	const r = response as SingleWrapper<T> | undefined | null;
	if (!r?.data?.data) return null;
	return r.data.data;
}
