// Enkel service worker: nettverk først, og sist lagrede kopi når nettet er borte.
const CACHE = "vaerring-v1";
const FILER = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => Promise.all(FILER.map(f => c.add(f).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys()
            .then(nokler => Promise.all(nokler.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", e => {
    const req = e.request;
    if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

    e.respondWith(
        fetch(req, { cache: "no-cache" })
            .then(res => {
                if (res.ok) {
                    const kopi = res.clone();
                    caches.open(CACHE).then(c => c.put(req, kopi));
                }
                return res;
            })
            .catch(async () => {
                const lagret = await caches.match(req, { ignoreSearch: true });
                if (!lagret) return Response.error();
                // Merk svaret, så appen kan fortelle at tallene er lagret og ikke nye
                const headere = new Headers(lagret.headers);
                headere.set("X-Fra-Cache", "1");
                return new Response(await lagret.blob(), {
                    status: lagret.status, statusText: lagret.statusText, headers: headere
                });
            })
    );
});
