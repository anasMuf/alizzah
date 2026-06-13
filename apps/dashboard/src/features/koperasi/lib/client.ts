import { customInstance } from "@alizzah/api-client/mutator/custom-instance";

// Data layer koperasi (manual). Koperasi dilayani binary backend terpisah
// (koperasi-api); customInstance otomatis mengarahkan path "/koperasi/*" ke sana
// (lihat VITE_KOPERASI_API_URL). Response API berbentuk { message, data } dan
// customInstance membungkusnya menjadi { data: body } → helper di sini meng-unwrap
// langsung ke payload `data`.
//
// Catatan: koperasi memakai hooks tulisan-tangan (bukan Orval) karena client Orval
// yang ter-commit untuk modul sekolah masih stale; regen penuh akan dilakukan terpisah.

type Envelope<T> = { message: string; data: T };

const BASE = "/v1/koperasi";

export async function kopGet<T>(
	path: string,
	params?: Record<string, unknown>,
): Promise<T> {
	const res = await customInstance<{ data: Envelope<T> }>(
		`${BASE}${path}`,
		params ? { params } : undefined,
	);
	return res.data.data;
}

export async function kopSend<T>(
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
