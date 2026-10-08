import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
    swSrc: "src/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
    // Offline fallback pages used by src/sw.ts; precached so they work with no network.
    additionalPrecacheEntries: ["/fr/~offline", "/en/~offline"].map((url) => ({ url, revision: crypto.randomUUID() })),
});

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

// E2E only (see playwright.config.ts): swap Vercel KV for the in-memory fake so the real app can
// run end to end with no database. Refused on Vercel, so it can never reach a deployment.
const useFakeKv = process.env.E2E_FAKE_KV === "1";
if (useFakeKv && process.env.VERCEL) throw new Error("E2E_FAKE_KV must not be set on Vercel");

const nextConfig: NextConfig = {
    ...(useFakeKv ? { turbopack: { resolveAlias: { "@vercel/kv": "./src/test/e2eKv.ts" } } } : {}),
    transpilePackages: ['next-intl'],
    experimental: {
        globalNotFound: true,
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
            { protocol: 'http', hostname: '**' },
        ],
    },
};

export default withSerwist(withNextIntl(nextConfig));
