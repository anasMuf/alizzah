/**
 * Serializer search params untuk TanStack Router.
 *
 * Default router v1 meng-encode nilai search per-kunci dengan JSON, sehingga
 * string muncul ber-tanda kutip di URL (mis. `?month_from="9"`) — tidak standar.
 * Serializer ini menulis nilai string polos apa adanya (tanpa kutip); objek/array
 * tetap JSON. Parser selalu mengembalikan nilai polos sebagai string agar
 * `typeof === "string"` di `validateSearch` tetap berlaku, dan masih menerima
 * nilai lama ber-format JSON (backward compatible dengan URL ter-bookmark).
 */

export function stringifySearch(search: Record<string, unknown>): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(search)) {
		if (value === undefined || value === null) continue;
		if (typeof value === "string") {
			params.set(key, value);
		} else {
			params.set(key, JSON.stringify(value));
		}
	}
	return params.toString() ? `?${params.toString()}` : "";
}

export function parseSearch(searchStr: string): Record<string, unknown> {
	const query: Record<string, unknown> = {};
	const raw = searchStr.startsWith("?") ? searchStr.slice(1) : searchStr;
	for (const [key, value] of new URLSearchParams(raw).entries()) {
		const trimmed = value.trim();
		if (
			trimmed.startsWith('"') ||
			trimmed.startsWith("[") ||
			trimmed.startsWith("{")
		) {
			try {
				query[key] = JSON.parse(value);
				continue;
			} catch {
				// bukan JSON valid → fallback ke string polos
			}
		}
		query[key] = value;
	}
	return query;
}
