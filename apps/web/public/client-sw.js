const SHELL_CACHE = "taskbandit-client-shell-v3";
const RUNTIME_CACHE = "taskbandit-client-runtime-v3";
const CLIENT_NOTIFICATIONS_URL = "./#notifications";
const APP_SHELL = [
  "./",
  "./client.html",
  "./favicon.svg",
  "./taskbandit-raccoon.svg",
  "./pwa/icon-192.png",
  "./pwa/icon-512.png"
];
const NETWORK_FIRST_SUFFIXES = ["/client.html", "/taskbandit-client.webmanifest", "/taskbandit-runtime-config.js"];
const NON_CACHEABLE_SUFFIXES = ["/taskbandit-runtime-config.js"];

function matchesSuffix(pathname, suffixes) {
  return suffixes.some((suffix) => pathname.endsWith(suffix));
}

function isApiRequest(pathname) {
  return /\/api(?:\/|$)/.test(pathname);
}

async function respondWithNetworkFirst(request, { cacheResponse = true, fallbackResponse } = {}) {
  const cachedResponse = cacheResponse ? await caches.match(request) : null;

  try {
    const networkResponse = await fetch(request);
    if (cacheResponse && networkResponse.ok) {
      const clonedResponse = networkResponse.clone();
      void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clonedResponse));
    }

    return networkResponse;
  } catch {
    if (cachedResponse) {
      return cachedResponse;
    }

    if (fallbackResponse) {
      return fallbackResponse();
    }

    throw new Error("Network unavailable");
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isApiRequest(url.pathname)) {
    return;
  }

  const isStartupCriticalRequest = matchesSuffix(url.pathname, NETWORK_FIRST_SUFFIXES);
  const isNonCacheableRequest = matchesSuffix(url.pathname, NON_CACHEABLE_SUFFIXES);

  if (request.mode === "navigate" || isStartupCriticalRequest) {
    event.respondWith(
      respondWithNetworkFirst(request, {
        cacheResponse: !isNonCacheableRequest,
        fallbackResponse:
          request.mode === "navigate"
            ? async () =>
                (await caches.match("./client.html")) ||
                new Response("Offline", {
                  status: 503,
                  headers: { "Content-Type": "text/plain; charset=utf-8" }
                })
            : undefined
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

self.addEventListener("push", (event) => {
  const payload = (() => {
    try {
      return event.data?.json() ?? {};
    } catch {
      return {};
    }
  })();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const visibleClient = clients.find((client) => client.visibilityState === "visible");
      if (visibleClient) {
        for (const client of clients) {
          client.postMessage({
            type: "taskbandit-push",
            payload
          });
        }
        return;
      }

      const title = payload.title || "TaskBandit";
      const options = {
        body: payload.message || "",
        tag: payload.notificationId ? `taskbandit:${payload.notificationId}` : "taskbandit-notification",
        data: {
          path: payload.path || CLIENT_NOTIFICATIONS_URL
        }
      };

      await self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const targetPath = event.notification?.data?.path || CLIENT_NOTIFICATIONS_URL;
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const existingClient = clients.find((client) => {
        try {
          const clientUrl = new URL(client.url);
          return clientUrl.pathname.endsWith("/client.html") || clientUrl.hash === "#notifications";
        } catch {
          return false;
        }
      });

      if (existingClient) {
        await existingClient.focus();
        existingClient.postMessage({
          type: "taskbandit-notification-click",
          payload: {
            path: targetPath
          }
        });
        return;
      }

      await self.clients.openWindow(targetPath);
    })
  );
});
