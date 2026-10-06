import { customInstance } from "#/api/mutator/custom-instance";

// Data layer modul SDM/HR (manual, pola sama dengan koperasi). Modul SDM
// dilayani oleh school-api (cmd/api) di path /v1/sdm — customInstance default.
// Response API berbentuk { message, data } → helper di sini meng-unwrap ke
// payload `data`.

type Envelope<T> = { message: string; data: T };

const BASE = "/v1/sdm";

export async function sdmGet<T>(
	path: string,
	params?: Record<string, unknown>,
): Promise<T> {
	const res = await customInstance<{ data: Envelope<T> }>(
		`${BASE}${path}`,
		params ? { params } : undefined,
	);
	return res.data.data;
}

export async function sdmSend<T>(
	method: "POST" | "PUT" | "DELETE",
	path: string,
	body?: unknown,
): Promise<T> {
	const res = await customInstance<{ data: Envelope<T> }>(`${BASE}${path}`, {
		method,
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
	});
	return res.data.data;
}

export interface SdmPageMeta {
	page: number;
	limit: number;
	total: number;
}

type PagedEnvelope<T> = { message: string; data: T; meta: SdmPageMeta };

// publicGet — endpoint publik (tautan slip gaji ber-token), TANPA header
// Authorization dan dilayani binary SDM (/v1/public/*). Token dikirim sebagai
// query param, bukan bearer.
export async function publicGet<T>(
	path: string,
	params?: Record<string, unknown>,
): Promise<T> {
	const res = await customInstance<{ data: Envelope<T> }>(
		`/v1/public${path}`,
		params ? { params } : undefined,
	);
	return res.data.data;
}

// Varian sdmGet untuk endpoint paginated ({ message, data, meta }).
export async function sdmGetPaged<T>(
	path: string,
	params?: Record<string, unknown>,
): Promise<{ data: T; meta: SdmPageMeta }> {
	const res = await customInstance<{ data: PagedEnvelope<T> }>(
		`${BASE}${path}`,
		params ? { params } : undefined,
	);
	return { data: res.data.data, meta: res.data.meta };
}
