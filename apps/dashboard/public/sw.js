// Service worker aplikasi manajemen internal Al-Izzah.
//
// Tujuan: menjadikan dashboard "installable" (PWA) dan tetap bisa dibuka saat
// jaringan putus. Karena ini aplikasi CRUD internal (data selalu dari API,
// origin berbeda), offline hanya menjamin *shell* aplikasi tampil — bukan data.
//
// Strategi:
// - Navigasi dokumen : network-first, fallback ke shell yang di-cache.
// - Aset statis      : cache-first + perbarui cache di latar (nama ber-hash).
// - API / lintas-origin / non-GET : dilewati (selalu lewat jaringan).

const CACHE = "alizzah-shell-v1";
const SHELL = ["/", "/index.html"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			// add satu per satu + catch agar satu kegagalan tidak membatalkan install.
			.then((cache) =>
				Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined))),
			)
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const req = event.request;
	if (req.method !== "GET") return;

	const url = new URL(req.url);
	// Hanya tangani same-origin. API berada di origin lain (atau via prefix
	// /api/ saat di-proxy), jadi dibiarkan lewat jaringan.
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith("/api/")) return;

	// Dokumen: network-first agar UI tidak pernah basi bila online.
	if (req.mode === "navigate") {
		event.respondWith(
			fetch(req)
				.then((res) => {
					const copy = res.clone();
					caches.open(CACHE).then((c) => c.put("/index.html", copy));
					return res;
				})
				.catch(async () => {
					const cache = await caches.open(CACHE);
					return (
						(await cache.match(req)) ||
						(await cache.match("/index.html")) ||
						(await cache.match("/")) ||
						Response.error()
					);
				}),
		);
		return;
	}

	// Hanya cache aset statis.
	if (!["script", "style", "image", "font"].includes(req.destination)) return;

	event.respondWith(
		caches.open(CACHE).then(async (cache) => {
			const cached = await cache.match(req);
			const network = fetch(req)
				.then((res) => {
					if (res && res.status === 200 && res.type === "basic") {
						cache.put(req, res.clone());
					}
					return res;
				})
				.catch(() => cached);
			// stale-while-revalidate: sajikan cache dulu, perbarui di latar.
			return cached || network;
		}),
	);
});
