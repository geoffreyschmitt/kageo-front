import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// Pages, RSC payloads and API responses are per-user (and role-shaped: pots are hidden
// from the wishlist owner). They must never come from a cache, or the next person on a
// shared device could be served the previous user's data. Serwist's defaultCache stores
// all of them network-first for 24h, so these rules sit in front of it and win.
const isUserData = ({ request, url, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
    sameOrigin &&
    (url.pathname.startsWith("/api/") ||
        request.mode === "navigate" ||
        request.headers.get("RSC") === "1" ||
        request.headers.get("Content-Type")?.includes("text/html") === true);

const neverCache: RuntimeCaching = { matcher: isUserData, handler: new NetworkOnly() };

// Caches that earlier service-worker versions filled with user data. Installed clients
// still hold them, so drop them as soon as this version activates.
const LEGACY_USER_DATA_CACHES = ["apis", "pages", "pages-rsc", "pages-rsc-prefetch"];

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.filter((name) => LEGACY_USER_DATA_CACHES.includes(name)).map((name) => caches.delete(name))),
        ),
    );
});

const offlineUrl = (pathname: string) => (pathname.startsWith("/en") ? "/en/~offline" : "/fr/~offline");

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [neverCache, ...defaultCache],
    fallbacks: {
        entries: [
            {
                url: "/en/~offline",
                matcher: ({ request, url }) => request.destination === "document" && offlineUrl(url.pathname) === "/en/~offline",
            },
            {
                url: "/fr/~offline",
                matcher: ({ request, url }) => request.destination === "document" && offlineUrl(url.pathname) === "/fr/~offline",
            },
        ],
    },
});

serwist.addEventListeners();
