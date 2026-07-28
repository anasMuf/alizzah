const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
// Koperasi dilayani binary backend terpisah (koperasi-api). Request dengan path
// /koperasi/* diarahkan ke base ini. Di produksi, set VITE_KOPERASI_API_URL = VITE_API_URL
// bila nginx host yang memisah berdasarkan path (satu domain API).
const KOPERASI_API_URL =
	import.meta.env.VITE_KOPERASI_API_URL || "http://localhost:8081/api";

// Token getter di-inject oleh layer auth (mis. #/features/auth/AuthContext) via setTokenGetter,
// sehingga api-client tidak bergantung pada implementasi auth (memutus siklus).
let tokenGetter: () => string | null = () => null;

/** Daftarkan sumber token. Dipanggil sekali oleh layer auth saat bootstrap. */
export function setTokenGetter(getter: () => string | null) {
	tokenGetter = getter;
}

export class ApiError extends Error {
	status: number;
	code: string;
	details?: unknown;

	constructor({
		status,
		message,
		code,
		details,
	}: { status: number; message: string; code?: string; details?: unknown }) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code || "UNKNOWN_ERROR";
		this.details = details;
	}
}

export const customInstance = async <T>(
	urlStr: string,
	options?: RequestInit & { params?: Record<string, unknown> },
): Promise<T> => {
	const base = urlStr.includes("/koperasi/") ? KOPERASI_API_URL : API_URL;
	const url = new URL(`${base}${urlStr}`);

	if (options?.params) {
		Object.entries(options.params).forEach(([key, value]) => {
			if (value !== undefined) {
				url.searchParams.append(key, String(value));
			}
		});
	}

	const token = tokenGetter();

	// Don't force Content-Type for FormData — browser auto-sets multipart boundary
	const isFormData = options?.body instanceof FormData;

	const response = await fetch(url.toString(), {
		...options,
		headers: {
			...(isFormData ? {} : { "Content-Type": "application/json" }),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options?.headers,
		},
	});

	const data = await response.json().catch(() => null);

	if (!response.ok) {
		throw new ApiError({
			status: response.status,
			message: data?.message || `Request failed with status ${response.status}`,
			code: data?.code,
			details: data?.details,
		});
	}

	return {
		data,
		status: response.status,
		headers: response.headers,
	} as unknown as T;
};
