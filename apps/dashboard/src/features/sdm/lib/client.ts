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
