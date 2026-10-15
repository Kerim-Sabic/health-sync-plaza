/* Kinra service worker: an offline app shell and calm background notifications.
 * Data always comes from the network; only static files and the last app shell are cached. */
const VERSION = "kinra-v1";
const SHELL = [
  "/app",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.pathname.startsWith("/app")) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put("/app", copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/app"))),
    );
    return;
  }

  // Hashed build assets and icons: cache first.
  if (url.pathname.startsWith("/assets/") || /\.(png|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.includes("/app"));
      if (open) return open.focus();
      return self.clients.openWindow("/app");
    }),
  );
});
